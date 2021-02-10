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

  if (config.disableTlsVerification) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    context.logger.publishEvent({
      name: 'disable_tls_verify',
      description:
        'Disabling TLS certificate verification. NOT RECOMMENDED: Please install valid TLS certificates into Rapid7 server.',
    });
  }

  const apiClient = createAPIClient(config, context.logger);
  await apiClient.verifyAuthentication();
}
