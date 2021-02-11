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
import {
  ACCOUNT_ENTITY_DATA_KEY,
  entities,
  relationships,
  steps,
} from '../constants';

export function getUserKey(id: number): string {
  return `insightvm_user:${id}`;
}

export async function fetchUsers({
  logger,
  instance,
  jobState,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config, logger);

  const accountEntity = (await jobState.getData(
    ACCOUNT_ENTITY_DATA_KEY,
  )) as Entity;

  await apiClient.iterateUsers(async (user) => {
    const webLink = user.links.find((link) => link.rel === 'self')?.href;

    const userEntity = createIntegrationEntity({
      entityData: {
        source: user,
        assign: {
          _key: getUserKey(user.id),
          _type: entities.USER._type,
          _class: entities.USER._class,
          id: `${user.id}`,
          username: user.login,
          email: user.email,
          webLink,
        },
      },
    });

    await Promise.all([
      jobState.addEntity(userEntity),
      jobState.addRelationship(
        createDirectRelationship({
          _class: RelationshipClass.HAS,
          from: accountEntity,
          to: userEntity,
        }),
      ),
    ]);
  });
}

export const accessSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: steps.FETCH_USERS,
    name: 'Fetch Users',
    entities: [entities.USER],
    relationships: [relationships.ACCOUNT_HAS_USER],
    dependsOn: [steps.FETCH_ACCOUNT],
    executionHandler: fetchUsers,
  },
];
