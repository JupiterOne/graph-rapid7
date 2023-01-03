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
import { entities, relationships, steps } from '../constants';
import {
  InsightVmAssetVulnerability,
  Vulnerability,
  VulnerabilityInfo,
} from '../types';

function getAssetVulnerabilityKey(
  assetId: string,
  assetVulnerabilityId: string,
) {
  return `insightvm_asset_vulnerability:${assetId}:${assetVulnerabilityId}`;
}

function createAssetVulnerabilityEntity(
  assetVulnerability: InsightVmAssetVulnerability,
  vulnerability: Entity,
  assetId: string,
  info: VulnerabilityInfo,
) {
  return createIntegrationEntity({
    entityData: {
      source: assetVulnerability,
      assign: {
        _key: getAssetVulnerabilityKey(assetId, assetVulnerability.id),
        _type: entities.FINDING._type,
        _class: entities.FINDING._class,
        id: `${assetVulnerability.id}`,
        name: vulnerability.name,
        category: 'host',
        open: assetVulnerability.status === 'vulnerable' ? true : undefined,
        severity: vulnerability.severity,
        numericSeverity: vulnerability.numericSeverity,
        ...info,
      },
    },
  });
}

export function getVulnerabilityKey(id: string): string {
  return `insightvm_vulnerability:${id}`;
}

export async function fetchVulnerability(
  context: IntegrationStepExecutionContext<IntegrationConfig>,
  vulnerabilityId: string,
): Promise<Entity> {
  const { logger, instance, jobState } = context;
  const existingVulnerability = await jobState.findEntity(
    getVulnerabilityKey(vulnerabilityId),
  );

  if (existingVulnerability) {
    logger.debug(
      {
        id: vulnerabilityId,
      },
      'Found existing vulnerability entity in jobState.',
    );
    return existingVulnerability;
  }
  logger.debug(
    {
      id: vulnerabilityId,
    },
    'Fetching and creating new vulnerability entity in jobState.',
  );
  const apiClient = createAPIClient(instance.config, logger);

  return jobState.addEntity(
    createVulnerabilityEntity(
      await apiClient.getVulnerability(vulnerabilityId),
    ),
  );
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
        name: vulnerability.title,
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

  await jobState.iterateEntities(
    { _type: entities.ASSET._type },
    async (assetEntity) => {
      logger.debug(
        {
          assetId: assetEntity.id,
        },
        'Getting vulnerability findings for asset.',
      );
      await apiClient.iterateAssetVulnerabilityFinding(
        assetEntity.id! as string,
        async (assetVulnerability) => {
          const vulnerabilityEntity = await fetchVulnerability(
            context,
            assetVulnerability.id,
          );

          const vulnerabilityInfo = await apiClient.getVulnerabilityInformation(
            assetVulnerability.id,
          );

          const findingEntity = await jobState.addEntity(
            createAssetVulnerabilityEntity(
              assetVulnerability,
              vulnerabilityEntity,
              assetEntity.id! as string,
              vulnerabilityInfo,
            ),
          );

          await jobState.addRelationship(
            createDirectRelationship({
              _class: RelationshipClass.HAS,
              from: assetEntity,
              to: findingEntity,
            }),
          );

          await jobState.addRelationship(
            createDirectRelationship({
              _class: RelationshipClass.IS,
              from: findingEntity,
              to: vulnerabilityEntity,
            }),
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
  fetchVulnerability,
  createVulnerabilityEntity,
};
