import {
  createDirectRelationship,
  getRawData,
  IntegrationMissingKeyError,
  IntegrationStep,
  IntegrationStepExecutionContext,
  Entity,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';
import {
  createVulnerabilityEntity,
  createAssetVulnerabilityEntity,
  getVulnerabilityKey,
} from './vulnerability-converters';

import { createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import { entities, relationships, steps } from '../constants';
import { InsightVMAsset } from '../types';
import { getAssetKey } from './assets';
import { open } from 'lmdb';
import { getMemoryUsage } from '../utils';

const vulnerabilitiesCache = open<string>('vuln-assets-map', {
  dupSort: true,
  encoding: 'ordered-binary',
});

let vulnsStepFinished = false;

export async function prefetchVulnerabilities(
  context: IntegrationStepExecutionContext<IntegrationConfig>,
) {
  const { logger, instance } = context;
  const apiClient = createAPIClient(instance.config, logger);
  let minimumIncludedSeverity: 'Critical' | 'Moderate' | 'Severe' = 'Critical';
  if (instance.config.vulnerabilityStates?.includes('Moderate')) {
    minimumIncludedSeverity = 'Moderate';
  } else if (instance.config.vulnerabilityStates?.includes('Severe')) {
    minimumIncludedSeverity = 'Severe';
  }

  let buffer: Entity[] = [];
  await apiClient.iterateVulnerabilities(
    async (vuln) => {
      if (vulnsStepFinished) {
        // this lets the client know to short circuit since
        // the vulns step has finished and we don't need to do any more
        // work
        return false;

      }
      buffer.push(createVulnerabilityEntity(vuln));
      if (buffer.length === 1_000) {
        await Promise.all(
          buffer.map((e) =>
            vulnerabilitiesCache.put(e._key, JSON.stringify(e)),
          ),
        );
        buffer = [];
      }
      return true;
    },
    {
      minimumIncludedSeverity,
    },
  );
  await Promise.all(
    buffer.map((e) => vulnerabilitiesCache.put(e._key, JSON.stringify(e))),
  );
  await vulnerabilitiesCache.flushed;
}

export async function fetchAssetVulnerabilityFindings(
  context: IntegrationStepExecutionContext<IntegrationConfig>,
) {
  try {
    const { logger, instance, jobState } = context;
    const apiClient = createAPIClient(instance.config, logger);

    const severityFilter = instance.config.vulnerabilitySeverities?.split(',');
    let severityMask = 0;
    if (severityFilter?.includes('Moderate')) {
      severityMask = 0;
    } else if (severityFilter?.includes('Severe')) {
      severityMask = 1;
    } else if (severityFilter?.includes('Critical')) {
      severityMask = 2;
    }

    const shouldProcessAsset = (asset: InsightVMAsset) => {
      if (severityMask === 0 && asset.vulnerabilities.total) {
        return true;
      } else if (
        severityMask === 1 &&
        (asset.vulnerabilities.critical || asset.vulnerabilities.severe)
      ) {
        return true;
      } else if (severityMask === 2 && asset.vulnerabilities.critical) {
        return true;
      }
      return false;
    };

    const debugCounts = {
      findings: 0,
      vulnerabilities: 0,
      finding_is_vulnerability: 0,
      asset_has_finding: 0,
      vulnRequests: 0,
    };

    const stateFilter = instance.config.vulnerabilityStates?.split(',');

    let processedVulnerabilities = 0;
    await jobState.iterateEntities(
      { _type: entities.ASSET._type },
      async (assetEntity) => {
        const rawData = getRawData<InsightVMAsset>(assetEntity);
        if (!rawData) {
          throw new IntegrationMissingKeyError(
            `Raw Data for ${assetEntity._key} is missing.`,
          );
        }
        if (!shouldProcessAsset(rawData)) {
          return;
        }
        await apiClient.iterateAssetVulnerabilityFinding(
          assetEntity.id! as string,
          async (assetVulnerabilities) => {
            const filteredVulnerabilities = stateFilter
              ? assetVulnerabilities.filter((vulnerability) =>
                  stateFilter.includes(vulnerability.status),
                )
              : assetVulnerabilities;

            for (const av of filteredVulnerabilities) {
              const assetId = assetEntity.id as string;
              const cachedVuln = vulnerabilitiesCache.get(
                getVulnerabilityKey(av.id),
              );

              let vulnerabilityEntity: Entity;
              // get the vulnerability from the cache or api
              if (cachedVuln) {
                vulnerabilityEntity = JSON.parse(cachedVuln) as Entity;
              } else {
                const vulnerability = await apiClient.getVulnerability(av.id);
                vulnerabilityEntity = createVulnerabilityEntity(vulnerability);
                await vulnerabilitiesCache.put(
                  av.id,
                  JSON.stringify(vulnerabilityEntity),
                );
              }

              if (!jobState.hasKey(vulnerabilityEntity._key)) {
                await jobState.addEntity(vulnerabilityEntity);
                debugCounts.vulnerabilities++;
              }

              const findingEntity = createAssetVulnerabilityEntity(
                { id: vulnerabilityEntity.id as string, status: av.status },
                vulnerabilityEntity,
                assetEntity.id! as string,
              );
              if (jobState.hasKey(findingEntity._key)) {
                continue;
              }

              await jobState.addEntity(findingEntity);
              debugCounts.findings++;

              const assetFindingRelationship = createDirectRelationship({
                _class: RelationshipClass.HAS,
                fromType: entities.ASSET._type,
                fromKey: getAssetKey(Number(assetId)),
                toType: entities.FINDING._type,
                toKey: findingEntity._key,
              });
              const findingVulnerabilityRelationship = createDirectRelationship(
                {
                  _class: RelationshipClass.IS,
                  fromType: entities.FINDING._type,
                  fromKey: findingEntity._key,
                  toType: entities.VULNERABILITY._type,
                  toKey: vulnerabilityEntity._key,
                },
              );
              await jobState.addRelationships([
                assetFindingRelationship,
                findingVulnerabilityRelationship,
              ]);
              debugCounts.asset_has_finding++;
              debugCounts.finding_is_vulnerability++;

              processedVulnerabilities++;
              if (processedVulnerabilities % 10_000 === 0) {
                logger.info(
                  {
                    memoryUsage: getMemoryUsage(),
                    debugCounts: debugCounts,
                    processedVulnerabilities,
                  },
                  'Memory usage',
                );
              }
            }
          },
        );
      },
    );
  } finally {
    vulnsStepFinished = true;
  }
}

export const vulnerabilitiesSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: steps.PREFETCH_VULNS,
    name: 'Prefetch Vulnerabilities',
    entities: [],
    relationships: [],
    dependsOn: [],
    executionHandler: prefetchVulnerabilities,
  },
  {
    id: steps.FETCH_ASSET_VULNERABILITIES,
    name: 'Fetch Asset Vulnerabilities',
    entities: [entities.FINDING, entities.VULNERABILITY],
    relationships: [
      relationships.ASSET_HAS_FINDING,
      relationships.FINDING_IS_VULNERABILITY,
    ],
    dependsOn: [steps.FETCH_ASSETS],
    executionHandler: fetchAssetVulnerabilityFindings,
  },
];

export const testFunctions = {
  createVulnerabilityEntity,
};
