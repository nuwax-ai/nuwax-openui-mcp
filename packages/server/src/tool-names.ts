/**
 * MCP 工具名（带版本后缀）。依赖 `version.ts`（读 package.json），仅供
 * Node 侧 MCP server / CLI 使用。浏览器 Host 请只 import `/contracts`，
 * 不要经本模块间接拉入 `node:fs`。
 */
import { OPENUI_MCP_VERSION_SUFFIX } from './version.js';

/**
 * 工具名在基名后追加版本后缀（如 `nuwax_render_openui_v0_3_8`），让 MCP 客户端
 * 直接看到版本指纹；后缀取自 package.json，版本永远联动。资源 / prompt 名称不带后缀。
 */
export const OPENUI_TOOL_NAME = `nuwax_render_openui${OPENUI_MCP_VERSION_SUFFIX}`;

/**
 * @deprecated 0.3.5 起不再注册为 MCP 工具（易导致 Agent 停在 dry-run / 幻觉已渲染）。
 * 常量保留供旧文档与迁移对照；校验由 `nuwax_render_openui` 内部完成。
 */
export const OPENUI_VALIDATE_TOOL_NAME = 'nuwax_validate_openui' as const;

export const OPENUI_REFERENCE_TOOL_NAME = `nuwax_get_openui_reference${OPENUI_MCP_VERSION_SUFFIX}`;
export const OPENUI_UPDATE_GUIDE_TOOL_NAME = `nuwax_get_openui_update_guide${OPENUI_MCP_VERSION_SUFFIX}`;
