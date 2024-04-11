import {
  createIntegrationEntity,
  IntegrationStep,
  IntegrationStepExecutionContext,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import { entities, IngestionSources, steps } from '../constants';

export function getSiteIdFromSiteKey(siteKey: string): string {
  return siteKey.split(':')[1];
}

export function getSiteKey(id: number): string {
  return `insightvm_site:${id}`;
}

export async function fetchSites({
  logger,
  instance,
  jobState,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config, logger);

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

    await Promise.all([jobState.addEntity(siteEntity)]);
  });
}

export const sitesSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: steps.FETCH_SITES,
    name: 'Fetch Sites',
    entities: [entities.SITE],
    relationships: [],
    dependsOn: [],
    ingestionSourceId: IngestionSources.SITES,
    executionHandler: fetchSites,
  },
];
