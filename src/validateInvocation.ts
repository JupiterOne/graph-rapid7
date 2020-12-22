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

  if (config.disableSslVerification) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    context.logger.publishEvent({
      name: 'disable_ssl_certs',
      description:
        'Disabling SSL Certs. NOT RECOMMENDED: Please install TLS certificates from https://letsencrypt.org/',
    });
  }

  const apiClient = createAPIClient(config);
  await apiClient.verifyAuthentication();
}
