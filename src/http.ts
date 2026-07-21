#!/usr/bin/env node
import 'dotenv/config';

import { loadConfig } from './config.js';
import { closeHttpServer, startHttpServer } from './http-server.js';
import { createRuntime } from './runtime.js';

const config = loadConfig();
const runtime = createRuntime(config);
const server = await startHttpServer({ config, runtime });

console.log(
  `nuwax-openui-mcp listening at ${config.baseUrl} (MCP: ${config.baseUrl}/mcp)`,
);

function shutdown(): void {
  void closeHttpServer(server).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
