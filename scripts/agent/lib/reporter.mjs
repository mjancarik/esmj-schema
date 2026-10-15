// Use Node's native spec formatting for failures, diagnostics and totals.
// Omit only successful test/suite progress, never parse formatted text.
import { Readable } from 'node:stream';
import { spec } from 'node:test/reporters';

async function* conciseEvents(source) {
  for await (const event of source) {
    if (event.type === 'test:start') continue;
    if (event.type === 'test:pass' && !event.data.skip && !event.data.todo) {
      continue;
    }
    yield event;
  }
}

export default async function* reporter(source) {
  yield* Readable.from(conciseEvents(source)).compose(new spec());
}
