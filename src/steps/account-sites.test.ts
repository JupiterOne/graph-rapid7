import { steps } from '../constants';
import { buildStepTestConfig } from '../../test/config';
import {
  Recording,
  executeStepWithDependencies,
} from '@jupiterone/integration-sdk-testing';
import { setupRapid7Recording } from '../../test/helpers/recording';

describe('fetch-account-sites', () => {
  let recording: Recording;

  afterEach(async () => {
    if (recording) {
      await recording.stop();
    }
  });

  test('success', async () => {
    recording = setupRapid7Recording({
      name: 'fetch-account-sites',
      directory: __dirname,
    });

    const stepConfig = buildStepTestConfig(
      steps.FETCH_ACCOUNT_SITE_RELATIONSHIPS,
    );
    const stepResults = await executeStepWithDependencies(stepConfig);
    expect(stepResults).toMatchStepMetadata(stepConfig);
  });
});
