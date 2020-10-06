import {
  createDirectRelationship,
  Entity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { IntegrationConfig } from '../types';
import { entities, relationships } from '../constants';
import { getAssetKey } from './assets';
import { ACCOUNT_ENTITY_DATA_KEY } from '../constants';

export async function fetchSiteAssets({
  instance,
  jobState,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config);

  const connectedAssets = new Set<string>();

  await jobState.iterateEntities(
    { _type: entities.SITE._type },
    async (siteEntity) => {
      await apiClient.iterateSiteAssets(siteEntity.id!, async (asset) => {
        connectedAssets.add(`${asset.id}`);

        const assetEntity = await jobState.findEntity(getAssetKey(asset.id));

        if (assetEntity) {
          await jobState.addRelationship(
            createDirectRelationship({
              _class: RelationshipClass.HAS,
              from: siteEntity,
              to: assetEntity,
            }),
          );
        }
      });
    },
  );

  const accountEntity = (await jobState.getData(
    ACCOUNT_ENTITY_DATA_KEY,
  )) as Entity;

  await jobState.iterateEntities(
    { _type: entities.ASSET._type },
    async (assetEntity) => {
      if (!connectedAssets.has(assetEntity.id!)) {
        await jobState.addRelationship(
          createDirectRelationship({
            _class: RelationshipClass.HAS,
            from: accountEntity,
            to: assetEntity,
          }),
        );
      }
    },
  );
}

export const siteAssetsSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: 'fetch-site-assets',
    name: 'Fetch Site Assets',
    entities: [entities.ASSET],
    relationships: [
      relationships.SITE_HAS_ASSET,
      relationships.ACCOUNT_HAS_ASSET,
    ],
    dependsOn: ['fetch-sites', 'fetch-assets'],
    executionHandler: fetchSiteAssets,
  },
];
