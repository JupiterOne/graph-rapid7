import {
  createDirectRelationship,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { IntegrationConfig } from '../types';
import { relationships, entities } from '../constants';

import { getUserKey } from './access';

export async function fetchAssetUsers({
  instance,
  jobState,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config);

  await jobState.iterateEntities(
    { _type: entities.ASSET._type },
    async (assetEntity) => {
      await apiClient.iterateAssetUsers(assetEntity.id!, async (user) => {
        const userEntity = await jobState.findEntity(getUserKey(user.id));

        if (userEntity) {
          await jobState.addRelationship(
            createDirectRelationship({
              _class: RelationshipClass.USES,
              from: userEntity,
              to: assetEntity,
            }),
          );
        }
      });
    },
  );
}

export const assetUsersStep: IntegrationStep<IntegrationConfig>[] = [
  {
    id: 'fetch-asset-users',
    name: 'Fetch Asset Users',
    entities: [],
    relationships: [relationships.USER_USES_ASSET],
    dependsOn: ['fetch-assets', 'fetch-users'],
    executionHandler: fetchAssetUsers,
  },
];
