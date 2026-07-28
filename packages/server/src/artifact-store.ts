import {
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

import { openUiFileSchema, type OpenUiFile } from './contracts.js';

export interface ArtifactStore {
  initialize(): Promise<void>;
  get(artifactId: string): Promise<OpenUiFile | undefined>;
  put(artifact: OpenUiFile): Promise<'created' | 'updated'>;
  delete(artifactId: string): Promise<boolean>;
}

export type ProjectRootResolver = () => Promise<string>;

const ARTIFACT_FILE_PATTERN = /^([0-9a-f-]{36})\.openui\.json$/;

export class FileArtifactStore implements ArtifactStore {
  private readonly artifacts = new Map<string, OpenUiFile>();
  private initialization: Promise<void> | undefined;

  constructor(private readonly resolveProjectRoot: ProjectRootResolver) {}

  async initialize(): Promise<void> {
    this.initialization ??= (async () => {
      const dataDir = await this.getDataDir();
      await mkdir(dataDir, { recursive: true });
      const files = await readdir(dataDir, { withFileTypes: true });
      await Promise.all(
        files.map(async (entry) => {
          if (!entry.isFile() || !ARTIFACT_FILE_PATTERN.test(entry.name))
            return;
          try {
            const value = JSON.parse(
              await readFile(path.join(dataDir, entry.name), 'utf8'),
            );
            const artifact = openUiFileSchema.parse(value);
            if (entry.name !== `${artifact.artifactId}.openui.json`) return;
            this.artifacts.set(artifact.artifactId, artifact);
          } catch (error) {
            process.stderr.write(
              `[nuwax-openui] Skipping invalid artifact ${entry.name}: ${error instanceof Error ? error.message : String(error)}\n`,
            );
          }
        }),
      );
    })();
    return this.initialization;
  }

  async get(artifactId: string): Promise<OpenUiFile | undefined> {
    await this.initialize();
    const cached = this.artifacts.get(artifactId);
    if (cached) return structuredClone(cached);
    try {
      const raw = await readFile(
        await this.getArtifactPath(artifactId),
        'utf8',
      );
      const artifact = openUiFileSchema.parse(JSON.parse(raw));
      this.artifacts.set(artifactId, artifact);
      return structuredClone(artifact);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw error;
    }
  }

  async put(artifact: OpenUiFile): Promise<'created' | 'updated'> {
    await this.initialize();
    const validated = openUiFileSchema.parse(artifact);
    const destination = await this.getArtifactPath(validated.artifactId);
    const existed = Boolean(await this.get(validated.artifactId));
    const temporary = `${destination}.${process.pid}.${randomUUID()}.tmp`;
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(temporary, `${JSON.stringify(validated, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
    });
    await rename(temporary, destination).catch(async (error) => {
      await rm(temporary, { force: true });
      throw error;
    });
    this.artifacts.set(artifact.artifactId, structuredClone(artifact));
    return existed ? 'updated' : 'created';
  }

  async delete(artifactId: string): Promise<boolean> {
    await this.initialize();
    const existed = this.artifacts.delete(artifactId);
    await rm(await this.getArtifactPath(artifactId), { force: true });
    return existed;
  }

  private async getDataDir(): Promise<string> {
    return path.join(await this.resolveProjectRoot(), 'data');
  }

  private async getArtifactPath(artifactId: string): Promise<string> {
    const parsedId = openUiFileSchema.shape.artifactId.parse(artifactId);
    return path.join(await this.getDataDir(), `${parsedId}.openui.json`);
  }
}
