import {
  createDirectRelationship,
  createIntegrationEntity,
  Entity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';

import { APIClient, createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import { entities, relationships, steps } from '../constants';
import { InsightVmAssetVulnerability, Vulnerability } from '../types';
import pMap from 'p-map';

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
) {
  return createIntegrationEntity({
    entityData: {
      source: assetVulnerability,
      assign: {
        _key: getAssetVulnerabilityKey(assetId, assetVulnerability.id),
        _type: entities.FINDING._type,
        _class: entities.FINDING._class,
        id: `${assetVulnerability.id}`,
        name: assetVulnerability.id,
        category: 'host',
        open: assetVulnerability.status === 'vulnerable' ? true : undefined,
        severity: vulnerability.severity,
        numericSeverity: vulnerability.numericSeverity,
      },
    },
  });
}

export function getVulnerabilityKey(id: string): string {
  return `insightvm_vulnerability:${id}`;
}

function getVulnerabilityFetcher(
  client: APIClient,
  context: IntegrationStepExecutionContext<IntegrationConfig>,
): (vulnerabilityId: string) => Promise<Entity> {
  const { logger, jobState } = context;

  return async (vulnerabilityId: string) => {
    const vulnerabilityEntity = await jobState.findEntity(
      getVulnerabilityKey(vulnerabilityId),
    );

    if (vulnerabilityEntity) {
      logger.debug(
        {
          id: vulnerabilityId,
        },
        'Found existing vulnerability entity in jobState.',
      );
      return vulnerabilityEntity;
    } else {
      logger.debug(
        {
          id: vulnerabilityId,
        },
        'Creating new vulnerability entity in jobState.',
      );
      return jobState.addEntity(
        createVulnerabilityEntity(
          await client.getVulnerability(vulnerabilityId),
        ),
      );
    }
  };
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

  const fetchVulnerability = getVulnerabilityFetcher(apiClient, context);

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
        async (assetVulnerabilities) => {
          const vulnerabilities = new Map<string, Entity>();
          await pMap(
            assetVulnerabilities,
            async (vulnerability) => {
              const vulnerabilityEntity = await fetchVulnerability(
                vulnerability.id,
              );
              vulnerabilities.set(vulnerability.id, vulnerabilityEntity);
            },
            { concurrency: 5 },
          );

          await pMap(
            assetVulnerabilities,
            async (assetVulnerability) => {
              const vulnerabilityEntity = vulnerabilities.get(
                assetVulnerability.id,
              );
              if (!vulnerabilityEntity) {
                logger.warn(
                  { assetVulnerabilityId: assetVulnerability.id },
                  'No vulnerability found.',
                );
                return;
              }

              const findingEntity = await jobState.addEntity(
                createAssetVulnerabilityEntity(
                  assetVulnerability,
                  vulnerabilityEntity,
                  assetEntity.id! as string,
                ),
              );
              const assetFindingRelationship = createDirectRelationship({
                _class: RelationshipClass.HAS,
                from: assetEntity,
                to: findingEntity,
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
  getVulnerabilityFetcher,
  createVulnerabilityEntity,
};
