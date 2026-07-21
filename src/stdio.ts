#!/usr/bin/env node
import 'dotenv/config';

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { loadConfig } from './config.js';
import { createOpenUiMcpServer } from './mcp-server.js';
import { createRuntime } from './runtime.js';

const config = loadConfig();
const { renderService } = createRuntime(config);
const server = createOpenUiMcpServer(renderService);
const transport = new StdioServerTransport();

await server.connect(transport);

process.on('SIGINT', () => {
  void server.close().finally(() => process.exit(0));
});
