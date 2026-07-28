import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 从当前模块向上查找本包的 package.json，读取 version。
 * 兼容源码路径（src/）与构建产物路径（dist/server/），避免硬编码导致与 npm 版本漂移。
 *
 * @returns npm package version，例如 `0.2.3`
 * @throws 找不到 `@nuwax-ai/openui-mcp` 的 package.json 时抛错
 */
export function resolveOpenUiMcpVersion(
  fromUrl: string = import.meta.url,
): string {
  let dir = dirname(fileURLToPath(fromUrl));

  for (let depth = 0; depth < 6; depth += 1) {
    try {
      const raw = readFileSync(join(dir, 'package.json'), 'utf8');
      const pkg = JSON.parse(raw) as { name?: string; version?: string };
      if (
        pkg.name === '@nuwax-ai/openui-mcp' &&
        typeof pkg.version === 'string' &&
        pkg.version.length > 0
      ) {
        return pkg.version;
      }
    } catch {
      // 继续向上找
    }

    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }

  throw new Error(
    'Unable to resolve @nuwax-ai/openui-mcp version from package.json',
  );
}

/** MCP serverInfo / CLI `--version` 共用的包版本（与 package.json 保持一致） */
export const OPENUI_MCP_VERSION = resolveOpenUiMcpVersion();
