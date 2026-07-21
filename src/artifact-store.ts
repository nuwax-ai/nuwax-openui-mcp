import type { OpenUiArtifact } from './contracts.js';

export interface ArtifactStore {
  get(artifactId: string): Promise<OpenUiArtifact | undefined>;
  put(artifact: OpenUiArtifact): Promise<void>;
  delete(artifactId: string): Promise<boolean>;
}

export class InMemoryArtifactStore implements ArtifactStore {
  private readonly artifacts = new Map<string, OpenUiArtifact>();

  async get(artifactId: string): Promise<OpenUiArtifact | undefined> {
    const artifact = this.artifacts.get(artifactId);
    if (!artifact) return undefined;

    if (Date.parse(artifact.expiresAt) <= Date.now()) {
      this.artifacts.delete(artifactId);
      return undefined;
    }

    return structuredClone(artifact);
  }

  async put(artifact: OpenUiArtifact): Promise<void> {
    this.artifacts.set(artifact.artifactId, structuredClone(artifact));
  }

  async delete(artifactId: string): Promise<boolean> {
    return this.artifacts.delete(artifactId);
  }
}
