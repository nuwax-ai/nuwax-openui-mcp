#!/usr/bin/env node
import 'dotenv/config';

import { loadConfig } from './config.js';
import { createHttpApp } from './http-app.js';
import { createRuntime } from './runtime.js';

const config = loadConfig();
const runtime = createRuntime(config);
const app = createHttpApp({ config, ...runtime });

const server = app.listen(config.port, config.host, () => {
  console.log(
    `nuwax-openui-mcp listening at ${config.baseUrl} (MCP: ${config.baseUrl}/mcp)`,
  );
});

function shutdown(): void {
  server.close((error) => {
    if (error) {
      console.error(error);
      process.exitCode = 1;
    }
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
