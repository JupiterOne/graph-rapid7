import {
  createDirectRelationship,
  createIntegrationEntity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
  getTime,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { IntegrationConfig } from '../types';
import { entities, relationships } from '../constants';
import { getSiteKey } from './sites';

export function getScanKey(id: number): string {
  return `insightvm_scan:${id}`;
}

export async function fetchScans({
  instance,
  jobState,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config);

  await apiClient.iterateScans(async (scan) => {
    const webLink = scan.links.find((link) => link.rel === 'self')?.href;

    const siteEntity = await jobState.findEntity(getSiteKey(scan.siteId));

    if (siteEntity) {
      const scanEntity = createIntegrationEntity({
        entityData: {
          source: scan,
          assign: {
            _key: getScanKey(scan.id),
            _type: entities.SCAN._type,
            _class: entities.SCAN._class,
            id: `${scan.id}`,
            assets: scan.assets,
            siteId: scan.siteId,
            siteName: scan.siteName,
            engineId: scan.engineId,
            engineName: scan.engineName,
            name: scan.scanName,
            active: scan.status === 'finished' ? false : undefined,
            state: scan.status,
            summary: scan.scanName,
            category: 'Vulnerability Scan',
            internal: true,
            startedOn: getTime(scan.startTime),
            completedOn: getTime(scan.endTime),
            webLink,
          },
        },
      });

      await Promise.all([
        jobState.addEntity(scanEntity),
        jobState.addRelationship(
          createDirectRelationship({
            _class: RelationshipClass.PERFORMED,
            from: siteEntity,
            to: scanEntity,
          }),
        ),
      ]);
    }
  });
}

export const scansSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: 'fetch-scans',
    name: 'Fetch Scans',
    entities: [entities.SCAN],
    relationships: [relationships.SITE_PERFORMED_SCAN],
    dependsOn: ['fetch-sites'],
    executionHandler: fetchScans,
  },
];
