import {
  createIntegrationEntity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  parseTimePropertyValue,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import { entities, steps } from '../constants';
import { InsightVMAsset } from '../types';

export function getAssetKey(id: number): string {
  return `insightvm_asset:${id}`;
}

export function getPlatform(asset: InsightVMAsset): string {
  // This function might not be handling all possible cases correctly
  // and return the default value 'other' where it shouldn't.
  if (asset.osFingerprint?.family) {
    const insightFamily = asset.osFingerprint.family.toLowerCase();
    const platforms = [
      'darwin',
      'linux',
      'unix',
      'windows',
      'android',
      'ios',
      'embedded',
      'other',
    ];
    if (platforms.includes(insightFamily)) {
      return insightFamily;
    }
  }
  return 'other';
}

export async function fetchAssets({
  logger,
  instance,
  jobState,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config, logger);

  await apiClient.iterateAssets(async (asset) => {
    const webLink = asset.links.find((link) => link.rel === 'self')?.href;

    const assetEntity = createIntegrationEntity({
      entityData: {
        source: {},
        assign: {
          _key: getAssetKey(asset.id),
          _type: entities.ASSET._type,
          _class: entities.ASSET._class,
          id: `${asset.id}`,
          name: asset.hostName || asset.ip || asset.id,
          osName: asset.osFingerprint?.systemName,
          osVersion: asset.osFingerprint?.version,
          osDetails: asset.os,
          platform: getPlatform(asset),
          ipAddress: asset.ip,
          category: asset.osFingerprint?.type ?? null,
          webLink,
          numCriticalVulnerabilities: asset.vulnerabilities.critical,
          riskScore: asset.riskScore,
          make: null,
          model: null,
          serial: null,
          deviceId: `${asset.id}`,
          macAddress: asset.mac,
          lastScanDate: parseTimePropertyValue(
            asset.history[asset.history.length - 1]?.date,
          ),
          lastSeenOn: parseTimePropertyValue(
            asset.history[asset.history.length - 1]?.date,
          ),
        },
      },
    });
    await jobState.addEntity(assetEntity);
  });
}

export const assetsSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: steps.FETCH_ASSETS,
    name: 'Fetch Assets',
    entities: [entities.ASSET],
    relationships: [],
    executionHandler: fetchAssets,
  },
];
