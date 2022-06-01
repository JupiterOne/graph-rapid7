import {
  createIntegrationEntity,
  IntegrationStep,
  IntegrationStepExecutionContext,
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
        source: asset,
        assign: {
          _key: getAssetKey(asset.id),
          _type: entities.ASSET._type,
          _class: entities.ASSET._class,
          id: `${asset.id}`,
          name: asset.hostName || asset.ip,
          osName: asset.osFingerprint?.systemName,
          osVersion: asset.osFingerprint?.version,
          osDetails: asset.os,
          platform: getPlatform(asset),
          ipAddress: asset.ip,
          category: asset.osFingerprint?.type,
          webLink,
          numCriticalVulnerabilities: asset.vulnerabilities.critical,
          // TODO: add lastScanDate ??
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
