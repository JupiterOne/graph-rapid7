import fetch, { Response } from 'node-fetch';
import { IntegrationProviderAuthenticationError } from '@jupiterone/integration-sdk-core';

import {
  InsightVMAccount,
  InsightVMAsset,
  InsightVMScan,
  InsightVMSite,
  InsightVMUser,
  InsightVMVulnerability,
  IntegrationConfig,
  StatusError,
  PageIteratee,
  PaginatedResource,
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

  constructor(readonly config: IntegrationConfig) {
    this.insightHost = config.insightHost;
    this.insightClientUsername = config.insightClientUsername;
    this.insightClientPassword = config.insightClientPassword;
  }

  private withBaseUri(path: string): string {
    return `https://${this.insightHost}/api/3/${path}`;
  }

  private async request(
    uri: string,
    method: 'GET' | 'HEAD' = 'GET',
  ): Promise<Response> {
    return await fetch(uri, {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${Buffer.from(
          `${this.insightClientUsername}:${this.insightClientPassword}`,
        ).toString('base64')}`,
      },
    });
  }

  private async paginatedRequest<T>(
    uri: string,
    pageIteratee: PageIteratee<T>,
  ): Promise<void> {
    let currentPage = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const response = await this.request(
        this.withBaseUri(
          `${uri}?page=${currentPage}&size=${this.paginateEntitiesPerPage}`,
        ),
        'GET',
      );
      const body: PaginatedResource<T> = await response.json();

      await pageIteratee(body.resources);

      if (!body.page || body.page.number === body.page.totalPages - 1) {
        break;
      }

      currentPage++;
    }
  }

  public async verifyAuthentication(): Promise<void> {
    try {
      const response = await this.request(this.withBaseUri('users'), 'GET');

      if (response.status !== 200) {
        throw new StatusError({
          message: 'Provider authentication failed',
          statusCode: response.status,
          statusText: response.statusText,
        });
      }
    } catch (err) {
      throw new IntegrationProviderAuthenticationError({
        cause: err,
        endpoint: `https://${this.insightHost}/api/3/users`,
        status: err.options ? err.options.statusCode : -1,
        statusText: err.options ? err.options.statusText : '',
      });
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
   * Iterates each user resource in the provider.
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
   * Iterates each user resource in the provider.
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
   * Iterates each user resource in the provider.
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
   * Iterates each user resource in the provider.
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
   * Iterates each user resource in the provider.
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
   * Iterates each user resource in the provider.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateVulnerabilities(
    assetId: string,
    iteratee: ResourceIteratee<InsightVMVulnerability>,
  ): Promise<void> {
    await this.paginatedRequest<InsightVMVulnerability>(
      `assets/${assetId}/vulnerabilities`,
      async (vulnerabilities) => {
        for (const vulnerability of vulnerabilities) {
          await iteratee(vulnerability);
        }
      },
    );
  }
}

export function createAPIClient(config: IntegrationConfig): APIClient {
  return new APIClient(config);
}
