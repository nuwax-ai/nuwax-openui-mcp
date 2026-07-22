import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface McpRootProvider {
  (): Promise<Array<{ uri: string }>>;
}

async function validDirectory(candidate: string): Promise<string | undefined> {
  try {
    const resolved = await realpath(path.resolve(candidate));
    if (!(await stat(resolved)).isDirectory()) return undefined;
    return resolved;
  } catch {
    return undefined;
  }
}

function looksLikeInstalledPackage(candidate: string): boolean {
  return /node_modules[\\/]@nuwax-ai[\\/]openui-mcp(?:[\\/]|$)/.test(candidate);
}

export function createProjectRootResolver(options: {
  env?: NodeJS.ProcessEnv;
  cwd?: string;
  listRoots?: McpRootProvider;
}) {
  const env = options.env ?? process.env;
  const cwd = options.cwd ?? process.cwd();

  return async (): Promise<string> => {
    const explicit = env.NUWAX_OPENUI_PROJECT_ROOT;
    if (explicit) {
      const resolved = await validDirectory(explicit);
      if (!resolved)
        throw new Error(`Invalid NUWAX_OPENUI_PROJECT_ROOT: ${explicit}`);
      return resolved;
    }

    if (options.listRoots) {
      try {
        const roots = await options.listRoots();
        for (const root of roots) {
          if (!root.uri.startsWith('file:')) continue;
          const resolved = await validDirectory(fileURLToPath(root.uri));
          if (resolved) return resolved;
        }
      } catch {
        // Roots are optional. A session-scoped MCP normally inherits the project cwd.
      }
    }

    const resolvedCwd = await validDirectory(cwd);
    if (!resolvedCwd || looksLikeInstalledPackage(resolvedCwd)) {
      throw new Error(
        'Unable to resolve the active project directory. Run this MCP per Agent session, expose an MCP file root, or set NUWAX_OPENUI_PROJECT_ROOT.',
      );
    }
    return resolvedCwd;
  };
}
