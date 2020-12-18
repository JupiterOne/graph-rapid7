import { gunzipSync } from 'zlib';

import {
  Recording,
  RecordingEntry,
  setupRecording,
  SetupRecordingInput,
} from '@jupiterone/integration-sdk-testing';

export { Recording };

export function setupRapid7Recording(
  input: Omit<SetupRecordingInput, 'mutateEntry'>,
): Recording {
  return setupRecording({
    ...input,
    mutateEntry: mutations.unzipGzippedRecordingEntry,
  });
}

const mutations = {
  unzipGzippedRecordingEntry: (entry: RecordingEntry) => {
    function unzipGzippedResponseText(responseText: string) {
      const chunkBuffers: Buffer[] = [];
      const hexChunks = JSON.parse(responseText) as string[];
      hexChunks.forEach((chunk) => {
        const chunkBuffer = Buffer.from(chunk, 'hex');
        chunkBuffers.push(chunkBuffer);
      });
      return gunzipSync(Buffer.concat(chunkBuffers)).toString('utf-8');
    }

    let responseText = entry.response.content.text;
    if (!responseText) {
      return;
    }

    const contentEncoding = entry.response.headers.find(
      (e) => e.name === 'content-encoding',
    );
    const transferEncoding = entry.response.headers.find(
      (e) => e.name === 'transfer-encoding',
    );

    if (contentEncoding && contentEncoding.value === 'gzip') {
      responseText = unzipGzippedResponseText(responseText);

      // Remove encoding/chunking since content is now unzipped
      entry.response.headers = entry.response.headers.filter(
        (e) => e && e !== contentEncoding && e !== transferEncoding,
      );
      // Remove recording binary marker
      delete (entry.response.content as any)._isBinary;
      entry.response.content.text = responseText;
    }
  },
};
