import {
  IntegrationProviderAPIError,
  IntegrationProviderAuthenticationError,
  IntegrationProviderAuthorizationError,
} from '@jupiterone/integration-sdk-core';
import { Response } from 'node-fetch';

export type RateLimitErrorParams = ConstructorParameters<
  typeof IntegrationProviderAPIError
>[0] & {
  retryAfter: number;
};

export class RetryableIntegrationProviderApiError extends IntegrationProviderAPIError {
  retryable = true;
}

export class RateLimitError extends IntegrationProviderAPIError {
  constructor(options: RateLimitErrorParams) {
    super(options);
    this.retryAfter = options.retryAfter;
  }
  retryAfter: number;
  retryable = true;
}

export function retryableRequestError(
  url: string,
  response: Response,
): RetryableIntegrationProviderApiError {
  if (response.status === 429) {
    return new RateLimitError({
      status: response.status,
      statusText: response.statusText,
      endpoint: url,
      retryAfter: Number(response.headers.get('retry-after')),
    });
  }

  return new RetryableIntegrationProviderApiError({
    endpoint: url,
    status: response.status,
    statusText: response.statusText ?? response.status,
  });
}

export function fatalRequestError(
  url: string,
  response: Response,
): IntegrationProviderAPIError {
  const apiErrorOptions = {
    endpoint: url,
    status: response.status,
    statusText: response.statusText ?? response.status,
  };

  if (response.status === 401) {
    return new IntegrationProviderAuthenticationError(apiErrorOptions);
  } else if (response.status === 403) {
    return new IntegrationProviderAuthorizationError(apiErrorOptions);
  } else {
    return new IntegrationProviderAPIError(apiErrorOptions);
  }
}
