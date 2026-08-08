import { z } from 'zod';

/**
 * 本模块可被浏览器 Host 安全 import（无 `node:*`）。
 * 实际注册的 MCP 工具名（默认=基名；可选版本后缀）见 `tool-names.ts`
 *（仅 Node / MCP server）。
 */

/** render 入参 / legacy in-memory artifact：`nuwax.openui/v1` */
export const OPENUI_SCHEMA_VERSION = 'nuwax.openui/v1' as const;
/** 落盘 `*.openui.json`：`nuwax.openui-file/v1` */
export const OPENUI_FILE_SCHEMA_VERSION = 'nuwax.openui-file/v1' as const;
/** 工具结果轻量引用：`nuwax.openui-ref/v1` */
export const OPENUI_REF_SCHEMA_VERSION = 'nuwax.openui-ref/v1' as const;

/** 与 schemaVersion 对应的 `type` 字面量（Host / 引擎判断用）。 */
export const OPENUI_ARTIFACT_TYPE = 'nuwax.openui' as const;
export const OPENUI_FILE_TYPE = 'nuwax.openui-file' as const;
export const OPENUI_REF_TYPE = 'nuwax.openui-ref' as const;

/**
 * schemaVersion 族前缀。`nuwax.openui` 会被 `-ref` / `-file` 共用前缀，
 * 判断「是否为 render 入参」时必须再排除后两者。
 */
export const OPENUI_SCHEMA_FAMILY_PREFIX = 'nuwax.openui' as const;
export const OPENUI_REF_SCHEMA_PREFIX = 'nuwax.openui-ref' as const;
export const OPENUI_FILE_SCHEMA_PREFIX = 'nuwax.openui-file' as const;

export const OPENUI_LANG_VERSION = '0.5' as const;

/**
 * 是否为 `nuwax_render_openui` 入参的 schemaVersion（如 `nuwax.openui/v1`）。
 * 排除 ref / file，避免把完成态引用或落盘文件契约当成 render 入参。
 */
export function isOpenUiRenderInputSchemaVersion(
  schemaVersion: unknown,
): schemaVersion is typeof OPENUI_SCHEMA_VERSION | string {
  if (typeof schemaVersion !== 'string') return false;
  return (
    schemaVersion.startsWith(OPENUI_SCHEMA_FAMILY_PREFIX) &&
    !schemaVersion.startsWith(OPENUI_REF_SCHEMA_PREFIX) &&
    !schemaVersion.startsWith(OPENUI_FILE_SCHEMA_PREFIX)
  );
}

/** 是否为工具结果 `nuwax.openui-ref` 的 type。 */
export function isOpenUiRefType(type: unknown): type is typeof OPENUI_REF_TYPE {
  return type === OPENUI_REF_TYPE;
}

/** 是否为落盘 `nuwax.openui-file` 的 type。 */
export function isOpenUiFileType(
  type: unknown,
): type is typeof OPENUI_FILE_TYPE {
  return type === OPENUI_FILE_TYPE;
}

/**
 * 是否为 OpenUI 相关 payload type（legacy artifact / file / ref）。
 * Host 排除 ask-question 等非 OpenUI 工具时可用。
 */
export function isOpenUiPayloadType(type: unknown): boolean {
  return (
    type === OPENUI_ARTIFACT_TYPE ||
    isOpenUiFileType(type) ||
    isOpenUiRefType(type)
  );
}

/**
 * OpenUI MCP 工具基名（稳定标识，不含版本后缀）。
 *
 * 浏览器 Host 可安全 import 这些常量（本模块无 `node:*` 依赖）。Node 侧
 * `tool-names.ts` 默认直接使用基名注册；仅当 env
 * `NUWAX_OPENUI_TOOL_VERSION_SUFFIX` 开启时才追加 `OPENUI_MCP_VERSION_SUFFIX`
 *（如 `nuwax_render_openui_v0_3_12`）。基名是唯一事实来源——Host 识别工具时
 * 一律引用此处（按 token 包含匹配即可兼容带/不带后缀），避免散落字面量。
 */
export const OPENUI_RENDER_TOOL_BASE_NAME = 'nuwax_render_openui' as const;
export const OPENUI_REFERENCE_TOOL_BASE_NAME =
  'nuwax_get_openui_reference' as const;
export const OPENUI_UPDATE_GUIDE_TOOL_BASE_NAME =
  'nuwax_get_openui_update_guide' as const;
/**
 * @deprecated 0.3.5 起不再注册为 MCP 工具（易导致 Agent 停在 dry-run / 幻觉已渲染）。
 * 基名保留供旧文档与迁移对照。
 */
export const OPENUI_VALIDATE_TOOL_BASE_NAME = 'nuwax_validate_openui' as const;

export const OPENUI_AUTHORING_PROMPT_NAME = 'nuwax_openui_authoring' as const;
export const OPENUI_SCHEMA_RESOURCE_URI = 'nuwax://openui/schema/v0.5' as const;
export const OPENUI_GUIDE_RESOURCE_URI =
  'nuwax://openui/authoring-guide/v0.5' as const;

