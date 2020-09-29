import {
  createMockStepExecutionContext,
  Recording,
  setupRecording,
} from '@jupiterone/integration-sdk-testing';

import { IntegrationConfig } from '../types';
import { fetchUsers } from './access';
import { fetchAccountDetails } from './account';
import { fetchSites } from './sites';
import { fetchScans } from './scans';
import { fetchAssets } from './assets';
import { fetchSiteAssets } from './site-assets';
import { fetchVulnerabilities } from './vulnerabilities';

const DEFAULT_INSIGHT_HOST = 'localhost:3780';
const DEFAULT_INSIGHT_CLIENT_USERNAME = 'admin';
const DEFAULT_INSIGHT_CLIENT_PASSWORD = 'admin_password';

const integrationConfig: IntegrationConfig = {
  insightHost: process.env.INSIGHT_HOST || DEFAULT_INSIGHT_HOST,
  insightClientUsername:
    process.env.INSIGHT_CLIENT_USERNAME || DEFAULT_INSIGHT_CLIENT_USERNAME,
  insightClientPassword:
    process.env.INSIGHT_CLIENT_PASSWORD || DEFAULT_INSIGHT_CLIENT_PASSWORD,
};

jest.setTimeout(10 * 1000);

describe('Rapid7 InsightVM', () => {
  let recording: Recording;

  beforeEach(() => {
    recording = setupRecording({
      directory: __dirname,
      name: 'jfrog_recordings',
      options: {
        recordFailedRequests: true,
      },
    });
  });

  afterEach(async () => {
    await recording.stop();
  });

  test('should collect data', async () => {
    const context = createMockStepExecutionContext<IntegrationConfig>({
      instanceConfig: integrationConfig,
    });

    // Simulates dependency graph execution.
    // See https://github.com/JupiterOne/sdk/issues/262.
    await fetchAccountDetails(context);
    await fetchUsers(context);
    await fetchSites(context);
    await fetchScans(context);
    await fetchAssets(context);
    await fetchSiteAssets(context);
    await fetchVulnerabilities(context);

    // Review snapshot, failure is a regression
    expect({
      numCollectedEntities: context.jobState.collectedEntities.length,
      numCollectedRelationships: context.jobState.collectedRelationships.length,
      collectedEntities: context.jobState.collectedEntities,
      collectedRelationships: context.jobState.collectedRelationships,
      encounteredTypes: context.jobState.encounteredTypes,
    }).toMatchSnapshot();

    expect(
      context.jobState.collectedEntities.filter((e) =>
        e._class.includes('Account'),
      ),
    ).toMatchGraphObjectSchema({
      _class: ['Account'],
      schema: {
        additionalProperties: true,
        properties: {
          _type: { const: 'insightvm_account' },
          _rawData: {
            type: 'array',
            items: { type: 'object' },
          },
          webLink: {
            type: 'string',
          },
          name: {
            type: 'string',
          },
          accessUrl: {
            type: 'string',
          },
        },
      },
    });

    expect(
      context.jobState.collectedEntities.filter((e) =>
        e._class.includes('User'),
      ),
    ).toMatchGraphObjectSchema({
      _class: ['User'],
      schema: {
        additionalProperties: true,
        properties: {
          _type: { const: 'insightvm_user' },
          _rawData: {
            type: 'array',
            items: { type: 'object' },
          },
          username: {
            type: 'string',
          },
          email: {
            type: 'string',
          },
          webLink: {
            type: 'string',
          },
        },
      },
    });

    expect(
      context.jobState.collectedEntities.filter((e) =>
        e._class.includes('Site'),
      ),
    ).toMatchGraphObjectSchema({
      _class: ['Site'],
      schema: {
        additionalProperties: true,
        properties: {
          _type: { const: 'insightvm_site' },
          _rawData: {
            type: 'array',
            items: { type: 'object' },
          },
          assets: {
            type: 'number',
          },
          importance: {
            type: 'string',
          },
          name: {
            type: 'string',
          },
          type: {
            type: 'string',
          },
          webLink: {
            type: 'string',
          },
        },
      },
    });

    expect(
      context.jobState.collectedEntities.filter((e) =>
        e._class.includes('Process'),
      ),
    ).toMatchGraphObjectSchema({
      _class: ['Process'],
      schema: {
        additionalProperties: true,
        properties: {
          _type: { const: 'insightvm_scan' },
          _rawData: {
            type: 'array',
            items: { type: 'object' },
          },
          assets: {
            type: 'number',
          },
          siteName: {
            type: 'string',
          },
          engineName: {
            type: 'string',
          },
          name: {
            type: 'string',
          },
          state: {
            type: 'string',
          },
          webLink: {
            type: 'string',
          },
        },
      },
    });

    expect(
      context.jobState.collectedEntities.filter((e) =>
        e._class.includes('Device'),
      ),
    ).toMatchGraphObjectSchema({
      _class: ['Device'],
      schema: {
        additionalProperties: true,
        properties: {
          _type: { const: 'insightvm_asset' },
          _rawData: {
            type: 'array',
            items: { type: 'object' },
          },
          name: {
            type: 'string',
          },
          category: {
            type: 'string',
          },
          make: {
            type: 'string',
          },
          model: {
            type: 'string',
          },
          serial: {
            type: 'string',
          },
          webLink: {
            type: 'string',
          },
        },
      },
    });

    expect(
      context.jobState.collectedEntities.filter((e) =>
        e._class.includes('Vulnerability'),
      ),
    ).toMatchGraphObjectSchema({
      _class: ['Vulnerability'],
      schema: {
        additionalProperties: true,
        properties: {
          _type: { const: 'insightvm_vulnerability' },
          _rawData: {
            type: 'array',
            items: { type: 'object' },
          },
          name: {
            type: 'string',
          },
          category: {
            type: 'string',
          },
          severity: {
            type: 'string',
          },
          blocking: {
            type: 'boolean',
          },
          open: {
            type: 'boolean',
          },
          production: {
            type: 'boolean',
          },
          public: {
            type: 'boolean',
          },
          webLink: {
            type: 'string',
          },
        },
      },
    });
  });
});
