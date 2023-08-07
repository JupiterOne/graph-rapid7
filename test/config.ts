import * as dotenv from 'dotenv';
import * as path from 'path';

import { IntegrationConfig } from '../src/config';
import { invocationConfig } from '../src';
import { IntegrationInvocationConfig } from '@jupiterone/integration-sdk-core';
import { StepTestConfig } from '@jupiterone/integration-sdk-testing';

if (process.env.LOAD_ENV) {
  dotenv.config({
    path: path.join(__dirname, '../.env'),
  });
}

export function buildStepTestConfig(stepId: string): StepTestConfig {
  return {
    stepId,
    instanceConfig: integrationConfig,
    invocationConfig: invocationConfig as IntegrationInvocationConfig,
  };
}

const DEFAULT_INSIGHT_HOST = 'localhost:3780';
const DEFAULT_INSIGHT_CLIENT_USERNAME = 'admin';
const DEFAULT_INSIGHT_CLIENT_PASSWORD = 'admin-password';

export const integrationConfig: IntegrationConfig = {
  insightHost: process.env.INSIGHT_HOST || DEFAULT_INSIGHT_HOST,
  insightClientUsername:
    process.env.INSIGHT_CLIENT_USERNAME || DEFAULT_INSIGHT_CLIENT_USERNAME,
  insightClientPassword:
    process.env.INSIGHT_CLIENT_PASSWORD || DEFAULT_INSIGHT_CLIENT_PASSWORD,
};
