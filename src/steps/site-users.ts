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

export async function fetchSiteUsers({
  logger,
  instance,
  jobState,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config, logger);

  await jobState.iterateEntities(
    { _type: entities.SITE._type },
    async (siteEntity) => {
      await apiClient.iterateSiteUsers(
        siteEntity.id as string,
        async (user) => {
          const userKey = getUserKey(user.id);

          if (jobState.hasKey(userKey)) {
            await jobState.addRelationship(
              createDirectRelationship({
                _class: RelationshipClass.HAS,
                fromKey: siteEntity._key,
                fromType: entities.SITE._type,
                toKey: userKey,
                toType: entities.USER._type,
              }),
            );
          }
        },
      );
    },
  );
}

export const siteUsersSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: steps.FETCH_SITE_USERS,
    name: 'Fetch Site Users',
    entities: [],
    relationships: [relationships.SITE_HAS_USER],
    dependsOn: [steps.FETCH_SITES, steps.FETCH_USERS],
    executionHandler: fetchSiteUsers,
  },
];
