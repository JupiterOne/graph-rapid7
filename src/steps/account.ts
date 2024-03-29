import {
  createIntegrationEntity,
  IntegrationStep,
  IntegrationStepExecutionContext,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import { ACCOUNT_ENTITY_DATA_KEY, entities, steps } from '../constants';

export function getAccountKey(user: string): string {
  return `insightvm_account:${user}`;
}

export async function fetchAccountDetails({
  logger,
  instance,
  jobState,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config, logger);

  const account = await apiClient.getAccount();
  const [webLink] = account.links;

  const accountEntity = createIntegrationEntity({
    entityData: {
      source: account,
      assign: {
        _key: getAccountKey(account.user),
        _type: entities.ACCOUNT._type,
        _class: entities.ACCOUNT._class,
        name: account.user,
        webLink: webLink.href,
        accessUrl: instance.config.insightHost,
      },
    },
  });

  await Promise.all([
    jobState.addEntity(accountEntity),
    jobState.setData(ACCOUNT_ENTITY_DATA_KEY, accountEntity),
  ]);
}

export const accountSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: steps.FETCH_ACCOUNT,
    name: 'Fetch Account Details',
    entities: [entities.ACCOUNT],
    relationships: [],
    dependsOn: [],
    executionHandler: fetchAccountDetails,
  },
];
