/**
 * MCP 工具名（可按需带版本后缀）。依赖 `version.ts`（读 package.json / env），
 * 仅供 Node 侧 MCP server / CLI 使用。浏览器 Host 请只 import `/contracts`，
 * 不要经本模块间接拉入 `node:fs`。
 */
import {
  OPENUI_REFERENCE_TOOL_BASE_NAME,
  OPENUI_RENDER_TOOL_BASE_NAME,
  OPENUI_UPDATE_GUIDE_TOOL_BASE_NAME,
  OPENUI_VALIDATE_TOOL_BASE_NAME,
} from './contracts.js';
import { OPENUI_MCP_VERSION_SUFFIX } from './version.js';

/**
 * 注册用工具名 = 基名 + 可选版本后缀。
 *
 * - 默认（`NUWAX_OPENUI_TOOL_VERSION_SUFFIX` 关闭）：等于基名，例如
 *   `nuwax_render_openui`，客户端工具列表稳定、不随发版改名。
 * - 开启后缀时：如 `nuwax_render_openui_v0_3_12`，在工具列表直接露出版本指纹。
 *
 * 资源 / prompt 名称不带后缀。所有基名来自浏览器安全的 `contracts.ts`。
 */
export const OPENUI_TOOL_NAME = `${OPENUI_RENDER_TOOL_BASE_NAME}${OPENUI_MCP_VERSION_SUFFIX}`;

/**
 * @deprecated 0.3.5 起不再注册为 MCP 工具（易导致 Agent 停在 dry-run / 幻觉已渲染）。
 * 常量保留供旧文档与迁移对照；校验由 `nuwax_render_openui` 内部完成。无版本后缀。
 */
export const OPENUI_VALIDATE_TOOL_NAME = OPENUI_VALIDATE_TOOL_BASE_NAME;

export const OPENUI_REFERENCE_TOOL_NAME = `${OPENUI_REFERENCE_TOOL_BASE_NAME}${OPENUI_MCP_VERSION_SUFFIX}`;
export const OPENUI_UPDATE_GUIDE_TOOL_NAME = `${OPENUI_UPDATE_GUIDE_TOOL_BASE_NAME}${OPENUI_MCP_VERSION_SUFFIX}`;
