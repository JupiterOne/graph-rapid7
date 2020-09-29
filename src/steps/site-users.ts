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

export async function fetchSiteUsers({
  instance,
  jobState,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config);

  await jobState.iterateEntities(
    { _type: entities.SITE._type },
    async (siteEntity) => {
      await apiClient.iterateSiteUsers(siteEntity.id!, async (user) => {
        const userEntity = await jobState.findEntity(getUserKey(user.id));

        if (userEntity) {
          await Promise.all([
            jobState.addRelationship(
              createDirectRelationship({
                _class: RelationshipClass.ALLOWS,
                from: siteEntity,
                to: userEntity,
              }),
            ),
          ]);
        }
      });
    },
  );
}

export const siteUsersSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: 'fetch-site-users',
    name: 'Fetch Site Users',
    entities: [],
    relationships: [relationships.SITE_ALLOWS_USER],
    dependsOn: ['fetch-sites'],
    executionHandler: fetchSiteUsers,
  },
];
