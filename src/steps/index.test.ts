import { createMockStepExecutionContext } from '@jupiterone/integration-sdk-testing';

import { Recording, setupRapid7Recording } from '../../test/helpers/recording';

import { fetchUsers } from './access';
import { fetchAccountDetails } from './account';
import { fetchSites } from './sites';
import { fetchScans } from './scans';
import { fetchAssets } from './assets';
import { fetchSiteAssets } from './site-assets';
import {
  fetchAssetVulnerabilityFinding,
  fetchVulnerability,
} from './vulnerabilities';
import { fetchAssetUsers } from './asset-users';
import { fetchScanAssets } from './scan-assets';
import { entities } from '../constants';
import { integrationConfig } from '../../test/config';

jest.setTimeout(10 * 1000);

describe('Rapid7 InsightVM', () => {
  let recording: Recording;

  beforeEach(() => {
    recording = setupRapid7Recording({
      directory: __dirname,
      name: 'insightvm_recordings',
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
    const context = createMockStepExecutionContext({
      instanceConfig: integrationConfig,
    });

    // Simulates dependency graph execution.
    // See https://github.com/JupiterOne/sdk/issues/262.
    await fetchAccountDetails(context);
    await fetchUsers(context);
    await fetchSites(context);
    await fetchScans(context);
    await fetchAssets(context);
    await fetchAssetUsers(context);
    await fetchSiteAssets(context);
    await fetchScanAssets(context);
    await fetchAssetVulnerabilityFinding(context);

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
        e._class.includes(entities.ACCOUNT._class),
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
        e._class.includes(entities.USER._class),
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
        e._class.includes(entities.SITE._class),
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
        e._class.includes(entities.SCAN._class),
      ),
    ).toMatchGraphObjectSchema({
      _class: ['Assessment'],
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
        e._class.includes(entities.ASSET._class),
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
        e._class.includes(entities.FINDING._class),
      ),
    ).toMatchGraphObjectSchema({
      _class: ['Finding'],
      schema: {
        additionalProperties: true,
        properties: {
          _type: { const: 'insightvm_finding' },
          _rawData: {
            type: 'array',
            items: { type: 'object' },
          },
          name: {
            type: 'string',
          },
        },
      },
    });

    expect(
      context.jobState.collectedEntities.filter((e) =>
        e._class.includes(entities.VULNERABILITY._class),
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
