import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import {
  OPENUI_AUTHORING_PROMPT_NAME,
  OPENUI_GUIDE_RESOURCE_URI,
  OPENUI_SCHEMA_RESOURCE_URI,
  openUiReferenceInputSchema,
  openUiUpdateGuideInputSchema,
  openUiArtifactRefSchema,
  renderOpenUiInputSchema,
} from './contracts.js';
import {
  OPENUI_REFERENCE_TOOL_NAME,
  OPENUI_TOOL_NAME,
  OPENUI_UPDATE_GUIDE_TOOL_NAME,
} from './tool-names.js';
import { OPENUI_MCP_VERSION } from './version.js';
import {
  getOpenUiDslSchema,
  getOpenUiReference,
  getOpenUiUpdateGuide,
  OPENUI_SERVER_INSTRUCTIONS,
  OPENUI_TOOL_BOUNDARY,
  RENDER_AUTHORING_HINTS,
} from './openui-reference.js';
import { OpenUiDocumentError } from './openui-validator.js';
import { OpenUiPolicyError } from './policy.js';
import type { RenderOpenUiService } from './render-service.js';

export function createOpenUiMcpServer(
  renderService: RenderOpenUiService,
): McpServer {
  const server = new McpServer(
    {
      name: 'nuwax-openui-mcp',
      version: OPENUI_MCP_VERSION,
    },
    { instructions: OPENUI_SERVER_INSTRUCTIONS },
  );

  server.registerResource(
    'nuwax-openui-dsl-schema',
    OPENUI_SCHEMA_RESOURCE_URI,
    {
      title: 'Nuwax OpenUI Lang v0.5 JSON Schema',
      description:
        'Authoritative component and property schema generated from the exact OpenUI renderer library used by Nuwax.',
      mimeType: 'application/schema+json',
    },
    (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/schema+json',
          text: getOpenUiDslSchema(),
        },
      ],
    }),
  );

  server.registerResource(
    'nuwax-openui-authoring-guide',
    OPENUI_GUIDE_RESOURCE_URI,
    {
      title: 'Nuwax OpenUI Lang v0.5 Authoring Guide',
      description:
        'Syntax rules, component signatures, actions, bindings, and examples generated from the current renderer library.',
      mimeType: 'text/plain',
    },
    (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/plain',
          text: getOpenUiReference('all'),
        },
      ],
    }),
  );

  server.registerPrompt(
    OPENUI_AUTHORING_PROMPT_NAME,
    {
      title: 'Author a Nuwax OpenUI interface',
      description:
        'Load the authoritative DSL syntax, component schema, and examples before creating a Nuwax visual interface.',
      argsSchema: { profile: openUiReferenceInputSchema.shape.profile },
    },
    ({ profile }) => ({
      description: `OpenUI ${profile} authoring instructions`,
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `${getOpenUiReference(profile)}\n\nAfter authoring the document, call ${OPENUI_TOOL_NAME} to publish it. Do not claim the UI is visible until that tool returns successfully.`,
          },
        },
      ],
    }),
  );

  server.registerTool(
    OPENUI_REFERENCE_TOOL_NAME,
    {
      title: 'Get Nuwax OpenUI authoring reference',
      description:
        'Get the authoritative OpenUI Lang contract before creating a complex Nuwax UI. Use format=guide for syntax, component signatures, and examples; use format=schema for the complete renderer-generated JSON Schema. Use this instead of guessing syntax or searching local package files. Choose dashboard for tables/charts, form for inputs, basic for cards/content, and all only as a fallback.',
      inputSchema: openUiReferenceInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ format, profile }) => ({
      content: [
        {
          type: 'text' as const,
          text:
            format === 'schema'
              ? getOpenUiDslSchema()
              : getOpenUiReference(profile),
        },
      ],
    }),
  );

  server.registerTool(
    OPENUI_UPDATE_GUIDE_TOOL_NAME,
    {
      title: 'Get Nuwax OpenUI update guide',
      description:
        'How to update an existing OpenUI artifact. Call this when the user asks to modify, change title, edit, or update a *.openui.json OpenUI UI. Explains that *.openui.json is the dedicated OpenUI Lang data source, how to reuse artifactId with nuwax_render_openui (recommended), or how to edit the file directly while keeping document.digest valid.',
      inputSchema: openUiUpdateGuideInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (input) => ({
      content: [
        {
          type: 'text' as const,
          text: getOpenUiUpdateGuide(input),
        },
      ],
    }),
  );

  // 0.3.5：不再注册 nuwax_validate_openui。dry-run 易让模型停在「已校验」或
  // 幻觉「已渲染」；source 校验改由下方 render 工具内部完成。

  server.registerTool(
    OPENUI_TOOL_NAME,
    {
      title: 'Render Nuwax OpenUI',
      description: `${OPENUI_TOOL_BOUNDARY}\nCreate or update a durable OpenUI artifact in the active project. This is the ONLY tool that publishes Host UI—you MUST call it (do not only draft source in chat). Decide by intent, not by keyword: use this tool whenever the user's goal is ONE self-contained interface that presents or collects structured information—KPI cards, charts, tables, dashboards, reports, forms, status panels—regardless of wording or language and even if no chart/component type is named. Do NOT use this tool for multi-page apps or sites, games or highly interactive bespoke experiences, free-form documents, or anything that needs arbitrary JavaScript / external scripts / raw HTML—write ordinary code/files for those instead. 按意图路由：单个自包含的结构化信息界面（指标卡/图表/表格/看板/报表/表单/状态页）一律用本工具；多页应用、游戏/重交互、自由文档、或需任意 JS 的场景请直接写普通代码，不要套本工具。Never satisfy a "self-contained visual interface" intent by writing bare *.html / *.svg / image files or by using any frontend, dataviz, or charting code-generation skill (such as frontend-design or dataviz)—those outputs cannot be rendered by the Host. The tool writes data/{artifactId}.openui.json (the dedicated *.openui.json OpenUI Lang data source) and returns a lightweight reference. Reuse artifactId to update an existing UI. Do not invent bare .openui paths. OpenUI Lang is assignment-based and is NEVER XML/HTML/JSX: start with root = Stack(...), use positional arguments, and reference every defined variable (orphaned names like unused usersData are rejected). For complex UI or uncertain component signatures, call ${OPENUI_REFERENCE_TOOL_NAME} first. Before modifying an existing artifact, call ${OPENUI_UPDATE_GUIDE_TOOL_NAME}. Invalid source fails this call with actionable errors—fix and retry this tool (no separate validate step). Reactive filters must handle empty initial bindings, and dynamic pie/radial charts must guard zero totals. Use inline for compact conversation UI; use sidecar with autoOpen: true when the user wants a full-screen / standalone page / "don't put it in the chat bubble" experience.\n${RENDER_AUTHORING_HINTS}`,
      inputSchema: renderOpenUiInputSchema,
      outputSchema: openUiArtifactRefSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (input) => {
      try {
        const artifact = await renderService.render(input);
        // text 必须是可 JSON.parse 的 openui-ref：Host / Claude ACP 常从
        // content.text 解析 sidecar autoOpen；prose 无法触发全屏预览。
        // structuredContent 仍保留给能透传 MCP 结构化结果的引擎（nuwaxcode）。
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(artifact),
            },
          ],
          structuredContent: artifact,
        };
      } catch (error) {
        // source 超限文案挂在 contracts 的 Zod `.max({ error })` 上，由 MCP SDK
        // 在 handler 前校验并返回；此处只处理 renderService 抛出的其余错误。
        const message =
          error instanceof z.ZodError
            ? z.prettifyError(error)
            : error instanceof Error
              ? error.message
              : 'Unknown OpenUI validation error.';
        const orphanHint =
          error instanceof OpenUiDocumentError &&
          error.details.some((detail) => detail.includes('Orphaned statements'))
            ? ''
            : `\nOpenUI Lang is not XML/HTML/JSX. Call ${OPENUI_REFERENCE_TOOL_NAME} with the closest profile, then retry ${OPENUI_TOOL_NAME} once using root = Stack(...) and positional arguments.`;
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `${message}${orphanHint}`,
            },
          ],
          _meta:
            error instanceof OpenUiPolicyError
              ? { code: error.code }
              : { code: 'invalid-openui-document' },
        };
      }
    },
  );

  return server;
}
