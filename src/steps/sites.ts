import {
  createDirectRelationship,
  createIntegrationEntity,
  Entity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { IntegrationConfig } from '../types';
import { ACCOUNT_ENTITY_DATA_KEY, entities, relationships } from '../constants';

export function getSiteKey(id: number): string {
  return `insightvm_site:${id}`;
}

export async function fetchSites({
  instance,
  jobState,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config);

  const accountEntity = (await jobState.getData(
    ACCOUNT_ENTITY_DATA_KEY,
  )) as Entity;

  await apiClient.iterateSites(async (site) => {
    const webLink = site.links.find((link) => link.rel === 'self')?.href;

    const siteEntity = createIntegrationEntity({
      entityData: {
        source: site,
        assign: {
          _key: getSiteKey(site.id),
          _type: entities.SITE._type,
          _class: entities.SITE._class,
          id: `${site.id}`,
          assets: site.assets,
          importance: site.importance,
          name: site.name,
          type: site.type,
          webLink,
        },
      },
    });

    await Promise.all([
      jobState.addEntity(siteEntity),
      jobState.addRelationship(
        createDirectRelationship({
          _class: RelationshipClass.HAS,
          from: accountEntity,
          to: siteEntity,
        }),
      ),
    ]);
  });
}

export const sitesSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: 'fetch-sites',
    name: 'Fetch Sites',
    entities: [entities.SITE],
    relationships: [relationships.ACCOUNT_HAS_SITE],
    dependsOn: ['fetch-account'],
    executionHandler: fetchSites,
  },
];
