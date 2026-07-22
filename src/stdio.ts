#!/usr/bin/env node
import 'dotenv/config';

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { createOpenUiMcpServer } from './mcp-server.js';
import { createProjectRootResolver } from './project-root.js';
import { createRuntime } from './runtime.js';

const resolveProjectRoot = createProjectRootResolver({
  listRoots: async () => {
    const result = await server.server.listRoots();
    return result.roots;
  },
});
const runtime = createRuntime(resolveProjectRoot);
const { renderService } = runtime;
const server = createOpenUiMcpServer(renderService);
const transport = new StdioServerTransport();

await server.connect(transport);

async function shutdown(): Promise<void> {
  await server.close();
}

process.on('SIGINT', () => {
  void shutdown().finally(() => process.exit(0));
});
process.on('SIGTERM', () => {
  void shutdown().finally(() => process.exit(0));
});
