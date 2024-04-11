import { IntegrationIngestionConfigFieldMap } from '@jupiterone/integration-sdk-core';
import { IngestionSources } from './constants';

export const ingestionConfig: IntegrationIngestionConfigFieldMap = {
  [IngestionSources.USERS]: {
    title: 'Users',
    description: 'Security platform users',
  },
  [IngestionSources.ASSETS]: {
    title: 'Assets',
    description:
      'Devices, applications, or other resources monitored for security',
  },
  [IngestionSources.SITES]: {
    title: 'Sites',
    description:
      'Physical locations, network segments, or logical groupings of assets',
  },
  [IngestionSources.SCANS]: {
    title: 'Scans',
    description:
      'Vulnerability scans or other security assessments performed on assets or sites',
  },
};
