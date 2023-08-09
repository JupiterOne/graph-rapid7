import {
  createDirectRelationship,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import { entities, relationships, steps } from '../constants';
import { getUserKey } from './access';

const RELATIONSHIPS_BATCH_SIZE = 5;

export async function fetchAssetUsers({
  logger,
  instance,
  jobState,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config, logger);

  let userAssetRelationships: ReturnType<typeof createDirectRelationship>[] =
    [];
  await jobState.iterateEntities(
    { _type: entities.ASSET._type },
    async (assetEntity) => {
      await apiClient.iterateAssetUsers(
        assetEntity.id as string,
        async (user) => {
          const userKey = getUserKey(user.id);

          if (!jobState.hasKey(userKey)) {
            return;
          }

          userAssetRelationships.push(
            createDirectRelationship({
              _class: RelationshipClass.OWNS,
              fromKey: userKey,
              fromType: entities.USER._type,
              toKey: assetEntity._key,
              toType: entities.ASSET._type,
            }),
          );
          if (userAssetRelationships.length >= RELATIONSHIPS_BATCH_SIZE) {
            await jobState.addRelationships(userAssetRelationships);
            userAssetRelationships = [];
          }
        },
      );
    },
  );
  // flush relationships
  if (userAssetRelationships.length) {
    await jobState.addRelationships(userAssetRelationships);
    userAssetRelationships = [];
  }
}

export const assetUsersStep: IntegrationStep<IntegrationConfig>[] = [
  {
    id: steps.FETCH_ASSET_USERS,
    name: 'Fetch Asset Users',
    entities: [],
    relationships: [relationships.USER_OWNS_ASSET],
    dependsOn: [steps.FETCH_ASSETS, steps.FETCH_USERS],
    executionHandler: fetchAssetUsers,
  },
];
