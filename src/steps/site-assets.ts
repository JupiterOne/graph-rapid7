import {
  createDirectRelationship,
  Entity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import {
  ACCOUNT_ENTITY_DATA_KEY,
  entities,
  relationships,
  steps,
} from '../constants';
import { getAssetKey } from './assets';

const RELATIONSHIPS_BATCH_SIZE = 5;

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
        async (assets) => {
          const siteAssetRelationships: ReturnType<
            typeof createDirectRelationship
          >[] = [];
          for (const asset of assets) {
            connectedAssets.add(`${asset.id}`);

            const assetKey = getAssetKey(asset.id);

            if (jobState.hasKey(assetKey)) {
              siteAssetRelationships.push(
                createDirectRelationship({
                  _class: RelationshipClass.MONITORS,
                  fromKey: siteEntity._key,
                  fromType: entities.SITE._type,
                  toKey: assetKey,
                  toType: entities.ASSET._type,
                }),
              );
            }
          }

          await jobState.addRelationships(siteAssetRelationships);
        },
      );
    },
  );

  const accountEntity = (await jobState.getData(
    ACCOUNT_ENTITY_DATA_KEY,
  )) as Entity;
  let accountAssetRelationships: ReturnType<typeof createDirectRelationship>[] =
    [];
  await jobState.iterateEntities(
    { _type: entities.ASSET._type },
    async (assetEntity) => {
      if (connectedAssets.has(assetEntity.id as string)) {
        return;
      }
      accountAssetRelationships.push(
        createDirectRelationship({
          _class: RelationshipClass.HAS,
          fromKey: accountEntity._key,
          fromType: entities.ACCOUNT._type,
          toKey: assetEntity._key,
          toType: entities.ASSET._type,
        }),
      );
      if (accountAssetRelationships.length >= RELATIONSHIPS_BATCH_SIZE) {
        await jobState.addRelationships(accountAssetRelationships);
        accountAssetRelationships = [];
      }
    },
  );
  // flush relationships
  if (accountAssetRelationships.length) {
    await jobState.addRelationships(accountAssetRelationships);
    accountAssetRelationships = [];
  }
}

export const siteAssetsSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: steps.FETCH_SITE_ASSETS,
    name: 'Fetch Site Assets',
    entities: [],
    relationships: [
      relationships.SITE_MONITORS_ASSET,
      relationships.ACCOUNT_HAS_ASSET,
    ],
    dependsOn: [steps.FETCH_ACCOUNT, steps.FETCH_SITES, steps.FETCH_ASSETS],
    executionHandler: fetchSiteAssets,
  },
];
