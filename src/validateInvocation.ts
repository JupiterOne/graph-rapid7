import {
  IntegrationExecutionContext,
  IntegrationValidationError,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from './client';
import { IntegrationConfig } from './types';

export default async function validateInvocation(
  context: IntegrationExecutionContext<IntegrationConfig>,
) {
  const { config } = context.instance;

  if (
    !config.insightHost ||
    !config.insightClientUsername ||
    !config.insightClientPassword
  ) {
    throw new IntegrationValidationError(
      'Config requires all of {insightHost, insightClientUsername, insightClientPassword}',
    );
  }

  const apiClient = createAPIClient(config);
  await apiClient.verifyAuthentication();
}
