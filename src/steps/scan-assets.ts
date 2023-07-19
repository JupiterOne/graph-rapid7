import {
  createDirectRelationship,
  IntegrationStep,
  IntegrationStepExecutionContext,
  JobState,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import { relationships, steps } from '../constants';
import { getScanKey } from './scans';

const RELATIONSHIPS_BATCH_SIZE = 5;

async function buildSiteAssetsMap(jobState: JobState) {
  const siteAssetsMap = new Map<string, string[]>();

  await jobState.iterateRelationships(
    {
      _type: relationships.SITE_HAS_ASSET._type,
    },
    (relationship) => {
      const { _fromEntityKey, _toEntityKey } = relationship;

      const siteKey = _fromEntityKey?.toString();
      const assetKey = _toEntityKey?.toString();

      if (siteKey && assetKey) {
        if (!siteAssetsMap.has(siteKey)) {
          siteAssetsMap.set(siteKey, []);
        }

        siteAssetsMap.set(siteKey, [
          ...(siteAssetsMap.get(siteKey) as string[]),
          assetKey,
        ]);
      }
    },
  );

  return siteAssetsMap;
}

export async function fetchScanAssets({
  logger,
  instance,
  jobState,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config, logger);

  const siteAssetsMap = await buildSiteAssetsMap(jobState);

  let relationships: Parameters<typeof createDirectRelationship>[0][] = [];

  for (const [siteKey, assetKeys] of siteAssetsMap) {
    const siteEntity = await jobState.findEntity(siteKey);

    if (typeof siteEntity?.id !== 'string') {
      continue;
    }

    await apiClient.iterateSiteScans(siteEntity.id, async (scan) => {
      const scanEntity = await jobState.findEntity(getScanKey(scan.id));

      if (!scanEntity) {
        return;
      }

      for (const assetKey of assetKeys) {
        const assetEntity = await jobState.findEntity(assetKey);
        if (!assetEntity) {
          continue;
        }
        relationships.push({
          _class: RelationshipClass.MONITORS,
          from: scanEntity,
          to: assetEntity,
        });

        // batch the relationships upload
        if (relationships.length >= RELATIONSHIPS_BATCH_SIZE) {
          await jobState.addRelationships(
            relationships.map(createDirectRelationship),
          );
          relationships = [];
        }
      }
    });
  }

  // flush
  if (relationships.length) {
    await jobState.addRelationships(
      relationships.map(createDirectRelationship),
    );
  }
}

export const scanAssetsStep: IntegrationStep<IntegrationConfig>[] = [
  {
    id: steps.FETCH_SCAN_ASSETS,
    name: 'Fetch Scan Assets',
    entities: [],
    relationships: [relationships.SCAN_MONITORS_ASSET],
    dependsOn: [
      steps.FETCH_SITE_ASSETS,
      steps.FETCH_SCANS,
      steps.FETCH_SITES,
      steps.FETCH_ASSETS,
    ],
    executionHandler: fetchScanAssets,
  },
];
