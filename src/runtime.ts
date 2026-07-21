import { InMemoryArtifactStore } from './artifact-store.js';
import type { AppConfig } from './config.js';
import { RenderOpenUiService } from './render-service.js';

export function createRuntime(config: AppConfig) {
  const store = new InMemoryArtifactStore();
  const renderService = new RenderOpenUiService(store, {
    baseUrl: config.baseUrl,
    artifactTtlSeconds: config.artifactTtlSeconds,
  });

  return { store, renderService };
}
