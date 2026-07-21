import type { AddressInfo } from 'node:net';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { afterEach, describe, expect, it } from 'vitest';

import { InMemoryArtifactStore } from './artifact-store.js';
import type { AppConfig } from './config.js';
import { OPENUI_TOOL_NAME } from './contracts.js';
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
    expect(tools.tools.map((tool) => tool.name)).toContain(OPENUI_TOOL_NAME);

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
    expect(await pageResponse.text()).toContain('data-artifact-id');
  });
});
