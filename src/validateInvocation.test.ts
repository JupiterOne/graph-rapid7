import {
  Recording,
  createMockExecutionContext,
} from '@jupiterone/integration-sdk-testing';

import { APIClient } from './client';
import { IntegrationConfig, validateHost, validateInvocation } from './config';
import { setupRapid7Recording } from '../test/helpers/recording';
import { integrationConfig } from '../test/config';
import { IntegrationValidationError } from '@jupiterone/integration-sdk-core';

describe('configTest', () => {
  let recording: Recording;

  afterEach(async () => {
    if (recording) {
      await recording.stop();
    }
  });

  it('requires valid config', async () => {
    const executionContext = createMockExecutionContext<IntegrationConfig>({
      instanceConfig: {} as IntegrationConfig,
    });

    await expect(validateInvocation(executionContext)).rejects.toThrow(
      'Config requires all of {insightHost, insightClientUsername, insightClientPassword}',
    );
  });

  it('validates invocation', async () => {
    recording = setupRapid7Recording({
      directory: __dirname,
      name: 'client-validates-invocation',
    });

    const executionContext = createMockExecutionContext({
      instanceConfig: integrationConfig,
    });

    await expect(validateInvocation(executionContext)).resolves.toBe(undefined);
  });

  it('auth error', async () => {
    recording = setupRapid7Recording({
      directory: __dirname,
      name: 'client-auth-error',
      options: {
        recordFailedRequests: true,
      },
    });

    const executionContext = createMockExecutionContext({
      instanceConfig: {
        insightHost: 'INVALID',
        insightClientUsername: 'INVALID',
        insightClientPassword: 'INVALID',
      },
    });

    await expect(validateInvocation(executionContext)).rejects.toThrow(
      IntegrationValidationError,
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
});

describe('validateHost', () => {
  it('returns valid hostname', () => {
    expect(validateHost('example.com')).toBe('example.com');
    expect(validateHost('subdomain.example.com')).toBe('subdomain.example.com');
    expect(validateHost('https://example.com')).toBe('example.com');
    expect(validateHost('example.com/path')).toBe('example.com');
    expect(validateHost('localhost')).toBe('localhost');
  });

  it('throws error for invalid host', () => {
    expect(() => validateHost('')).toThrow('Invalid InsightVM hostname: ');
    expect(() => validateHost('!@#$')).toThrow(
      'Invalid InsightVM hostname: !@#$',
    );
  });
});
