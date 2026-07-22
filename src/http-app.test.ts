import type { AddressInfo } from 'node:net';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { afterEach, describe, expect, it } from 'vitest';

import { InMemoryArtifactStore } from './artifact-store.js';
import type { AppConfig } from './config.js';
import {
  OPENUI_AUTHORING_PROMPT_NAME,
  OPENUI_GUIDE_RESOURCE_URI,
  OPENUI_REFERENCE_TOOL_NAME,
  OPENUI_SCHEMA_RESOURCE_URI,
  OPENUI_TOOL_NAME,
} from './contracts.js';
import { createHttpApp } from './http-app.js';
import { RenderOpenUiService } from './render-service.js';
import { validInlineInput } from './test/fixtures.js';

const closeCallbacks: Array<() => Promise<void>> = [];

afterEach(async () => {
  await Promise.all(closeCallbacks.splice(0).map((close) => close()));
});

describe('Streamable HTTP MCP', () => {
  it('initializes, lists tools, and renders an inline artifact', async () => {
    const store = new InMemoryArtifactStore();
    const renderService = new RenderOpenUiService(store, {
      baseUrl: 'http://127.0.0.1',
      artifactTtlSeconds: 3_600,
    });
    const config: AppConfig = {
      host: '127.0.0.1',
      port: 1,
      baseUrl: 'http://127.0.0.1',
      allowedHosts: ['127.0.0.1'],
      frameAncestors: ["'self'", 'https://nuwax.example.com'],
      artifactTtlSeconds: 3_600,
    };
    const app = createHttpApp({ config, store, renderService });
    const httpServer = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => httpServer.once('listening', resolve));
    closeCallbacks.push(
      () =>
        new Promise<void>((resolve, reject) =>
          httpServer.close((error) => (error ? reject(error) : resolve())),
        ),
    );

    const port = (httpServer.address() as AddressInfo).port;
    const client = new Client({ name: 'integration-test', version: '1.0.0' });
    await client.connect(
      new StreamableHTTPClientTransport(
        new URL(`http://127.0.0.1:${port}/mcp`),
      ),
    );
    closeCallbacks.push(() => client.close());

    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining([OPENUI_REFERENCE_TOOL_NAME, OPENUI_TOOL_NAME]),
    );
    const renderTool = tools.tools.find(
      (tool) => tool.name === OPENUI_TOOL_NAME,
    );
    expect(renderTool?.description).toContain(
      'even if they do not mention OpenUI',
    );
    expect(
      renderTool?.inputSchema.properties?.document.properties?.source
        .description,
    ).toContain('NEVER XML/HTML/JSX');

    const resources = await client.listResources();
    expect(resources.resources.map((resource) => resource.uri)).toEqual(
      expect.arrayContaining([
        OPENUI_SCHEMA_RESOURCE_URI,
        OPENUI_GUIDE_RESOURCE_URI,
      ]),
    );
    const schemaResource = await client.readResource({
      uri: OPENUI_SCHEMA_RESOURCE_URI,
    });
    expect(schemaResource.contents[0]).toMatchObject({
      mimeType: 'application/schema+json',
      text: expect.stringContaining('Stack'),
    });

    const prompts = await client.listPrompts();
    expect(prompts.prompts.map((prompt) => prompt.name)).toContain(
      OPENUI_AUTHORING_PROMPT_NAME,
    );
    const authoringPrompt = await client.getPrompt({
      name: OPENUI_AUTHORING_PROMPT_NAME,
      arguments: { profile: 'basic' },
    });
    expect(authoringPrompt.messages[0]?.content).toMatchObject({
      type: 'text',
      text: expect.stringContaining('root = Stack'),
    });

    const referenceResult = await client.callTool({
      name: OPENUI_REFERENCE_TOOL_NAME,
      arguments: { format: 'guide', profile: 'dashboard' },
    });
    expect(referenceResult.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'text',
          text: expect.stringContaining('PieChart('),
        }),
      ]),
    );

    const schemaToolResult = await client.callTool({
      name: OPENUI_REFERENCE_TOOL_NAME,
      arguments: { format: 'schema', profile: 'all' },
    });
    expect(schemaToolResult.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'text',
          text: expect.stringContaining('"Stack"'),
        }),
      ]),
    );

    const result = await client.callTool({
      name: OPENUI_TOOL_NAME,
      arguments: validInlineInput,
    });
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({
      type: 'nuwax.openui',
      schemaVersion: 'nuwax.openui/v1',
      presentation: { mode: 'inline' },
    });
    const inlineArtifact = result.structuredContent as { artifactId: string };
    const inlinePageResponse = await fetch(
      `http://127.0.0.1:${port}/openui/pages/${inlineArtifact.artifactId}`,
    );
    expect(inlinePageResponse.status).toBe(200);

    const invalidResult = await client.callTool({
      name: OPENUI_TOOL_NAME,
      arguments: {
        ...validInlineInput,
        document: {
          ...validInlineInput.document,
          source: '<Stack><Text>Invalid</Text></Stack>',
        },
      },
    });
    expect(invalidResult.isError).toBe(true);
    expect(invalidResult.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'text',
          text: expect.stringContaining(OPENUI_REFERENCE_TOOL_NAME),
        }),
      ]),
    );

    const sidecarResult = await client.callTool({
      name: OPENUI_TOOL_NAME,
      arguments: {
        ...validInlineInput,
        presentation: { mode: 'sidecar', autoOpen: false },
      },
    });
    const sidecarArtifact = sidecarResult.structuredContent as {
      artifactId: string;
    };
    const pageResponse = await fetch(
      `http://127.0.0.1:${port}/openui/pages/${sidecarArtifact.artifactId}`,
    );
    expect(pageResponse.status).toBe(200);
    expect(pageResponse.headers.get('x-frame-options')).toBeNull();
    expect(pageResponse.headers.get('content-security-policy')).toContain(
      "frame-ancestors 'self' https://nuwax.example.com",
    );
    const pageHtml = await pageResponse.text();
    expect(pageHtml).toContain('data-artifact-id');
    expect(pageHtml).toContain('href="../assets/sidecar.css?v=0.1.12"');
    expect(pageHtml).toContain('src="../assets/sidecar.js?v=0.1.12"');

    const desktopQueryPageResponse = await fetch(
      `http://127.0.0.1:${port}/openui/pages/${sidecarArtifact.artifactId}?transport=desktop-query`,
    );
    const desktopQueryPageHtml = await desktopQueryPageResponse.text();
    expect(desktopQueryPageHtml).toContain('href="?openui=css&v=0.1.12"');
    expect(desktopQueryPageHtml).toContain('src="?openui=js&v=0.1.12"');
  });
});
