import { createHash, randomUUID } from 'node:crypto';

import {
  openUiArtifactSchema,
  renderOpenUiInputSchema,
  type OpenUiArtifact,
  type RenderOpenUiInput,
} from './contracts.js';
import type { ArtifactStore } from './artifact-store.js';
import { validateOpenUiDocument } from './openui-validator.js';
import { enforceOpenUiPolicy } from './policy.js';

export interface RenderServiceOptions {
  baseUrl: string;
  artifactTtlSeconds: number;
}

function createDigest(source: string): string {
  return `sha256:${createHash('sha256').update(source).digest('hex')}`;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export class RenderOpenUiService {
  constructor(
    private readonly store: ArtifactStore,
    private readonly options: RenderServiceOptions,
  ) {}

  async render(rawInput: unknown): Promise<OpenUiArtifact> {
    const input: RenderOpenUiInput = renderOpenUiInputSchema.parse(rawInput);
    enforceOpenUiPolicy(input);
    validateOpenUiDocument(input.document.source);

    const artifactId = randomUUID();
    const createdAt = new Date();
    const expiresAt = new Date(
      createdAt.getTime() + this.options.artifactTtlSeconds * 1_000,
    );

    const artifact: OpenUiArtifact = {
      type: 'nuwax.openui',
      schemaVersion: input.schemaVersion,
      artifactId,
      title: input.title,
      presentation: input.presentation,
      document: {
        ...input.document,
        digest: createDigest(input.document.source),
      },
      bindings: input.bindings,
      fallback: input.fallback,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      ...(input.presentation.mode === 'sidecar'
        ? {
            page: {
              url: `${trimTrailingSlash(this.options.baseUrl)}/openui/pages/${artifactId}`,
              expiresAt: expiresAt.toISOString(),
              sandboxProfile: 'openui-sidecar-v1' as const,
            },
          }
        : {}),
    };

    const validatedArtifact = openUiArtifactSchema.parse(artifact);
    await this.store.put(validatedArtifact);
    return validatedArtifact;
  }
}
