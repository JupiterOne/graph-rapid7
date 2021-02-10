import {
  createDirectRelationship,
  Entity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { IntegrationConfig } from '../types';
import { entities, relationships, steps } from '../constants';
import { getAssetKey } from './assets';
import { ACCOUNT_ENTITY_DATA_KEY } from '../constants';

export async function fetchSiteAssets({
  logger,
  instance,
  jobState,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config, logger);

  const connectedAssets = new Set<string>();

  await jobState.iterateEntities(
    { _type: entities.SITE._type },
    async (siteEntity) => {
      await apiClient.iterateSiteAssets(
        siteEntity.id as string,
        async (asset) => {
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
        },
      );
    },
  );

  const accountEntity = (await jobState.getData(
    ACCOUNT_ENTITY_DATA_KEY,
  )) as Entity;

  await jobState.iterateEntities(
    { _type: entities.ASSET._type },
    async (assetEntity) => {
      if (!connectedAssets.has(assetEntity.id as string)) {
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
    id: steps.FETCH_SITE_ASSETS,
    name: 'Fetch Site Assets',
    entities: [],
    relationships: [
      relationships.SITE_HAS_ASSET,
      relationships.ACCOUNT_HAS_ASSET,
    ],
    dependsOn: [steps.FETCH_ACCOUNT, steps.FETCH_SITES, steps.FETCH_ASSETS],
    executionHandler: fetchSiteAssets,
  },
];
