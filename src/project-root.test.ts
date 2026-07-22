import { mkdtemp, realpath, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { createProjectRootResolver } from './project-root.js';

const directories: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'openui-root-'));
  directories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true })),
  );
});

describe('createProjectRootResolver', () => {
  it('prefers the explicitly injected project root', async () => {
    const root = await temporaryDirectory();
    const fallback = await temporaryDirectory();
    const resolve = createProjectRootResolver({
      env: { NUWAX_OPENUI_PROJECT_ROOT: root },
      cwd: fallback,
    });
    await expect(resolve()).resolves.toBe(await realpath(root));
  });

  it('uses an MCP file root before cwd', async () => {
    const root = await temporaryDirectory();
    const fallback = await temporaryDirectory();
    const resolve = createProjectRootResolver({
      env: {},
      cwd: fallback,
      listRoots: async () => [{ uri: pathToFileURL(root).href }],
    });
    await expect(resolve()).resolves.toBe(await realpath(root));
  });
});
