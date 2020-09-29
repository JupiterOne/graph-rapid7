import { IntegrationInstanceConfig } from '@jupiterone/integration-sdk-core';

/**
 * Properties provided by the `IntegrationInstance.config`. This reflects the
 * same properties defined by `instanceConfigFields`.
 */
export interface IntegrationConfig extends IntegrationInstanceConfig {
  /**
   * The administrator account username for authentication.
   */
  insightHost: string;

  /**
   * The administrator account username for authentication.
   */
  insightClientUsername: string;

  /**
   * The administrator account password for authentication.
   */
  insightClientPassword: string;
}

export class StatusError extends Error {
  constructor(
    readonly options: {
      statusCode: number;
      statusText: string;
      message?: string;
    },
  ) {
    super(options.message);
    this.name = 'StatusError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export type Link = {
  href: string;
  rel?: string;
};

export type InsightVMAccount = {
  user: string;
  links: Link[];
  host: string;
  ip: string;
  serial: string;
  operatingSystem: string;
  superuser: boolean;
};

export type InsightVMUser = {
  id: number;
  email: string;
  enabled: boolean;
  locked: boolean;
  name: string;
  login: string;
  links: Link[];
};

export type Vulnerabilities = {
  critical: number;
  moderate: number;
  servere: number;
  total: number;
};

export type InsightVMSite = {
  id: number;
  assets: number;
  name: string;
  type: string;
  importance: string;
  lastScanTime: string;
  riskScore: number;
  scanEngine: number;
  scanTemplate: string;
  links: Link[];
  vulnerabilities: Vulnerabilities;
};

export type InsightVMScan = {
  id: number;
  siteId: number;
  engineId: number;
  engineName: string;
  assets: number;
  scanName: string;
  scanType: string;
  siteName: string;
  startTime: string;
  endTime: string;
  duration: string;
  links: Link[];
  status: string;
  vulnerabilities: Vulnerabilities;
};

export type InsightVMAsset = {
  hostName: string;
  id: number;
  ip: string;
  links: Link[];
  os: string;
  type: string;
  siteId: number;
};

export type InsightVMVulnerability = {
  id: string;
  assetId: number;
  instances: number;
  links: Link[];
  results: {
    proof: string;
    since: string;
    status: string;
  }[];
  since: string;
  status: string;
};

export type PaginatedResource<T> = {
  resources: T[];
  page: {
    number: number;
    size: number;
    totalResources: number;
    totalPages: number;
  };
  links?: Link[];
};

export type PageIteratee<T> = (page: T[]) => Promise<void>;
