import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import {
  OPENUI_TOOL_NAME,
  openUiArtifactSchema,
  renderOpenUiInputSchema,
} from './contracts.js';
import { OpenUiPolicyError } from './policy.js';
import type { RenderOpenUiService } from './render-service.js';

export function createOpenUiMcpServer(
  renderService: RenderOpenUiService,
): McpServer {
  const server = new McpServer({
    name: 'nuwax-openui-mcp',
    version: '0.1.0',
  });

  server.registerTool(
    OPENUI_TOOL_NAME,
    {
      title: 'Render Nuwax OpenUI',
      description:
        'Validate and publish an OpenUI Lang document for Nuwax. Use inline for compact UI inside the tool block, or sidecar for a full page opened in the Nuwax preview iframe.',
      inputSchema: renderOpenUiInputSchema,
      outputSchema: openUiArtifactSchema,
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
          content: [{ type: 'text' as const, text: message }],
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
