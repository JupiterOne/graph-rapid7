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
  mac: string;
  links: Link[];
  os: string;
  type: string;
  siteId: number;
  riskScore: number;
  vulnerabilities: {
    critical: number;
    severe: number;
    moderate: number;
    exploits: number;
    malwareKits: number;
    total: number;
  };
  osFingerprint: {
    systemName: string;
    version: string;
    family: string;
    type: string;
  };
  history: {
    date: string;
    scanId: number;
    type: string;
    version: number;
  }[];
};

export type InsightVmAssetVulnerability = {
  id: string;
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

export type InsightVmVulnerability = {
  added: string;
  categories: string[];
  cves: string[];
  cvss: Cvss;
  denialOfService: boolean;
  description: Description;
  exploits: number;
  id: string;
  links: Link[];
  malwareKits: string;
  modified: string;
  pci: Pci;
  published: string;
  riskScore: number;
  severity: string;
  severityScore: number;
  title: string;
};

export interface Cvss {
  links: Link[];
  v2: CvssV2;
  v3: CvssV3;
}

export interface CvssV2 {
  accessComplexity: string;
  accessVector: string;
  authentication: string;
  availabilityImpact: string;
  confidentialityImpact: string;
  exploitScore: number;
  impactScore: number;
  integrityImpact: string;
  score: number;
  vector: string;
}

export interface CvssV3 {
  attackComplexity: string;
  attackVector: string;
  availabilityImpact: string;
  confidentialityImpact: string;
  exploitScore: number;
  impactScore: number;
  integrityImpact: string;
  privilegeRequired: string;
  scope: string;
  score: number;
  userInteraction: string;
  vector: string;
}

export interface Description {
  html: string;
  text: string;
}

export interface Pci {
  adjustedCVSSScore: number;
  adjustedSeverityScore: number;
  fail: boolean;
  specialNotes: string;
  status: string;
}

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

export type Vulnerability = {
  id: string;
  exploits?: number;
  description?: string;
  categories: string;
  severity: string;
  severityScore: number;
};

export type PageIteratee<T> = (page: T[]) => Promise<void>;
