import {
  createMockExecutionContext,
  setupRecording,
} from '@jupiterone/integration-sdk-testing';

import { IntegrationConfig } from './types';
import validateInvocation from './validateInvocation';
import { APIClient } from './client';

it('requires valid config', async () => {
  const executionContext = createMockExecutionContext<IntegrationConfig>({
    instanceConfig: {} as IntegrationConfig,
  });

  await expect(validateInvocation(executionContext)).rejects.toThrow(
    'Config requires all of {insightHost, insightClientUsername, insightClientPassword}',
  );
});

it('auth error', async () => {
  const recording = setupRecording({
    directory: '__recordings__',
    name: 'client-auth-error',
  });

  recording.server.any().intercept((req, res) => {
    res.status(401);
  });

  const executionContext = createMockExecutionContext({
    instanceConfig: {
      insightHost: 'INVALID',
      insightClientUsername: 'INVALID',
      insightClientPassword: 'INVALID',
    },
  });

  await expect(validateInvocation(executionContext)).rejects.toThrow(
    'Error occurred validating invocation at https://INVALID/api/3/users (code=PROVIDER_API_ERROR, \
message=Provider API failed at https://INVALID/api/3/users: 401 Unauthorized)',
  );
});

it('should direct users to Rapid7 cert documentation if validation fails with DEPTH_ZERO_SELF_SIGNED_CERT', async () => {
  const executionContext = createMockExecutionContext({
    instanceConfig: {
      insightHost: 'localhost:3780',
      insightClientUsername: 'INVALID',
      insightClientPassword: 'INVALID',
    },
  });

  const selfSignedCertificateError = Object.assign(new Error(), {
    message: `request to https://${executionContext.instance.config.insightHost}/api/3/users failed, reason: self signed certificate`,
    type: 'system',
    errno: 'DEPTH_ZERO_SELF_SIGNED_CERT',
    code: 'DEPTH_ZERO_SELF_SIGNED_CERT',
  });
  jest
    .spyOn(APIClient.prototype, 'request' as any)
    .mockRejectedValueOnce(selfSignedCertificateError);

  await expect(validateInvocation(executionContext)).rejects.toThrow(
    'The InsightVM Security Console is using a self-signed certificate. Please follow the Rapid7 \
guidelines to install a valid TLS certificate: https://docs.rapid7.com/insightvm/managing-the-security-console/#managing-the-https-certificate. We recommend \
installing a certificate from https://letsencrypt.org/ or a certificate authority you trust.',
  );
});
