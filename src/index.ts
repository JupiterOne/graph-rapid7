import { IntegrationInvocationConfig } from '@jupiterone/integration-sdk-core';

import {
  instanceConfigFields,
  IntegrationConfig,
  validateInvocation,
} from './config';
import { integrationSteps } from './steps';
import { ingestionConfig } from './ingestionConfig';

export const invocationConfig: IntegrationInvocationConfig<IntegrationConfig> =
  {
    instanceConfigFields,
    validateInvocation,
    integrationSteps,
    ingestionConfig,
  };
