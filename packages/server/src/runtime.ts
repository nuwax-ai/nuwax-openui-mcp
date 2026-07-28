import {
  FileArtifactStore,
  type ProjectRootResolver,
} from './artifact-store.js';
import { RenderOpenUiService } from './render-service.js';

export function createRuntime(resolveProjectRoot: ProjectRootResolver) {
  const store = new FileArtifactStore(resolveProjectRoot);
  const renderService = new RenderOpenUiService(store);

  return { store, renderService };
}

export type OpenUiRuntime = ReturnType<typeof createRuntime>;
