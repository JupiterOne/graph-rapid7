import {
  createDirectRelationship,
  createIntegrationEntity,
  Entity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  JobState,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { InsightVMVulnerability, IntegrationConfig } from '../types';
import { entities, relationships } from '../constants';

export function getVulnerabilityKey(id: string): string {
  return `insightvm_vulnerability:${id}`;
}

async function createOrFindEntity(
  jobState: JobState,
  vulnerability: InsightVMVulnerability,
): Promise<Entity> {
  const existingVulnerability = await jobState.findEntity(
    getVulnerabilityKey(vulnerability.id),
  );

  if (existingVulnerability) {
    return existingVulnerability;
  }

  return createIntegrationEntity({
    entityData: {
      source: vulnerability,
      assign: {
        _key: getVulnerabilityKey(vulnerability.id),
        _type: entities.VULNERABILITY._type,
        _class: entities.VULNERABILITY._class,
        id: `${vulnerability.id}`,
        name: vulnerability.id,
        category: 'other',
        severity: 'critical',
        blocking: false,
        open: false,
        production: false,
        public: true,
      },
    },
  });
}

export async function fetchVulnerabilities({
  instance,
  jobState,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config);

  await jobState.iterateEntities(
    { _type: entities.ASSET._type },
    async (assetEntity) => {
      await apiClient.iterateVulnerabilities(
        assetEntity.id!,
        async (vulnerability) => {
          const vulnerabilityEntity = await createOrFindEntity(
            jobState,
            vulnerability,
          );

          await Promise.all([
            jobState.addEntity(vulnerabilityEntity),
            jobState.addRelationship(
              createDirectRelationship({
                _class: RelationshipClass.EXPLOITS,
                from: vulnerabilityEntity,
                to: assetEntity,
              }),
            ),
          ]);
        },
      );
    },
  );
}

export const vulnerabilitiesSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: 'fetch-vulnerabilities',
    name: 'Fetch Vulnerabilities',
    entities: [entities.VULNERABILITY],
    relationships: [relationships.VULNERABILITY_EXPLOITS_ASSET],
    dependsOn: ['fetch-assets'],
    executionHandler: fetchVulnerabilities,
  },
];
