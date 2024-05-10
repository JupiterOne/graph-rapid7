import { steps } from '../constants';
import { buildStepTestConfig } from '../../test/config';
import {
  Recording,
  executeStepWithDependencies,
} from '@jupiterone/integration-sdk-testing';
import { setupRapid7Recording } from '../../test/helpers/recording';

describe('fetch-asset-vulnerabilities', () => {
  let recording: Recording;

  afterEach(async () => {
    if (recording) {
      await recording.stop();
    }
  });

  // this is a big (in terms of amount of requests) and long running (~15min) step in the test environment
  // skip it for now
  test.skip('success', async () => {
    recording = setupRapid7Recording({
      name: 'fetch-asset-vulnerabilities',
      directory: __dirname,
    });

    const stepConfig = buildStepTestConfig(steps.FETCH_ASSET_VULNERABILITIES);
    const stepResults = await executeStepWithDependencies(stepConfig);
    expect(stepResults).toMatchStepMetadata(stepConfig);
  });
});