/** OpenUI Lang `document.source` / validate `source` 字符上限。 */
export const OPENUI_SOURCE_MAX_CHARS = 100_000 as const;

/**
 * source 超限时的可操作错误文案。
 * 必须挂在 Zod `.max(..., { error })` 上：MCP SDK 在 handler 之前校验
 * inputSchema，handler 内的 catch 永远收不到 too_big。
 * 文案只提工具基名，避免本模块依赖 `tool-names` / `version`（浏览器 bundler 会炸）。
 */
export const OPENUI_SOURCE_TOO_BIG_MESSAGE =
  `OpenUI source exceeds the ${OPENUI_SOURCE_MAX_CHARS}-character limit. This is almost always caused by long runs of spaces/tabs added for visual alignment inside a string literal. Remove ALL alignment padding (write each statement as one compact line), then retry nuwax_render_openui.` as const;

export const openUiReferenceInputSchema = z.object({
  format: z
    .enum(['guide', 'schema'])
    .default('guide')
    .describe(
      'Use guide for authoring instructions, component signatures, and examples. Use schema for the complete renderer-generated JSON Schema.',
    ),
  profile: z
    .enum(['basic', 'dashboard', 'form', 'all'])
    .default('basic')
    .describe(
      'Component reference to return: basic for cards/content, dashboard for tables/charts, form for inputs/actions, all only when the other profiles are insufficient.',
    ),
});

/**
 * 更新已有 OpenUI Artifact 前的指引工具入参。
 * artifactId 可选：传入后文案会嵌入该 ID 的示例调用片段。
 */
export const openUiUpdateGuideInputSchema = z.object({
  artifactId: z
    .string()
    .uuid()
    .optional()
    .describe(
      'Optional existing artifact UUID from data/{artifactId}.openui.json or a prior nuwax.openui-ref. When set, the guide embeds this ID in the update example.',
    ),
  intent: z
    .enum(['title', 'source', 'presentation', 'general'])
    .default('general')
    .describe(
      'What the user wants to change: title for visible title only, source for OpenUI Lang body, presentation for inline/sidecar, general for any update.',
    ),
});

const bindingSchema = z.object({
  serverId: z.string().trim().min(1).max(128),
  toolName: z.string().trim().min(1).max(128),
  access: z.enum(['query', 'mutation']),
});

/**
 * @deprecated 0.3.5 起 MCP 不再暴露 validate 工具；schema 仅保留兼容导出。
 * 正式路径请直接调用 `nuwax_render_openui`（服务端会校验 source）。
 */
export const openUiValidateInputSchema = z.object({
  source: z
    .string()
    .min(1)
    .max(OPENUI_SOURCE_MAX_CHARS, { error: OPENUI_SOURCE_TOO_BIG_MESSAGE })
    .describe(
      'Deprecated. Prefer nuwax_render_openui; OpenUI Lang document.source (root = Stack(...), positional args, every non-root variable reachable from root).',
    ),
});

export const renderOpenUiInputSchema = z.object({
  artifactId: z
    .string()
    .uuid()
    .optional()
    .describe(
      'Optional stable artifact UUID. Reusing an existing ID atomically replaces data/{artifactId}.openui.json.',
    ),
  schemaVersion: z
    .literal(OPENUI_SCHEMA_VERSION)
    .describe('Always use nuwax.openui/v1.'),
  title: z.string().trim().min(1).max(160).describe('Visible UI title.'),
  presentation: z.object({
    mode: z
      .enum(['inline', 'sidecar'])
      .describe(
        'Use inline for cards, forms, tables, and compact dashboards in chat. Use sidecar when the user wants a full-screen / standalone page / "don\'t put it in the chat bubble" experience (pair with autoOpen: true).',
      ),
    preferredWidth: z.enum(['compact', 'normal', 'wide']).optional(),
    autoOpen: z
      .boolean()
      .default(false)
      .describe(
        'When true with mode "sidecar", the Host opens the full page automatically on render. Set true whenever the user asks for a full-screen / standalone page / "don\'t put it in the chat bubble" experience. Ignored for inline.',
      ),
    density: z
      .enum(['compact', 'normal'])
      .optional()
      .describe(
        'Reserved for theme density. Stored on the artifact only; the current runtime ignores it and always renders the compact theme, so there is no visual effect today. Omit for the default.',
      ),
  }),
  document: z.object({
    language: z
      .literal('openui-lang')
      .describe('Always the fixed string "openui-lang".'),
    specVersion: z
      .literal(OPENUI_LANG_VERSION)
      .describe('Always the fixed string "0.5".'),
    source: z
      .string()
      .min(1)
      .max(OPENUI_SOURCE_MAX_CHARS, { error: OPENUI_SOURCE_TOO_BIG_MESSAGE })
      .describe(
        'OpenUI Lang assignment syntax, NEVER XML/HTML/JSX. The first line must define root = Stack(...); arguments are positional. Minimal valid example: root = Stack([title])\\ntitle = TextContent("Ready", "large-heavy"). Call nuwax_get_openui_reference before authoring a complex document or whenever a signature is uncertain. Reactive filters must bypass @Filter while their $binding is empty, and dynamic pie/radial charts must show an empty state when their total is zero. Author as compact single-line statements with no space/tab alignment padding (padding is the usual cause of exceeding the 100000-char limit).',
      ),
  }),
  bindings: z
    .object({
      // Live MCP-tool data bindings (Query/Mutation) are not yet executed by the
      // runtime, so only an absent or empty tools array is accepted at render time.
      // The on-disk file schema keeps max(32) so existing artifacts still parse.
      tools: z.array(bindingSchema).max(0),
    })
    .default({ tools: [] })
    .describe(
      'Reserved placeholder for live MCP-tool data bindings (Query/Mutation). The current runtime does NOT execute tool bindings—leave tools empty.',
    ),
  // Reserved for upstream-style custom components (official defineComponent + Zod +
  // createLibrary). No runtime registration mechanism exists yet; only an absent or
  // empty array is accepted until the renderer learns to resolve them.
  customComponents: z
    .array(z.record(z.string(), z.unknown()))
    .max(0)
    .optional()
    .describe(
      'Reserved placeholder for future custom-component registration (not yet supported). Leave unset.',
    ),
  fallback: z
    .object({
      markdown: z.string().max(20_000).default(''),
    })
    .default({ markdown: '' }),
});

