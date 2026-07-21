import { describe, expect, it } from 'vitest';

import { InMemoryArtifactStore } from './artifact-store.js';
import { RenderOpenUiService } from './render-service.js';
import { validInlineInput } from './test/fixtures.js';

function createService() {
  const store = new InMemoryArtifactStore();
  const service = new RenderOpenUiService(store, {
    baseUrl: 'https://openui.example.com',
    artifactTtlSeconds: 3_600,
  });
  return { service, store };
}

describe('RenderOpenUiService', () => {
  it('creates an inline artifact without a page URL', async () => {
    const { service, store } = createService();
    const artifact = await service.render(validInlineInput);

    expect(artifact.presentation.mode).toBe('inline');
    expect(artifact.page).toBeUndefined();
    expect(artifact.document.digest).toMatch(/^sha256:/);
    expect(await store.get(artifact.artifactId)).toEqual(artifact);
  });

  it('creates a trusted sidecar page URL', async () => {
    const { service } = createService();
    const artifact = await service.render({
      ...validInlineInput,
      presentation: { mode: 'sidecar', autoOpen: true },
    });

    expect(artifact.page?.url).toBe(
      `https://openui.example.com/openui/pages/${artifact.artifactId}`,
    );
    expect(artifact.page?.sandboxProfile).toBe('openui-sidecar-v1');
  });
});
