import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import {
  OPENUI_AUTHORING_PROMPT_NAME,
  OPENUI_GUIDE_RESOURCE_URI,
  OPENUI_REFERENCE_TOOL_NAME,
  OPENUI_SCHEMA_RESOURCE_URI,
  OPENUI_TOOL_NAME,
  OPENUI_UPDATE_GUIDE_TOOL_NAME,
  openUiReferenceInputSchema,
  openUiUpdateGuideInputSchema,
  openUiArtifactRefSchema,
  renderOpenUiInputSchema,
} from './contracts.js';
import { OPENUI_MCP_VERSION } from './version.js';
import {
  getOpenUiDslSchema,
  getOpenUiReference,
  getOpenUiUpdateGuide,
  OPENUI_TOOL_BOUNDARY,
} from './openui-reference.js';
import { OpenUiDocumentError } from './openui-validator.js';
import { OpenUiPolicyError } from './policy.js';
import type { RenderOpenUiService } from './render-service.js';

export function createOpenUiMcpServer(
  renderService: RenderOpenUiService,
): McpServer {
  const server = new McpServer({
    name: 'nuwax-openui-mcp',
    version: OPENUI_MCP_VERSION,
  });

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
            text: `${getOpenUiReference(profile)}\n\nAfter authoring the document, call ${OPENUI_TOOL_NAME} to validate and publish it.`,
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

  server.registerTool(
    OPENUI_TOOL_NAME,
    {
      title: 'Render Nuwax OpenUI',
      description: `${OPENUI_TOOL_BOUNDARY}\nCreate or update a durable OpenUI artifact in the active project. Use this whenever the user asks to show, render, visualize, preview, or build a card, dashboard, chart, table, report, form, status panel, or other structured interface—even if they do not mention OpenUI. The tool writes data/{artifactId}.openui.json (the dedicated *.openui.json OpenUI Lang data source) and returns a lightweight reference. Reuse artifactId to update an existing UI. Do not invent bare .openui paths. OpenUI Lang is assignment-based and is NEVER XML/HTML/JSX: start with root = Stack(...), use positional arguments, and reference every defined variable (orphaned names like unused usersData are rejected). For complex UI or uncertain component signatures, call ${OPENUI_REFERENCE_TOOL_NAME} first. Before modifying an existing artifact, call ${OPENUI_UPDATE_GUIDE_TOOL_NAME}. Reactive filters must handle empty initial bindings, and dynamic pie/radial charts must guard zero totals. Use inline for compact conversation UI and sidecar only for a full page.`,
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
        return {
          content: [
            {
              type: 'text' as const,
              text:
                `OpenUI ${artifact.presentation.mode} artifact ${artifact.operation}: ${artifact.path}. ` +
                `This *.openui.json file is the OpenUI Lang data source. ` +
                `To update later, call ${OPENUI_UPDATE_GUIDE_TOOL_NAME} then reuse artifactId ${artifact.artifactId} with ${OPENUI_TOOL_NAME} (or edit the file while keeping document.digest valid).`,
            },
          ],
          structuredContent: artifact,
        };
      } catch (error) {
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
            : `\nOpenUI Lang is not XML/HTML/JSX. Call ${OPENUI_REFERENCE_TOOL_NAME} with the closest profile, then retry once using root = Stack(...) and positional arguments.`;
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
