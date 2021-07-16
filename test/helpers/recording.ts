import {
  Recording,
  setupRecording,
  SetupRecordingInput,
  mutations,
} from '@jupiterone/integration-sdk-testing';
import { Polly } from '@pollyjs/core';
import FetchAdapter from '@pollyjs/adapter-fetch';

Polly.register(FetchAdapter);

export { Recording };

export function setupRapid7Recording(
  input: Omit<SetupRecordingInput, 'mutateEntry'>,
): Recording {
  const recording = setupRecording({
    ...input,
    mutateEntry: mutations.unzipGzippedRecordingEntry,
    options: {
      adapters: ['fetch'],
    },
  });

  return recording;
}
