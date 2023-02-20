import fetch, { Response } from 'node-fetch';

import {
  IntegrationLogger,
  IntegrationProviderAPIError,
  IntegrationValidationError,
} from '@jupiterone/integration-sdk-core';

import { IntegrationConfig } from './config';
import {
  InsightVMAccount,
  InsightVMAsset,
  InsightVmAssetVulnerability,
  InsightVMScan,
  InsightVMSite,
  InsightVMUser,
  PageIteratee,
  PaginatedResource,
  Vulnerability,
} from './types';

export type ResourceIteratee<T> = (each: T) => Promise<void> | void;

/**
 * An APIClient maintains authentication state and provides an interface to
 * third party data APIs.
 *
 * It is recommended that integrations wrap provider data APIs to provide a
 * place to handle error responses and implement common patterns for iterating
 * resources.
 */
export class APIClient {
  private readonly insightHost: string;
  private readonly insightClientUsername: string;
  private readonly insightClientPassword: string;
  private readonly paginateEntitiesPerPage = 10;
  private readonly logger: IntegrationLogger;

  constructor(readonly config: IntegrationConfig, logger: IntegrationLogger) {
    this.insightHost = config.insightHost;
    this.insightClientUsername = config.insightClientUsername;
    this.insightClientPassword = config.insightClientPassword;
    this.logger = logger;
  }

  private withBaseUri(path: string): string {
    return `https://${this.insightHost}/api/3/${path}`;
  }

