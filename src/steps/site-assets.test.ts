import { steps } from '../constants';
import { buildStepTestConfig } from '../../test/config';
import {
  Recording,
  executeStepWithDependencies,
} from '@jupiterone/integration-sdk-testing';
import { setupRapid7Recording } from '../../test/helpers/recording';

let recording: Recording;

afterEach(async () => {
  if (recording) {
    await recording.stop();
  }
});

describe('fetch-site-assets', () => {
  test('success', async () => {
    recording = setupRapid7Recording({
      name: 'fetch-site-assets',
      directory: __dirname,
      options: {
        recordFailedRequests: false,
      },
    });

    const stepConfig = buildStepTestConfig(steps.FETCH_SITE_ASSETS);
    const stepResults = await executeStepWithDependencies(stepConfig);
    expect(stepResults).toMatchSnapshot();
  });
});
