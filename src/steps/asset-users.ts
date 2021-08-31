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

export async function fetchAssetUsers({
  logger,
  instance,
  jobState,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config, logger);

  await jobState.iterateEntities(
    { _type: entities.ASSET._type },
    async (assetEntity) => {
      await apiClient.iterateAssetUsers(
        assetEntity.id as string,
        async (user) => {
          const userEntity = await jobState.findEntity(getUserKey(user.id));

          if (userEntity) {
            await jobState.addRelationship(
              createDirectRelationship({
                _class: RelationshipClass.OWNS,
                from: userEntity,
                to: assetEntity,
              }),
            );
          }
        },
      );
    },
  );
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
