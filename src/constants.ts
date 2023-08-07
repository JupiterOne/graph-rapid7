import { RelationshipClass } from '@jupiterone/integration-sdk-core';

export const ACCOUNT_ENTITY_DATA_KEY = 'entity:account';

export const VULNERABILITIES_DATA = 'VULNERABILITIES_DATA';

export const steps = {
  FETCH_ACCOUNT: 'fetch-account',
  FETCH_USERS: 'fetch-users',
  FETCH_ASSETS: 'fetch-assets',
  FETCH_ASSET_USERS: 'fetch-asset-users',
  FETCH_ASSET_VULNERABILITIES: 'fetch-asset-vulnerabilities',
  FETCH_SITES: 'fetch-sites',
  FETCH_SITE_USERS: 'fetch-site-users',
  FETCH_SITE_ASSETS: 'fetch-site-assets',
  FETCH_SCANS: 'fetch-scans',
  FETCH_SCAN_ASSETS: 'fetch-scan-assets',
  FETCH_ACCOUNT_SITE_RELATIONSHIPS: 'fetch-account-site-relationships',
  FETCH_VULNERABILITIES: 'fetch-vulnerabilities',
};

export const entities = {
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
    _class: 'Assessment',
  },
  ASSET: {
    resourceName: 'Asset',
    _type: 'insightvm_asset',
    _class: 'Device',
  },
  FINDING: {
    resourceName: 'Finding',
    _type: 'insightvm_finding',
    _class: 'Finding',
  },
  VULNERABILITY: {
    resourceName: 'Vulnerability',
    _type: 'insightvm_vulnerability',
    _class: 'Vulnerability',
  },
};

export const relationships = {
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
  USER_OWNS_ASSET: {
    _type: 'insightvm_user_owns_asset',
    _class: RelationshipClass.OWNS,
    sourceType: entities.USER._type,
    targetType: entities.ASSET._type,
  },
  SITE_PERFORMED_SCAN: {
    _type: 'insightvm_site_performed_scan',
    _class: RelationshipClass.PERFORMED,
    sourceType: entities.SITE._type,
    targetType: entities.SCAN._type,
  },
  SITE_HAS_ASSET: {
    _type: 'insightvm_site_has_asset',
    _class: RelationshipClass.HAS,
    sourceType: entities.SITE._type,
    targetType: entities.ASSET._type,
  },
  SITE_HAS_USER: {
    _type: 'insightvm_site_has_user',
    _class: RelationshipClass.HAS,
    sourceType: entities.SITE._type,
    targetType: entities.USER._type,
  },
  SCAN_MONITORS_ASSET: {
    _type: 'insightvm_scan_monitors_asset',
    _class: RelationshipClass.MONITORS,
    sourceType: entities.SCAN._type,
    targetType: entities.ASSET._type,
  },
  ASSET_HAS_FINDING: {
    _type: 'insightvm_asset_has_finding',
    _class: RelationshipClass.HAS,
    sourceType: entities.ASSET._type,
    targetType: entities.FINDING._type,
  },
  FINDING_IS_VULNERABILITY: {
    _type: 'insightvm_finding_is_vulnerability',
    _class: RelationshipClass.IS,
    sourceType: entities.FINDING._type,
    targetType: entities.VULNERABILITY._type,
  },
};
