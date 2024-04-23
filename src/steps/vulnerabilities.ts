import {
  createDirectRelationship,
  createIntegrationEntity,
  Entity,
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
import pMap from 'p-map';

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
  const apiClient = createAPIClient(instance.config, logger);

  const assetVulnCountMap =
    await jobState.getData<
      Map<string, { critical: number; severe: number; moderate: number }>
    >(ASSET_VULN_COUNT_MAP);

  const severityFilter = instance.config.vulnerabilitySeverities?.split(',');
  const stateFilter = instance.config.vulnerabilityStates?.split(',');

  const vulnAssetsMap = new Map<
    string,
    { status: VulnerabilityState; assetId: string }[]
  >();

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
        (assetVulnerabilities) => {
          const filteredVulnerabilities = stateFilter
            ? assetVulnerabilities.filter((vulnerability) =>
                stateFilter.includes(vulnerability.status),
              )
            : assetVulnerabilities;

          for (const assetVulnerability of filteredVulnerabilities) {
            if (!vulnAssetsMap.has(assetVulnerability.id)) {
              vulnAssetsMap.set(assetVulnerability.id, []);
            }
            vulnAssetsMap.get(assetVulnerability.id)?.push({
              status: assetVulnerability.status,
              assetId: assetEntity.id! as string,
            });
          }
        },
      );
    },
  );

  await pMap(
    Array.from(vulnAssetsMap.keys()),
    async (vulnId) => {
      const vulnerability = await apiClient.getVulnerability(vulnId);
      const vulnAssets = vulnAssetsMap.get(vulnId);
      if (!vulnAssets) {
        // Should never happen.
        return;
      }
      // If this vulnerability does not pass the severity filter, skip it.
      if (severityFilter && !severityFilter.includes(vulnerability.severity)) {
        return;
      }

      const vulnerabilityEntity = createVulnerabilityEntity(vulnerability);
      if (!jobState.hasKey(vulnerabilityEntity._key)) {
        await jobState.addEntity(vulnerabilityEntity);
      }

      for (const { status, assetId } of vulnAssets) {
        const findingEntity = createAssetVulnerabilityEntity(
          { id: vulnId, status },
          vulnerabilityEntity,
          assetId,
        );
        if (jobState.hasKey(findingEntity._key)) {
          return;
        }
        await jobState.addEntity(findingEntity);
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
      }
    },
    { concurrency: 5 },
  );
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
