import { testFunctions } from './vulnerabilities';
import { createMockStepExecutionContext } from '@jupiterone/integration-sdk-testing';
import { IntegrationConfig, InsightVmAssetVulnerability } from '../types';

const { findOrCreateVulnerability, createVulnerabilityEntity } = testFunctions;

const instanceConfig = {
  insightHost: process.env.INSIGHT_HOST || 'localhost:3780',
  insightClientUsername: process.env.INSIGHT_CLIENT_USERNAME || 'username',
  insightClientPassword: process.env.INSIGHT_CLIENT_PASSWORD || 'password',
};

describe('findOrCreateVulnerability', () => {
  test('should find vulnerability that has already been created', async () => {
    const existingVulnerabilityEntity = createVulnerabilityEntity({
      id: 'vuln-id',
      instances: 1,
      links: [],
      results: [],
      since: 'since',
      status: 'status',
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
      findOrCreateVulnerability(context.jobState, newAssetVulnerability),
    ).resolves.toBe(existingVulnerabilityEntity);
    expect(context.jobState.collectedEntities.length).toBe(0);
  });

  test('should create vulnerability when none exists', async () => {
    const context = createMockStepExecutionContext<IntegrationConfig>({
      instanceConfig,
    });

    const newAssetVulnerability: InsightVmAssetVulnerability = {
      id: 'vuln-id',
      instances: 1,
      links: [],
      results: [],
      since: 'since',
      status: 'status',
    };

    await expect(
      findOrCreateVulnerability(context.jobState, newAssetVulnerability),
    ).resolves.toEqual(createVulnerabilityEntity(newAssetVulnerability));
    expect(context.jobState.collectedEntities.length).toBe(1);
    expect(context.jobState.collectedEntities[0].id).toBe('vuln-id');
  });

  test('should not fail if id is undefined', async () => {
    const context = createMockStepExecutionContext<IntegrationConfig>({
      instanceConfig,
    });

    const newAssetVulnerability: InsightVmAssetVulnerability = {
      id: (undefined as unknown) as string,
      instances: 1,
      links: [],
      results: [],
      since: 'since',
      status: 'status',
    };

    await expect(
      findOrCreateVulnerability(context.jobState, newAssetVulnerability),
    ).resolves.toEqual(createVulnerabilityEntity(newAssetVulnerability));
    expect(context.jobState.collectedEntities.length).toBe(1);

    await expect(
      findOrCreateVulnerability(context.jobState, newAssetVulnerability),
    ).resolves.toEqual(createVulnerabilityEntity(newAssetVulnerability));
    expect(context.jobState.collectedEntities.length).toBe(1);

    expect(context.jobState.collectedEntities[0].id).toBe('undefined');
  });
});
