import {
  IntegrationExecutionContext,
  IntegrationInstanceConfig,
  IntegrationInstanceConfigFieldMap,
  IntegrationValidationError,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from './client';
import { VulnerabilitySeverity, VulnerabilityState } from './types';

/**
 * A type describing the configuration fields required to execute the
 * integration for a specific account in the data provider.
 *
 * When executing the integration in a development environment, these values may
 * be provided in a `.env` file with environment variables. For example:
 *
 * - `CLIENT_ID=123` becomes `instance.config.clientId = '123'`
 * - `CLIENT_SECRET=abc` becomes `instance.config.clientSecret = 'abc'`
 *
 * Environment variables are NOT used when the integration is executing in a
 * managed environment. For example, in JupiterOne, users configure
 * `instance.config` in a UI.
 */
export const instanceConfigFields: IntegrationInstanceConfigFieldMap = {
  insightHost: {
    type: 'string',
  },
  insightClientUsername: {
    type: 'string',
  },
  insightClientPassword: {
    type: 'string',
    mask: true,
  },
  disableTlsVerification: {
    type: 'boolean',
    optional: true,
  },
  vulnerabilitySeverities: {
    type: 'string',
    mask: false,
    optional: true,
  },
  vulnerabilityStates: {
    type: 'string',
    mask: false,
    optional: true,
  },
};

const validateVulnerabilitySeverities = (vulnerabilitySeverities: string) => {
  const vulnerabilitySeveritiesArray = vulnerabilitySeverities.split(',');
  const validSeverities = Object.values(VulnerabilitySeverity);
  for (const vulnerabilitySeverity of vulnerabilitySeveritiesArray) {
    if (
      !validSeverities.includes(vulnerabilitySeverity as VulnerabilitySeverity)
    ) {
      throw new IntegrationValidationError(
        `Severity - ${vulnerabilitySeverity} - is not valid. Valid vulnerability severities include ${validSeverities}`,
      );
    }
  }
};

const validateVulnerabilityStates = (vulnerabilityStates: string) => {
  const vulnerabilityStatesArray = vulnerabilityStates.split(',');
  const validStates = Object.values(VulnerabilityState);
  for (const vulnerabilityState of vulnerabilityStatesArray) {
    if (!validStates.includes(vulnerabilityState as VulnerabilityState)) {
      throw new IntegrationValidationError(
        `Status - ${vulnerabilityState} - is not valid. Valid vulnerability status include ${validStates}`,
      );
    }
  }
};

/**
 * Properties provided by the `IntegrationInstance.config`. This reflects the
 * same properties defined by `instanceConfigFields`.
 */
export interface IntegrationConfig extends IntegrationInstanceConfig {
  /**
   * The hostname of the InsightVM instance.
   */
  insightHost: string;

  /**
   * The administrator account username for authentication.
   */
  insightClientUsername: string;

  /**
   * The administrator account password for authentication.
   */
  insightClientPassword: string;

  /**
   * Disable TLS certificate verification for hosts that cannot install certificates.
   */
  disableTlsVerification?: boolean;

  /**
   * Comma separated vulnerability severity levels to filter by
   */
  vulnerabilitySeverities?: string;

  /**
   * Comma separated vulnerability states to filter by
   */
  vulnerabilityStates?: string;
}

export async function validateInvocation(
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

  config.insightHost = validateHost(config.insightHost);

  if (config.disableTlsVerification) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    context.logger.publishEvent({
      name: 'disable_tls_verify',
      description:
        'Disabling TLS certificate verification. NOT RECOMMENDED: Please install valid TLS certificates into Rapid7 server.',
    });
  }

  if (config.vulnerabilitySeverities) {
    config.vulnerabilitySeverities = config.vulnerabilitySeverities.replace(
      /\s+/g,
      '',
    );
    validateVulnerabilitySeverities(config.vulnerabilitySeverities);
  }

  if (config.vulnerabilityStates) {
    config.vulnerabilityStates = config.vulnerabilityStates.replace(/\s+/g, '');
    validateVulnerabilityStates(config.vulnerabilityStates);
  }

  const apiClient = createAPIClient(config, context.logger);
  await apiClient.verifyAuthentication();
}

export function validateHost(host: string) {
  let validHost = host;
  if (!validHost.startsWith('http')) {
    validHost = `https://${host}`;
  }
  try {
    const url = new URL(validHost);

    return url.host;
  } catch (error) {
    throw new IntegrationValidationError(`Invalid InsightVM hostname: ${host}`);
  }
}
