import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { FileArtifactStore } from './artifact-store.js';
import { openUiFileSchema } from './contracts.js';
import { RenderOpenUiService } from './render-service.js';
import { validInlineInput } from './test/fixtures.js';

const directories: string[] = [];

async function createService() {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'nuwax-openui-'));
  directories.push(projectRoot);
  const store = new FileArtifactStore(async () => projectRoot);
  await store.initialize();
  return { service: new RenderOpenUiService(store), store, projectRoot };
}

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((dir) => rm(dir, { recursive: true })),
  );
});

describe('RenderOpenUiService', () => {
  it('creates a durable artifact file and returns a lightweight reference', async () => {
    const { service, store, projectRoot } = await createService();
    const reference = await service.render(validInlineInput);
    const stored = await store.get(reference.artifactId);
    const raw = await readFile(path.join(projectRoot, reference.path), 'utf8');

    expect(reference).toMatchObject({
      type: 'nuwax.openui-ref',
      operation: 'created',
      presentation: { mode: 'inline' },
    });
    expect(openUiFileSchema.parse(JSON.parse(raw))).toEqual(stored);
    expect(stored?.document.digest).toBe(reference.digest);
  });

  it('atomically overwrites an artifact when artifactId is reused', async () => {
    const { service, store } = await createService();
    const created = await service.render(validInlineInput);
    const before = await store.get(created.artifactId);
    const updated = await service.render({
      ...validInlineInput,
      artifactId: created.artifactId,
      title: 'Updated deployment summary',
    });
    const after = await store.get(created.artifactId);

    expect(updated.operation).toBe('updated');
    expect(after?.title).toBe('Updated deployment summary');
    expect(after?.createdAt).toBe(before?.createdAt);
  });
});
