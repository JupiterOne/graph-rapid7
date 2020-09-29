import { IntegrationInstanceConfigFieldMap } from '@jupiterone/integration-sdk-core';

const instanceConfigFields: IntegrationInstanceConfigFieldMap = {
  insightHost: {
    type: 'string',
  },
  insightClientUsername: {
    type: 'string',
  },
  insightClientPassword: {
    type: 'string',
    mask: true,
  },
};

export default instanceConfigFields;
