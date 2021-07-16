import { fetchVulnerability } from './vulnerabilities';
import { Recording, setupRapid7Recording } from '../../test/helpers/recording';
import { createMockStepExecutionContext } from '@jupiterone/integration-sdk-testing';
import { integrationConfig } from '../../test/config';

describe('#fetchVulnerability', () => {
  let recording: Recording;

  beforeEach(() => {
    recording = setupRapid7Recording({
      directory: __dirname,
      name: 'fetchVulnerabilities',
      options: {
        matchRequestsBy: {
          headers: false,
          url: {
            hostname: false,
          },
        },
        recordFailedRequests: false,
      },
    });
  });

  afterEach(async () => {
    await recording.stop();
  });

  test('should collect data', async () => {
    const vulnId = 'apache-httpd-cve-2020-9490';
    const context = createMockStepExecutionContext({
      instanceConfig: integrationConfig,
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
