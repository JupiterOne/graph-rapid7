import { fetchVulnerability } from './vulnerabilities';
import { Recording, setupRapid7Recording } from '../../test/helpers/recording';
import { createMockStepExecutionContext } from '@jupiterone/integration-sdk-testing';
import { IntegrationConfig } from '../types';

const instanceConfig = {
  insightHost: process.env.INSIGHT_HOST || 'localhost:3780',
  insightClientUsername: process.env.INSIGHT_CLIENT_USERNAME || 'username',
  insightClientPassword: process.env.INSIGHT_CLIENT_PASSWORD || 'password',
};

describe('#fetchVulnerability', () => {
  let recording: Recording;

  beforeEach(() => {
    recording = setupRapid7Recording({
      directory: __dirname,
      name: 'fetchVulnerabilities',
      options: {
        recordFailedRequests: false,
      },
    });
  });

  afterEach(async () => {
    await recording.stop();
  });

  test('should collect data', async () => {
    const vulnId = 'apache-httpd-cve-2020-9490';
    const context = createMockStepExecutionContext<IntegrationConfig>({
      instanceConfig,
    });

    await fetchVulnerability(context, vulnId);
    expect(context.jobState.collectedEntities?.length).toBeTruthy;
    expect(context.jobState.collectedEntities).toMatchGraphObjectSchema({
      _class: ['Vulnerability'],
      schema: {
        additionalProperties: true,
        properties: {
          _type: { const: 'insightvm_vulnerability' },
          _key: { type: 'string' },
          id: { type: 'string' },
          name: { type: 'string' },
          severity: { type: 'string' },
          numericSeverity: { type: 'number' },
          category: { type: 'string' },
          description: { type: 'string' },
          exploits: { type: 'number' },
          _rawData: {
            type: 'array',
            items: { type: 'object' },
          },
        },
        required: [],
      },
    });
  });
});
