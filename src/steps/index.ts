import { accountSteps } from './account';
import { accessSteps } from './access';
import { sitesSteps } from './sites';
import { scansSteps } from './scans';
import { assetsSteps } from './assets';
import { siteAssetsSteps } from './site-assets';
import { siteUsersSteps } from './site-users';
import { vulnerabilitiesSteps } from './vulnerabilities';
import { assetUsersStep } from './asset-users';
import { scanAssetsStep } from './scan-assets';
import { accountSitesRelationshipSteps } from './account-sites';

const integrationSteps = [
  ...accountSteps,
  ...accessSteps,
  ...sitesSteps,
  ...scansSteps,
  ...assetsSteps,
  ...siteAssetsSteps,
  ...siteUsersSteps,
  ...vulnerabilitiesSteps,
  ...assetUsersStep,
  ...scanAssetsStep,
  ...accountSitesRelationshipSteps,
];

export { integrationSteps };
