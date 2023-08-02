import {
  createDirectRelationship,
  createIntegrationEntity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  parseTimePropertyValue,
  Relationship,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import { entities, relationships, steps } from '../constants';
import { getSiteKey } from './sites';

export function getScanKey(id: number): string {
  return `insightvm_scan:${id}`;
}

async function addPerformedRelationship(
  jobState,
  logger,
  relationship: Relationship,
) {
  if (!jobState.hasKey(relationship._key)) {
    await jobState.addRelationship(relationship);
  } else {
    logger.info({ relationship }, `Relationship already exists.  Skipping.`);
  }
}

export async function fetchScans({
  logger,
  instance,
  jobState,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config, logger);

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
            startedOn: parseTimePropertyValue(scan.startTime),
            completedOn: parseTimePropertyValue(scan.endTime),
            webLink,
          },
        },
      });

      await Promise.all([
        jobState.addEntity(scanEntity),
        addPerformedRelationship(
          jobState,
          logger,
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
    id: steps.FETCH_SCANS,
    name: 'Fetch Scans',
    entities: [entities.SCAN],
    relationships: [relationships.SITE_PERFORMED_SCAN],
    dependsOn: [steps.FETCH_SITES],
    executionHandler: fetchScans,
  },
];