  private async request(
    uri: string,
    method: 'GET' | 'HEAD' = 'GET',
  ): Promise<Response> {
    const response = await fetch(uri, {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${Buffer.from(
          `${this.insightClientUsername}:${this.insightClientPassword}`,
        ).toString('base64')}`,
      },
    });
    if (!response.ok) {
      throw new IntegrationProviderAPIError({
        endpoint: uri,
        status: response.status,
        statusText: response.statusText,
      });
    }
    return response;
  }

  private async paginatedRequest<T>(
    uri: string,
    pageIteratee: PageIteratee<T>,
  ): Promise<void> {
    let currentPage = 0;
    let body: PaginatedResource<T>;

    do {
      const endpoint = this.withBaseUri(
        `${uri}?page=${currentPage}&size=${this.paginateEntitiesPerPage}`,
      );
      this.logger.debug(
        {
          endpoint,
        },
        'Calling API endpoint.',
      );
      const response = await this.request(endpoint, 'GET');
      body = await response.json();

      await pageIteratee(body.resources);

      currentPage++;
    } while (body.page?.totalPages && currentPage < body.page.totalPages);
  }

  public async verifyAuthentication(): Promise<void> {
    const rootApiRoute = `https://${this.insightHost}/api/3`;
    try {
      await this.request(rootApiRoute, 'GET');
    } catch (err) {
      let errMessage = `Error occurred validating invocation at ${rootApiRoute} (code=${err.code}, message=${err.message})`;
      if (err.code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
        errMessage =
          `The InsightVM Security Console is using a self-signed certificate. \
Please follow the Rapid7 guidelines to install a valid TLS certificate: \
https://docs.rapid7.com/insightvm/managing-the-security-console/#managing-the-https-certificate. \
We recommend installing a certificate from https://letsencrypt.org/ or a certificate \
authority you trust. ` + errMessage;
      }
      throw new IntegrationValidationError(errMessage);
    }
  }

  public async getAccount(): Promise<InsightVMAccount> {
    const response = await this.request(
      this.withBaseUri('administration/info'),
    );
    return response.json();
  }

  /**
   * Iterates each user resource in the provider.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateUsers(
    iteratee: ResourceIteratee<InsightVMUser>,
  ): Promise<void> {
    await this.paginatedRequest<InsightVMUser>('users', async (users) => {
      for (const user of users) {
        await iteratee(user);
      }
    });
  }

  /**
   * Iterates each site resource in the provider.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateSites(
    iteratee: ResourceIteratee<InsightVMSite>,
  ): Promise<void> {
    await this.paginatedRequest<InsightVMSite>('sites', async (sites) => {
      for (const site of sites) {
        await iteratee(site);
      }
    });
  }

  /**
   * Iterates each scan resource for a given site.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateSiteScans(
    siteId: string,
    iteratee: ResourceIteratee<InsightVMScan>,
  ): Promise<void> {
    await this.paginatedRequest<InsightVMScan>(
      `sites/${siteId}/scans`,
      async (scans) => {
        for (const scan of scans) {
          await iteratee(scan);
        }
      },
    );
  }

  /**
   * Iterates each scan resource in the provider.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateScans(
    iteratee: ResourceIteratee<InsightVMScan>,
  ): Promise<void> {
    await this.paginatedRequest<InsightVMScan>('scans', async (scans) => {
      for (const scan of scans) {
        await iteratee(scan);
      }
    });
  }

  /**
   * Iterates each asset resource in the provider.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateAssets(
    iteratee: ResourceIteratee<InsightVMAsset>,
  ): Promise<void> {
    await this.paginatedRequest<InsightVMAsset>('assets', async (assets) => {
      for (const asset of assets) {
        await iteratee(asset);
      }
    });
  }

  /**
   * Iterates each asset resource for a given site.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateSiteAssets(
    siteId: string,
    iteratee: ResourceIteratee<InsightVMAsset>,
  ): Promise<void> {
    await this.paginatedRequest<InsightVMAsset>(
      `sites/${siteId}/assets`,
      async (assets) => {
        for (const asset of assets) {
          await iteratee(asset);
        }
      },
    );
  }

  /**
   * Iterates each user resource for a given asset.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateAssetUsers(
    assetId: string,
    iteratee: ResourceIteratee<InsightVMUser>,
  ): Promise<void> {
    await this.paginatedRequest<InsightVMUser>(
      `assets/${assetId}/users`,
      async (users) => {
        for (const user of users) {
          await iteratee(user);
        }
      },
    );
  }

  /**
   * Iterates each user resource for a given site.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateSiteUsers(
    siteId: string,
    iteratee: ResourceIteratee<InsightVMUser>,
  ): Promise<void> {
    await this.paginatedRequest<InsightVMUser>(
      `sites/${siteId}/users`,
      async (users) => {
        for (const user of users) {
          await iteratee(user);
        }
      },
    );
  }

  /**
   * Iterates each vulnerability finding resource in the provider for an asset
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateAssetVulnerabilityFinding(
    assetId: string,
    iteratee: ResourceIteratee<InsightVmAssetVulnerability>,
  ): Promise<void> {
    await this.paginatedRequest<InsightVmAssetVulnerability>(
      `assets/${assetId}/vulnerabilities`,
      async (assetVulnerabilities) => {
        for (const vulnerability of assetVulnerabilities) {
          await iteratee(vulnerability);
        }
      },
    );
  }

  /**
   * Gets a vulnerability resource in the provider
   *
   */
  public async getVulnerability(
    vulnerabilityId: string,
  ): Promise<Vulnerability> {
    const response = await this.request(
      this.withBaseUri(`vulnerabilities/${vulnerabilityId}`),
      'GET',
    );
    return response.json();
  }

  /**
   * Gets detailed vulnerability information in the provider
   *
   */
  public async getVulnerabilityInformation(
    vulnerabilityId: string,
  ): Promise<any> {
    const exploits = await (
      await this.request(
        this.withBaseUri(`vulnerabilities/${vulnerabilityId}/exploits`),
        'GET',
      )
    ).json();
    const refs = await (
      await this.request(
        this.withBaseUri(`vulnerabilities/${vulnerabilityId}/references`),
        'GET',
      )
    ).json();
    const solutions = await (
      await this.request(
        this.withBaseUri(`vulnerabilities/${vulnerabilityId}/solutions`),
        'GET',
      )
    ).json();

    const impact =
      exploits?.page?.totalResources > 0
        ? exploits.resources.map((r) => r.title || '')
        : undefined;

    const references =
      refs?.page?.totalResources > 0
        ? refs.resources.map((r) => r.advisory?.href)
        : undefined;

    const recommendations = async () => {
      if (solutions?.links.length > 0) {
        let rec = 'Recommendation(s):';
        for (const s of solutions.links) {
          if (s.rel !== 'self') {
            const sol = await (await this.request(s.href)).json();
            rec += `\n\n${sol.summary.text}\n\nSteps:\n${sol.steps.text}`;
          }
        }
        return rec;
      }
      return;
    };

    return { impact, references, recommendations: await recommendations() };
  }
}

export function createAPIClient(
  config: IntegrationConfig,
  logger: IntegrationLogger,
): APIClient {
  return new APIClient(config, logger);
}
