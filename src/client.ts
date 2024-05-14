import fetch, { Response } from 'node-fetch';
import PQueue from 'p-queue';

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
import { retry, sleep } from '@lifeomic/attempt';
import { fatalRequestError, retryableRequestError } from './error';

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
  private readonly paginateEntitiesPerPage = 500;
  private readonly logger: IntegrationLogger;
  private readonly retryMaxAttempts: number;

  constructor(
    readonly config: IntegrationConfig,
    logger: IntegrationLogger,
    retryMaxAttempts?: number,
  ) {
    this.insightHost = config.insightHost;
    this.insightClientUsername = config.insightClientUsername;
    this.insightClientPassword = config.insightClientPassword;
    this.logger = logger;
    this.retryMaxAttempts =
      retryMaxAttempts === undefined ? 4 : retryMaxAttempts;
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
    return response;
  }

  private async retryRequest(
    url: string,
    method: 'GET' | 'HEAD' = 'GET',
  ): Promise<Response> {
    return retry(
      async () => {
        let response: Response | undefined;
        try {
          response = await this.request(url, method);
        } catch (err) {
          this.logger.info(
            { code: err.code, err, url },
            'Error sending request',
          );
          throw err;
        }

        if (response.ok) {
          return response;
        }

        if (isRetryableRequest(response)) {
          throw retryableRequestError(url, response);
        } else {
          throw fatalRequestError(url, response);
        }
      },
      {
        maxAttempts: this.retryMaxAttempts,
        delay: 5000,
        factor: 2,
        handleError: async (err, context) => {
          if (err.code === 'ECONNRESET' || err.message.includes('ECONNRESET')) {
            return;
          }

          if (!err.retryable) {
            // can't retry this? just abort
            context.abort();
            return;
          }

          if (err.status === 429) {
            const retryAfter = err.retryAfter ? err.retryAfter * 1000 : 5000;
            this.logger.info(
              { retryAfter },
              `Received a rate limit error.  Waiting before retrying.`,
            );
            await sleep(retryAfter);
          }
        },
      },
    );
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
      try {
        const response = await this.retryRequest(endpoint, 'GET');
        body = await response.json();
        await pageIteratee(body.resources);
      } catch (err) {
        if (err instanceof IntegrationProviderAPIError && err.status === 404) {
          await pageIteratee([]);
          return;
        } else {
          throw err;
        }
      }

      currentPage++;
    } while (body.page?.totalPages && currentPage < body.page.totalPages);
  }

  public async verifyAuthentication(): Promise<void> {
    const rootApiRoute = `https://${this.insightHost}/api/3`;
    try {
      const body = await this.request(rootApiRoute, 'GET');
      this.logger.info({ body }, 'Root API response');
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
    const response = await this.retryRequest(
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
    iteratee: ResourceIteratee<InsightVMAsset[]>,
  ): Promise<void> {
    await this.paginatedRequest<InsightVMAsset>(
      `sites/${siteId}/assets`,
      async (assets) => {
        await iteratee(assets);
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
    iteratee: ResourceIteratee<InsightVmAssetVulnerability[]>,
  ): Promise<void> {
    await this.paginatedRequest<InsightVmAssetVulnerability>(
      `assets/${assetId}/vulnerabilities`,
      async (assetVulnerabilities) => {
        await iteratee(assetVulnerabilities);
      },
    );
  }

  private async getVulnPages() {
    const response = await this.retryRequest(
      this.withBaseUri(
        `vulnerabilities?page=0&size=${this.paginateEntitiesPerPage}`,
      ),
    );
    const body = await response.json();
    return body.page?.totalPages as number | undefined;
  }

  public async iterateVulnerabilities(
    iteratee: (vuln: Vulnerability) => Promise<boolean>,
    {
      minimumIncludedSeverity,
    }: { minimumIncludedSeverity: 'Critical' | 'Severe' | 'Moderate' },
  ): Promise<void> {
    let stopSeverity: string | undefined = undefined;
    if (minimumIncludedSeverity === 'Critical') {
      stopSeverity = 'Severe';
    } else if (minimumIncludedSeverity === 'Severe') {
      stopSeverity = 'Moderate';
    }

    let lastGoodPage = Number.MAX_VALUE;
    const totalPages = (await this.getVulnPages()) ?? 1;
    const pq = new PQueue({ concurrency: 5 });

    for (let page = 0; page < totalPages; page++) {
      void pq.add(async () => {
        if (page > lastGoodPage) {
          return;
        }
        const response = await this.retryRequest(
          this.withBaseUri(
            `vulnerabilities?page=${page}&size=${this.paginateEntitiesPerPage}&sort=severityScore,DESC`,
          ),
        );
        const body = await response.json();
        for (const vuln of body.resources) {
          if (vuln.severity === stopSeverity) {
            this.logger.info({ page }, 'Hit stop severity');
            lastGoodPage = Math.min(page, lastGoodPage);

            return;
          }

          // if the iteratee returns false
          // it means the pagination is over and we should short cirtcut
          const result = await iteratee(vuln);
          if (result === false) {
            lastGoodPage = -1;
            return;
          }
        }
      });
    }
    await pq.onIdle();
  }

  /**
   * Gets a vulnerability resource in the provider
   *
   */
  public async getVulnerability(
    vulnerabilityId: string,
  ): Promise<Vulnerability> {
    const response = await this.retryRequest(
      this.withBaseUri(`vulnerabilities/${vulnerabilityId}`),
      'GET',
    );
    return response.json();
  }
}

/**
 * Function for determining if a request is retryable
 * based on the returned status.
 */
function isRetryableRequest({ status }: Response): boolean {
  return (
    // 5xx error from provider (their fault, might be retryable)
    // 429 === too many requests, we got rate limited so safe to try again
    status >= 500 || status === 429
  );
}

export function createAPIClient(
  config: IntegrationConfig,
  logger: IntegrationLogger,
): APIClient {
  return new APIClient(config, logger);
}
