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

describe('fetch-asset-vulnerabilities', () => {
  test('success', async () => {
    recording = setupRapid7Recording({
      name: 'fetch-asset-vulnerabilities',
      directory: __dirname,
      options: {
        recordFailedRequests: false,
      },
    });

    const stepConfig = buildStepTestConfig(steps.FETCH_ASSET_VULNERABILITIES);
    const stepResults = await executeStepWithDependencies(stepConfig);
    expect(stepResults).toMatchStepMetadata(stepConfig);
  });
});
