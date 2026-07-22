import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import {
  OPENUI_AUTHORING_PROMPT_NAME,
  OPENUI_GUIDE_RESOURCE_URI,
  OPENUI_REFERENCE_TOOL_NAME,
  OPENUI_SCHEMA_RESOURCE_URI,
  OPENUI_TOOL_NAME,
  openUiReferenceInputSchema,
  openUiArtifactSchema,
  renderOpenUiInputSchema,
} from './contracts.js';
import { OPENUI_MCP_VERSION } from './version.js';
import { getOpenUiDslSchema, getOpenUiReference } from './openui-reference.js';
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
    OPENUI_TOOL_NAME,
    {
      title: 'Render Nuwax OpenUI',
      description:
        'Create and publish visual UI in a Nuwax Agent conversation. Use this whenever the user asks to show, render, visualize, preview, or build a card, dashboard, chart, table, report, form, status panel, or other structured interface—even if they do not mention OpenUI. Do not use it for prose-only or code-only answers. OpenUI Lang is assignment-based and is NEVER XML/HTML/JSX: start with root = Stack(...), use positional arguments, and reference every defined variable. A minimal valid source is root = Stack([title]) followed by title = TextContent("Ready", "large-heavy"). For complex UI or uncertain component signatures, call nuwax_get_openui_reference first; never guess or search local package files. Use inline for compact conversation UI and sidecar only for a full page.',
      inputSchema: renderOpenUiInputSchema,
      outputSchema: openUiArtifactSchema,
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
                artifact.presentation.mode === 'inline'
                  ? `OpenUI inline artifact ready: ${artifact.artifactId}`
                  : `OpenUI sidecar artifact ready: ${artifact.page?.url}`,
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
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `${message}\nOpenUI Lang is not XML/HTML/JSX. Call ${OPENUI_REFERENCE_TOOL_NAME} with the closest profile, then retry once using root = Stack(...) and positional arguments.`,
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