export const openUiArtifactSchema = z.object({
  type: z.literal(OPENUI_ARTIFACT_TYPE),
  schemaVersion: z.literal(OPENUI_SCHEMA_VERSION),
  artifactId: z.string().uuid(),
  title: z.string(),
  presentation: z.object({
    mode: z.enum(['inline', 'sidecar']),
    autoOpen: z.boolean(),
    preferredWidth: z.enum(['compact', 'normal', 'wide']).optional(),
    density: z.enum(['compact', 'normal']).optional(),
  }),
  document: z.object({
    language: z.literal('openui-lang'),
    specVersion: z.literal(OPENUI_LANG_VERSION),
    source: z.string(),
    digest: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  }),
  bindings: z.object({
    tools: z.array(bindingSchema),
  }),
  page: z
    .object({
      url: z
        .string()
        .url()
        .describe(
          'Internal local Runtime locator for a trusted Nuwax Host. Never display or recommend this URL to the user; the Host must derive the authenticated proxied page URL from its conversation context.',
        ),
      expiresAt: z.string().datetime(),
      sandboxProfile: z.literal('openui-sidecar-v1'),
    })
    .optional(),
  fallback: z.object({
    markdown: z.string(),
  }),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

export const openUiFileSchema = z.object({
  type: z.literal(OPENUI_FILE_TYPE),
  schemaVersion: z.literal(OPENUI_FILE_SCHEMA_VERSION),
  // 0.3.6 起：写入时由 render-service 填入 MCP 包版本，作为可追溯的版本指纹。
  // 设为 optional，让 0.3.6 之前落盘的旧 artifact 仍能正常加载（无此字段）。
  mcpVersion: z
    .string()
    .optional()
    .describe(
      'MCP server package version that wrote this artifact (e.g. "0.3.6"). Informational version fingerprint; not consumed by the renderer.',
    ),
  artifactId: z.string().uuid(),
  title: z.string(),
  presentation: z.object({
    mode: z.enum(['inline', 'sidecar']),
    autoOpen: z.boolean(),
    preferredWidth: z.enum(['compact', 'normal', 'wide']).optional(),
    density: z.enum(['compact', 'normal']).optional(),
  }),
  document: z.object({
    language: z.literal('openui-lang'),
    specVersion: z.literal(OPENUI_LANG_VERSION),
    source: z.string(),
    digest: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  }),
  bindings: z.object({
    tools: z.array(bindingSchema),
  }),
  fallback: z.object({
    markdown: z.string(),
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const openUiArtifactRefSchema = z.object({
  type: z.literal(OPENUI_REF_TYPE),
  schemaVersion: z.literal(OPENUI_REF_SCHEMA_VERSION),
  artifactId: z.string().uuid(),
  path: z.string().regex(/^data\/[0-9a-f-]{36}\.openui\.json$/),
  title: z.string(),
  presentation: openUiFileSchema.shape.presentation,
  digest: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  operation: z.enum(['created', 'updated']),
});

export type RenderOpenUiInput = z.infer<typeof renderOpenUiInputSchema>;
export type OpenUiReferenceInput = z.infer<typeof openUiReferenceInputSchema>;
export type OpenUiUpdateGuideInput = z.infer<
  typeof openUiUpdateGuideInputSchema
>;
export type OpenUiArtifact = z.infer<typeof openUiArtifactSchema>;
export type OpenUiFile = z.infer<typeof openUiFileSchema>;
export type OpenUiArtifactRef = z.infer<typeof openUiArtifactRefSchema>;
export type OpenUiBinding = z.infer<typeof bindingSchema>;
