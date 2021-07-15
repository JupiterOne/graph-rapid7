import { testFunctions } from './vulnerabilities';
import { createMockStepExecutionContext } from '@jupiterone/integration-sdk-testing';
import {
  IntegrationConfig,
  InsightVmAssetVulnerability,
  Vulnerability,
} from '../types';

const { fetchVulnerability, createVulnerabilityEntity } = testFunctions;

const instanceConfig = {
  insightHost: process.env.INSIGHT_HOST || 'localhost:3780',
  insightClientUsername: process.env.INSIGHT_CLIENT_USERNAME || 'username',
  insightClientPassword: process.env.INSIGHT_CLIENT_PASSWORD || 'password',
};

describe('findOrCreateVulnerability', () => {
  test('should find vulnerability that has already been created', async () => {
    const existingVulnerabilityEntity = createVulnerabilityEntity({
      id: 'vuln-id',
      added: '2017-10-10',
      denialOfService: false,
      description: 'vuln description',
      exploits: 5,
      modified: '2017-10-10',
      published: '2017-10-10',
      riskScore: 125,
      severity: 'Severe',
      severityScore: 1,
      title: 'Vuln Title',
    });
    const context = createMockStepExecutionContext<IntegrationConfig>({
      instanceConfig,
      entities: [existingVulnerabilityEntity],
    });

    const newAssetVulnerability: InsightVmAssetVulnerability = {
      id: existingVulnerabilityEntity.id,
      instances: 1,
      links: [],
      results: [],
      since: 'since',
      status: 'status',
    };

    await expect(
      fetchVulnerability(context, newAssetVulnerability.id),
    ).resolves.toBe(existingVulnerabilityEntity);
    expect(context.jobState.collectedEntities.length).toBe(0);
  });

  test('should create vulnerability when none exists', async () => {
    const context = createMockStepExecutionContext<IntegrationConfig>({
      instanceConfig,
    });

    const newVulnerability: Vulnerability = {
      id: 'vuln-id',
      added: '2017-10-10',
      denialOfService: false,
      description: 'vuln description',
      exploits: 5,
      modified: '2017-10-10',
      published: '2017-10-10',
      riskScore: 125,
      severity: 'Severe',
      severityScore: 1,
      title: 'Vuln Title',
    };

    await expect(
      fetchVulnerability(context, newVulnerability.id),
    ).resolves.toEqual(createVulnerabilityEntity(newVulnerability));
    expect(context.jobState.collectedEntities.length).toBe(1);
    expect(context.jobState.collectedEntities[0].id).toBe('vuln-id');
  });

  test('should not fail if id is undefined', async () => {
    const context = createMockStepExecutionContext<IntegrationConfig>({
      instanceConfig,
    });

    const newAssetVulnerability: Vulnerability = {
      id: 'vuln-id',
      added: '2017-10-10',
      denialOfService: false,
      description: 'vuln description',
      exploits: 5,
      modified: '2017-10-10',
      published: '2017-10-10',
      riskScore: 125,
      severity: 'Severe',
      severityScore: 1,
      title: 'Vuln Title',
    };

    await expect(
      fetchVulnerability(context, newAssetVulnerability.id),
    ).resolves.toEqual(createVulnerabilityEntity(newAssetVulnerability));
    expect(context.jobState.collectedEntities.length).toBe(1);

    await expect(
      fetchVulnerability(context, newAssetVulnerability.id),
    ).resolves.toEqual(createVulnerabilityEntity(newAssetVulnerability));
    expect(context.jobState.collectedEntities.length).toBe(1);

    expect(context.jobState.collectedEntities[0].id).toBe('undefined');
  });
});
