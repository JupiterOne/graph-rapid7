import {
  createIntegrationEntity,
  IntegrationStep,
  IntegrationStepExecutionContext,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import { entities, steps } from '../constants';

export function getAssetKey(id: number): string {
  return `insightvm_asset:${id}`;
}

export async function fetchAssets({
  logger,
  instance,
  jobState,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config, logger);

  await apiClient.iterateAssets(async (asset) => {
    const webLink = asset.links.find((link) => link.rel === 'self')?.href;

    if (asset.hostName != undefined) {
      const assetEntity = createIntegrationEntity({
        entityData: {
          source: asset,
          assign: {
            _key: getAssetKey(asset.id),
            _type: entities.ASSET._type,
            _class: entities.ASSET._class,
            id: `${asset.id}`,
            name: asset.hostName,
            osName: asset.os, // in our case r7 does not always correctly identify the OS
            ipAddress: asset.ip,
            category: 'server',
            make: 'unknown',
            model: 'unknown',
            serial: 'unknown',
            webLink,
            criticalVulnerabilities: asset.vulnerabilities.critical,
          },
        },
      });
      await jobState.addEntity(assetEntity);
    }
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
