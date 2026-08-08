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

/**
 * 是否在 MCP 工具名后追加版本后缀的环境变量名。
 *
 * - 默认关闭（未设置 / 空 / 非真值）→ 工具名为稳定基名，如 `nuwax_render_openui`
 * - 设为 `1` / `true` / `yes` / `on`（大小写不敏感）→ 追加 `_v0_3_x`
 *
 * 版本指纹在关闭时仍可通过 `serverInfo.version`、CLI `--version`、
 * artifact `mcpVersion` 获取；本开关只影响工具列表里的展示名。
 */
export const OPENUI_TOOL_VERSION_SUFFIX_ENV =
  'NUWAX_OPENUI_TOOL_VERSION_SUFFIX' as const;

/** 视为「开启」的 env 取值（比较前会 trim + toLowerCase）。 */
const TOOL_VERSION_SUFFIX_TRUTHY = new Set(['1', 'true', 'yes', 'on']);

/**
 * 读取 env，判断是否启用工具名版本后缀。
 * 可注入 `env` 便于单测；生产路径默认读 `process.env`。
 */
export function isOpenUiToolVersionSuffixEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const raw = env[OPENUI_TOOL_VERSION_SUFFIX_ENV];
  if (typeof raw !== 'string') {
    return false;
  }
  return TOOL_VERSION_SUFFIX_TRUTHY.has(raw.trim().toLowerCase());
}

/**
 * 解析 MCP 工具名应拼接的版本后缀。
 *
 * - 开关关闭：返回 `''`（工具名 = 基名）
 * - 开关开启：返回 `_v` + 版本号（`.` → `_`），例如 `0.3.12` → `_v0_3_12`
 *
 * MCP 工具名规范为 `^[a-zA-Z0-9_-]{1,64}$`，禁用点号，故必须做替换。
 */
export function resolveOpenUiMcpVersionSuffix(
  version: string = OPENUI_MCP_VERSION,
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (!isOpenUiToolVersionSuffixEnabled(env)) {
    return '';
  }
  return `_v${version.replace(/\./g, '_')}`;
}

/**
 * 进程启动时解析一次的工具名版本后缀。
 * 默认空字符串；仅当 `NUWAX_OPENUI_TOOL_VERSION_SUFFIX` 为真值时非空。
 * Host / MCP 配置须在进程启动前注入该 env（stdio 入口会在拉起 MCP 前加载 dotenv）。
 */
export const OPENUI_MCP_VERSION_SUFFIX = resolveOpenUiMcpVersionSuffix();
