import {
  createDirectRelationship,
  createIntegrationEntity,
  Entity,
  IntegrationError,
  IntegrationInfoEventName,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import {
  ASSET_VULN_COUNT_MAP,
  entities,
  relationships,
  steps,
} from '../constants';
import {
  InsightVmAssetVulnerability,
  Vulnerability,
  VulnerabilityState,
} from '../types';
import { getAssetKey } from './assets';
import { open } from 'lmdb';
import { getMemoryUsage } from '../utils';

function getAssetVulnerabilityKey(
  assetId: string,
  assetVulnerabilityId: string,
) {
  return `insightvm_asset_vulnerability:${assetId}:${assetVulnerabilityId}`;
}

function createAssetVulnerabilityEntity(
  finding: Pick<InsightVmAssetVulnerability, 'id' | 'status'>,
  vulnerability: Entity,
  assetId: string,
) {
  return createIntegrationEntity({
    entityData: {
      source: finding,
      assign: {
        _key: getAssetVulnerabilityKey(assetId, finding.id),
        _type: entities.FINDING._type,
        _class: entities.FINDING._class,
        id: `${finding.id}`,
        name: finding.id,
        category: 'host',
        open:
          finding.status === VulnerabilityState.VULNERABLE ? true : undefined,
        severity: vulnerability.severity,
        numericSeverity: vulnerability.numericSeverity,
      },
    },
  });
}

export function getVulnerabilityKey(id: string): string {
  return `insightvm_vulnerability:${id}`;
}

function createVulnerabilityEntity(vulnerability: Vulnerability) {
  return createIntegrationEntity({
    entityData: {
      source: vulnerability,
      assign: {
        _key: getVulnerabilityKey(vulnerability.id),
        _type: entities.VULNERABILITY._type,
        _class: entities.VULNERABILITY._class,
        id: vulnerability.id,
        name: vulnerability.id,
        severity: vulnerability.severity,
        numericSeverity: vulnerability.severityScore,
        category: vulnerability.categories?.toString() || '',
        description: vulnerability.description?.text,
        exploits: vulnerability.exploits,
        // Response doesn't contain these attributes
        // but are needed for data model:
        blocking: false,
        open: false,
        production: false,
        public: true,
      },
    },
  });
}

export async function fetchAssetVulnerabilityFindings(
  context: IntegrationStepExecutionContext<IntegrationConfig>,
) {
  const { logger, instance, jobState } = context;
  if (process.env.USE_ON_DISK_DKT) {
    logger.publishInfoEvent({
      name: IntegrationInfoEventName.Info,
      description: 'Using on-disk DKT',
    });
  }
  const apiClient = createAPIClient(instance.config, logger);

  const assetVulnCountMap =
    await jobState.getData<
      Map<string, { critical: number; severe: number; moderate: number }>
    >(ASSET_VULN_COUNT_MAP);

  if (!assetVulnCountMap) {
    throw new IntegrationError({
      code: 'MISSING_ASSET_VULN_COUNT_MAP',
      message: 'Missing asset vulnerability count map',
    });
  }

  const severityFilter = instance.config.vulnerabilitySeverities?.split(',');
  const stateFilter = instance.config.vulnerabilityStates?.split(',');

  const debugCounts = {
    findings: 0,
    vulnerabilities: 0,
    finding_is_vulnerability: 0,
    asset_has_finding: 0,
  };

  const vulnAssetsMap = open<string>('vuln-assets-map', {
    dupSort: true,
    encoding: 'ordered-binary',
  });

  await jobState.iterateEntities(
    { _type: entities.ASSET._type },
    async (assetEntity) => {
      logger.debug(
        {
          assetId: assetEntity.id,
        },
        'Getting vulnerability findings for asset.',
      );
      const vulnCounts = assetVulnCountMap?.get(assetEntity.id as string);
      if (
        vulnCounts &&
        severityFilter &&
        severityFilter.every(
          (severity) => vulnCounts[severity.toLowerCase()] === 0,
        )
      ) {
        // Skip if the asset has no vulnerabilities of the specified severities.
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

          await Promise.all(
            filteredVulnerabilities.map(async (assetVulnerability) =>
              vulnAssetsMap.put(
                assetVulnerability.id,
                `${assetEntity.id! as string}|${assetVulnerability.status}`,
              ),
            ),
          );
        },
      );
    },
  );

  let uniqueVulnCount = 0;
  vulnAssetsMap.getKeys().forEach(() => {
    uniqueVulnCount++;
  });

  let stopAtSeverity: string | undefined;
  if (severityFilter?.includes('Severe')) {
    stopAtSeverity = 'Moderate';
  } else if (severityFilter?.includes('Critical')) {
    stopAtSeverity = 'Severe';
  }

  let processedVulns = 0;
  try {
    await apiClient.iterateVulnerabilities(async (vulnerability) => {
      if (
        processedVulns >= uniqueVulnCount ||
        (stopAtSeverity && vulnerability.severity === stopAtSeverity)
      ) {
        // We sort the vulns by severityScore in descending order
        // so we use that to stop iterating sooner.
        // For example, if we're only interested in Critical and Severe we stop when we reach Moderate.
        throw new IntegrationError({
          code: 'FINISHED_PROCESSING_VULNS',
          message: 'Finished processing vulnerabilities.',
        });
      }

      if (!vulnAssetsMap.doesExist(vulnerability.id)) {
        return;
      }

      const vulnerabilityEntity = createVulnerabilityEntity(vulnerability);
      if (!jobState.hasKey(vulnerabilityEntity._key)) {
        await jobState.addEntity(vulnerabilityEntity);
        debugCounts.vulnerabilities++;
      }

      for (const value of vulnAssetsMap.getValues(vulnerability.id)) {
        const [assetId, status] = value.split('|');
        const findingEntity = createAssetVulnerabilityEntity(
          { id: vulnerability.id, status: status as VulnerabilityState },
          vulnerabilityEntity,
          assetId,
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
      }
      processedVulns++;
      if (processedVulns % 500 === 0) {
        logger.info(
          {
            memoryUsage: getMemoryUsage(),
            debugCounts: debugCounts,
            processedVulns,
          },
          'Memory usage',
        );
      }
    });
  } catch (err) {
    if (err.code === 'FINISHED_PROCESSING_VULNS') {
      logger.info('Finished processing vulnerabilities.');
    } else {
      throw err;
    }
  }
}

export const vulnerabilitiesSteps: IntegrationStep<IntegrationConfig>[] = [
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
