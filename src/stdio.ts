#!/usr/bin/env node
import 'dotenv/config';

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { loadConfig } from './config.js';
import { closeHttpServer, startHttpServer } from './http-server.js';
import { createOpenUiMcpServer } from './mcp-server.js';
import { createRuntime } from './runtime.js';

const config = loadConfig();
const runtime = createRuntime(config);
const sidecarServer = config.sidecarServerEnabled
  ? await startHttpServer({ config, runtime })
  : null;
const { renderService } = runtime;
const server = createOpenUiMcpServer(renderService);
const transport = new StdioServerTransport();

await server.connect(transport);

async function shutdown(): Promise<void> {
  await server.close();
  if (sidecarServer) await closeHttpServer(sidecarServer);
}

process.on('SIGINT', () => {
  void shutdown().finally(() => process.exit(0));
});
process.on('SIGTERM', () => {
  void shutdown().finally(() => process.exit(0));
});
