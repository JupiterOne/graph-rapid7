import {
  createDirectRelationship,
  IntegrationStep,
  IntegrationStepExecutionContext,
  JobState,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import { entities, relationships, steps } from '../constants';
import { getScanKey } from './scans';
import { getSiteIdFromSiteKey } from './sites';
import pMap from 'p-map';

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
  logger.info({ size: siteAssetsMap.size }, 'Built site assets map');

  const mapper = async ([siteKey, assetKeys]: [string, string[]]) => {
    const siteId = getSiteIdFromSiteKey(siteKey);

    if (!siteId) {
      return;
    }

    await apiClient.iterateSiteScans(siteId, async (scan) => {
      const scanKey = getScanKey(scan.id);

      if (!jobState.hasKey(scanKey)) {
        return;
      }

      let relationships: Parameters<typeof createDirectRelationship>[0][] = [];
      for (const assetKey of assetKeys) {
        if (!jobState.hasKey(assetKey)) {
          continue;
        }
        relationships.push({
          _class: RelationshipClass.MONITORS,
          fromType: entities.SCAN._type,
          fromKey: scanKey,
          toType: entities.ASSET._type,
          toKey: assetKey,
        });

        // batch the relationships upload
        if (relationships.length >= RELATIONSHIPS_BATCH_SIZE) {
          await jobState.addRelationships(
            relationships.map(createDirectRelationship),
          );
          relationships = [];
        }
      }

      // flush
      if (relationships.length) {
        await jobState.addRelationships(
          relationships.map(createDirectRelationship),
        );
      }
    });
  };

  await pMap(siteAssetsMap, mapper, { concurrency: 5 });
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
