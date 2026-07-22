import { createHash, randomUUID } from 'node:crypto';

import {
  OPENUI_FILE_SCHEMA_VERSION,
  openUiArtifactRefSchema,
  openUiFileSchema,
  renderOpenUiInputSchema,
  type OpenUiArtifactRef,
  type OpenUiFile,
  type RenderOpenUiInput,
} from './contracts.js';
import type { ArtifactStore } from './artifact-store.js';
import { validateOpenUiDocument } from './openui-validator.js';
import { enforceOpenUiPolicy } from './policy.js';

function createDigest(source: string): string {
  return `sha256:${createHash('sha256').update(source).digest('hex')}`;
}

export class RenderOpenUiService {
  constructor(private readonly store: ArtifactStore) {}

  async render(rawInput: unknown): Promise<OpenUiArtifactRef> {
    const input: RenderOpenUiInput = renderOpenUiInputSchema.parse(rawInput);
    enforceOpenUiPolicy(input);
    validateOpenUiDocument(input.document.source);

    const artifactId = input.artifactId ?? randomUUID();
    const existing = await this.store.get(artifactId);
    const now = new Date().toISOString();

    const artifact: OpenUiFile = {
      type: 'nuwax.openui-file',
      schemaVersion: OPENUI_FILE_SCHEMA_VERSION,
      artifactId,
      title: input.title,
      presentation: input.presentation,
      document: {
        ...input.document,
        digest: createDigest(input.document.source),
      },
      bindings: input.bindings,
      fallback: input.fallback,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    const validatedArtifact = openUiFileSchema.parse(artifact);
    const operation = await this.store.put(validatedArtifact);
    return openUiArtifactRefSchema.parse({
      type: 'nuwax.openui-ref',
      schemaVersion: 'nuwax.openui-ref/v1',
      artifactId,
      path: `data/${artifactId}.openui.json`,
      title: validatedArtifact.title,
      presentation: validatedArtifact.presentation,
      digest: validatedArtifact.document.digest,
      operation,
    });
  }
}
