import {
  createDirectRelationship,
  IntegrationStep,
  IntegrationStepExecutionContext,
  JobState,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { IntegrationConfig, SiteAssetsMap } from '../types';
import { relationships } from '../constants';
import { getScanKey } from './scans';

async function buildSiteAssetsMap(jobState: JobState): Promise<SiteAssetsMap> {
  const siteAssetsMap: SiteAssetsMap = {};

  await jobState.iterateRelationships(
    {
      _type: relationships.SITE_HAS_ASSET._type,
    },
    (relationship) => {
      const { _fromEntityKey, _toEntityKey } = relationship;

      const siteKey = _fromEntityKey?.toString();
      const assetKey = _toEntityKey?.toString();

      if (siteKey && assetKey) {
        if (!siteAssetsMap[siteKey]) {
          siteAssetsMap[siteKey] = [];
        }

        siteAssetsMap[siteKey].push(assetKey);
      }
    },
  );

  return siteAssetsMap;
}

export async function fetchScanAssets({
  instance,
  jobState,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config);

  const siteAssetsMap = await buildSiteAssetsMap(jobState);

  const jobs: Promise<void>[] = [];

  for (const [siteKey, assetKeys] of Object.entries(siteAssetsMap)) {
    const siteEntity = await jobState.findEntity(siteKey);

    if (siteEntity && siteEntity.id) {
      await apiClient.iterateSiteScans(
        siteEntity.id as string,
        async (scan) => {
          const scanEntity = await jobState.findEntity(getScanKey(scan.id));

          if (scanEntity) {
            for (const assetKey of assetKeys) {
              const assetEntity = await jobState.findEntity(assetKey);
              if (assetEntity) {
                jobs.push(
                  jobState.addRelationship(
                    createDirectRelationship({
                      _class: RelationshipClass.MONITORS,
                      from: scanEntity,
                      to: assetEntity,
                    }),
                  ),
                );
              }
            }
          }
        },
      );
    }
  }

  await Promise.all(jobs);
}

export const scanAssetsStep: IntegrationStep<IntegrationConfig>[] = [
  {
    id: 'fetch-scan-assets',
    name: 'Fetch Scan Assets',
    entities: [],
    relationships: [relationships.SCAN_MONITORS_ASSET],
    dependsOn: ['fetch-site-assets'],
    executionHandler: fetchScanAssets,
  },
];
