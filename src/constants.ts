import {
  RelationshipClass,
  StepEntityMetadata,
  StepRelationshipMetadata,
} from '@jupiterone/integration-sdk-core';

export const ACCOUNT_ENTITY_DATA_KEY = 'entity:account';

type EntityConstantKeys =
  | 'ACCOUNT'
  | 'USER'
  | 'SITE'
  | 'SCAN'
  | 'ASSET'
  | 'VULNERABILITY';

export const entities: Record<EntityConstantKeys, StepEntityMetadata> = {
  ACCOUNT: {
    resourceName: 'Account',
    _type: 'insightvm_account',
    _class: 'Account',
  },
  USER: {
    resourceName: 'User',
    _type: 'insightvm_user',
    _class: 'User',
  },
  SITE: {
    resourceName: 'Site',
    _type: 'insightvm_site',
    _class: 'Site',
  },
  SCAN: {
    resourceName: 'Scan',
    _type: 'insightvm_scan',
    _class: 'Process',
  },
  ASSET: {
    resourceName: 'Asset',
    _type: 'insightvm_asset',
    _class: 'Device',
  },
  VULNERABILITY: {
    resourceName: 'Vulnerability',
    _type: 'insightvm_vulnerability',
    _class: 'Vulnerability',
  },
};

type RelationshipConstantKeys =
  | 'ACCOUNT_HAS_USER'
  | 'ACCOUNT_HAS_SITE'
  | 'ACCOUNT_HAS_ASSET'
  | 'SITE_HAS_SCAN'
  | 'SITE_HAS_ASSET'
  | 'SITE_ALLOWS_USER'
  | 'VULNERABILITY_EXPLOITS_ASSET';

export const relationships: Record<
  RelationshipConstantKeys,
  StepRelationshipMetadata
> = {
  ACCOUNT_HAS_USER: {
    _type: 'insightvm_account_has_user',
    _class: RelationshipClass.HAS,
    sourceType: entities.ACCOUNT._type,
    targetType: entities.USER._type,
  },
  ACCOUNT_HAS_SITE: {
    _type: 'insightvm_account_has_site',
    _class: RelationshipClass.HAS,
    sourceType: entities.ACCOUNT._type,
    targetType: entities.SITE._type,
  },
  ACCOUNT_HAS_ASSET: {
    _type: 'insightvm_account_has_asset',
    _class: RelationshipClass.HAS,
    sourceType: entities.ACCOUNT._type,
    targetType: entities.ASSET._type,
  },
  SITE_HAS_SCAN: {
    _type: 'insightvm_site_has_scan',
    _class: RelationshipClass.HAS,
    sourceType: entities.SITE._type,
    targetType: entities.SCAN._type,
  },
  SITE_HAS_ASSET: {
    _type: 'insightvm_site_has_asset',
    _class: RelationshipClass.HAS,
    sourceType: entities.SITE._type,
    targetType: entities.ASSET._type,
  },
  SITE_ALLOWS_USER: {
    _type: 'insightvm_site_allows_user',
    _class: RelationshipClass.ALLOWS,
    sourceType: entities.SITE._type,
    targetType: entities.USER._type,
  },
  VULNERABILITY_EXPLOITS_ASSET: {
    _type: 'insightvm_vulnerability_exploits_asset',
    _class: RelationshipClass.ALLOWS,
    sourceType: entities.VULNERABILITY._type,
    targetType: entities.ASSET._type,
  },
};
