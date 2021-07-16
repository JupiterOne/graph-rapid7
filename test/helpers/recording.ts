import {
  mutations,
  Recording,
  RecordingEntry,
  setupRecording,
  SetupRecordingInput,
} from '@jupiterone/integration-sdk-testing';

export { Recording };

export const rapid7Mutations = {
  ...mutations,
};

export function setupRapid7Recording(input: SetupRecordingInput): Recording {
  return setupRecording({
    ...input,
    mutateEntry: mutateRecordingEntry,
  });
}

function mutateRecordingEntry(entry: RecordingEntry): void {
  rapid7Mutations.unzipGzippedRecordingEntry(entry);
}
