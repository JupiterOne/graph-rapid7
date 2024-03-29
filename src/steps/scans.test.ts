import { steps } from '../constants';
import { buildStepTestConfig } from '../../test/config';
import {
  Recording,
  executeStepWithDependencies,
} from '@jupiterone/integration-sdk-testing';
import { setupRapid7Recording } from '../../test/helpers/recording';

describe('fetch-scans', () => {
  let recording: Recording;

  afterEach(async () => {
    if (recording) {
      await recording.stop();
    }
  });

  test('success', async () => {
    recording = setupRapid7Recording({
      name: 'fetch-scans',
      directory: __dirname,
    });

    const stepConfig = buildStepTestConfig(steps.FETCH_SCANS);
    const stepResults = await executeStepWithDependencies(stepConfig);
    expect(stepResults).toMatchStepMetadata(stepConfig);
  });
});
