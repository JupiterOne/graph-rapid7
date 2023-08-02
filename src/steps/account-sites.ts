import {
  createDirectRelationship,
  Entity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';
import { IntegrationConfig } from '../config';
import {
  ACCOUNT_ENTITY_DATA_KEY,
  entities,
  relationships,
  steps,
} from '../constants';

export async function fetchAccountSiteRelationships({
  jobState,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const accountEntity = await jobState.getData<Entity>(ACCOUNT_ENTITY_DATA_KEY);
  if (!accountEntity) return;
  await jobState.iterateEntities(
    { _type: entities.SITE._type },
    async (siteEntity) => {
      await jobState.addRelationship(
        createDirectRelationship({
          _class: RelationshipClass.HAS,
          from: accountEntity,
          to: siteEntity,
        }),
      );
    },
  );
}

export const accountSitesRelationshipSteps: IntegrationStep<
  IntegrationConfig
>[] = [
  {
    id: steps.FETCH_ACCOUNT_SITE_RELATIONSHIPS,
    name: 'Fetch Account Site relationships',
    entities: [],
    relationships: [relationships.ACCOUNT_HAS_SITE],
    dependsOn: [steps.FETCH_ACCOUNT, steps.FETCH_SITES],
    executionHandler: fetchAccountSiteRelationships,
  },
];
