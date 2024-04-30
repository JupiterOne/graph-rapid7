import {
  createDirectRelationship,
  createIntegrationEntity,
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
  vulnerability: { severity: string; numericSeverity: number },
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

  const seenVulns = new Map<
    string,
    { severity: string; numericSeverity: number }
  >();

  const processFinding = async ({
    vulnId,
    assetId,
    status,
  }: {
    vulnId: string;
    assetId: string;
    status: VulnerabilityState;
  }) => {
    if (!seenVulns.has(vulnId)) {
      const vulnerability = await apiClient.getVulnerability(vulnId);

      // If this vulnerability does not pass the severity filter, skip it.
      if (severityFilter && !severityFilter.includes(vulnerability.severity)) {
        return;
      }

      const vulnerabilityEntity = createVulnerabilityEntity(vulnerability);
      await jobState.addEntity(vulnerabilityEntity);
      seenVulns.set(vulnId, {
        severity: vulnerability.severity,
        numericSeverity: vulnerability.severityScore,
      });
    }

    const vulnerabilityKey = getVulnerabilityKey(vulnId);
    if (!jobState.hasKey(vulnerabilityKey)) {
      // If the vulnerability entity was not added, skip this finding.
      // This can happen if the vulnerability does not pass the severity filter.
      return;
    }

    const vulnData = seenVulns.get(vulnId)!;
    const findingEntity = createAssetVulnerabilityEntity(
      { id: vulnId, status },
      {
        severity: vulnData.severity,
        numericSeverity: vulnData.numericSeverity,
      },
      assetId,
    );
    if (jobState.hasKey(findingEntity._key)) {
      return;
    }
    await jobState.addEntity(findingEntity);
    const assetFindingRelationship = createDirectRelationship({
      _class: RelationshipClass.HAS,
      fromType: entities.ASSET._type,
      fromKey: getAssetKey(assetId),
      toType: entities.FINDING._type,
      toKey: findingEntity._key,
    });
    const findingVulnerabilityRelationship = createDirectRelationship({
      _class: RelationshipClass.IS,
      fromType: entities.FINDING._type,
      fromKey: findingEntity._key,
      toType: entities.VULNERABILITY._type,
      toKey: vulnerabilityKey,
    });
    await jobState.addRelationships([
      assetFindingRelationship,
      findingVulnerabilityRelationship,
    ]);
  };

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

          await pMap(
            filteredVulnerabilities,
            async (assetVulnerability) => {
              await processFinding({
                vulnId: assetVulnerability.id,
                assetId: assetEntity.id! as string,
                status: assetVulnerability.status,
              });
            },
            { concurrency: 5 },
          );
        },
      );
    },
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
