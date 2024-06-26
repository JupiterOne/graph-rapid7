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
import { InsightVMAsset, Vulnerability } from '../types';
import { getAssetKey } from './assets';
import { open } from 'lmdb';
import { getDiskUsage, getMemoryUsage } from '../utils';

const vulnerabilitiesCache = open<string>('vulnerabilities', {
  encoding: 'string',
});

function vulnerabilityProcessor() {
  let buffer: Entity[] = [];
  return async (vuln: Vulnerability | undefined, forceFlush: boolean) => {
    if (vuln) {
      buffer.push(createVulnerabilityEntity(vuln));
    }

    if (buffer.length > 1_000 || forceFlush) {
      await Promise.all(
        buffer.map((e) => vulnerabilitiesCache.put(e._key, JSON.stringify(e))),
      );
      buffer = [];
    }
  };
}

export async function prefetchVulnerabilities(
  context: IntegrationStepExecutionContext<IntegrationConfig>,
) {
  const { logger, instance } = context;
  const apiClient = createAPIClient(instance.config, logger);
  let minimumIncludedSeverity: 'Critical' | 'Moderate' | 'Severe' = 'Critical';
  if (instance.config.vulnerabilitySeverities?.includes('Moderate')) {
    minimumIncludedSeverity = 'Moderate';
  } else if (instance.config.vulnerabilitySeverities?.includes('Severe')) {
    minimumIncludedSeverity = 'Severe';
  }

  let vulnsPreprocessed = 0;
  const processor = vulnerabilityProcessor();
  await apiClient.iterateVulnerabilities(
    async (vuln) => {
      await processor(vuln, false);
      vulnsPreprocessed++;
      if (vulnsPreprocessed % 2_000 === 0) {
        logger.info({ vulnsPreprocessed }, 'preprocessed vulnerabilities');
      }
    },
    {
      minimumIncludedSeverity,
    },
  );
  await processor(undefined, true);
  await vulnerabilitiesCache.flushed;
}

function createShouldProcessAssetFunction(vulnerabilitySeverities?: string) {
  const severityFilter = vulnerabilitySeverities?.split(',');
  // severity mask - 0 = all vulnerabilities
  // severity mask - 1 = critical, severe
  // severity mask - 2 = critical
  let severityMask = 0;
  if (severityFilter?.includes('Moderate')) {
    severityMask = 0;
  } else if (severityFilter?.includes('Severe')) {
    severityMask = 1;
  } else if (severityFilter?.includes('Critical')) {
    severityMask = 2;
  }

  return (asset: InsightVMAsset) => {
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
}

export async function fetchAssetVulnerabilityFindings(
  context: IntegrationStepExecutionContext<IntegrationConfig>,
) {
  const { logger, instance, jobState } = context;
  const apiClient = createAPIClient(instance.config, logger);
  const shouldProcessAsset = createShouldProcessAssetFunction(
    instance.config.vulnerabilitySeverities,
  );

  const debugCounts = {
    processedAssets: 0,
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
      debugCounts.processedAssets++;
      if (debugCounts.processedAssets % 1000 === 0) {
        logger.info(
          {
            diskUsage: await getDiskUsage(),
            memoryUsage: getMemoryUsage(),
            debugCounts: debugCounts,
            processedVulnerabilities,
          },
          'Memory usage',
        );
      }

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

            let vulnerabilityEntity: Entity | undefined;
            if (cachedVuln) {
              vulnerabilityEntity = JSON.parse(cachedVuln) as Entity;
            } else {
              // Vulnerability not found in cache, it doesn't exists or we filtered it out by severity.
              continue;
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
            const findingVulnerabilityRelationship = createDirectRelationship({
              _class: RelationshipClass.IS,
              fromType: entities.FINDING._type,
              fromKey: findingEntity._key,
              toType: entities.VULNERABILITY._type,
              toKey: vulnerabilityEntity._key,
            });
            await jobState.addRelationships([
              assetFindingRelationship,
              findingVulnerabilityRelationship,
            ]);
            debugCounts.asset_has_finding++;
            debugCounts.finding_is_vulnerability++;

            processedVulnerabilities++;
          }
        },
      );
    },
  );
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
    dependsOn: [steps.PREFETCH_VULNS, steps.FETCH_ASSETS],
    executionHandler: fetchAssetVulnerabilityFindings,
  },
];

export const testFunctions = {
  createVulnerabilityEntity,
};
