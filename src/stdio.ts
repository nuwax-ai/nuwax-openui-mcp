#!/usr/bin/env node
/**
 * openui-mcp / nuwax-openui-mcp 进程入口。
 *
 * - `--version` / `-V` / `version`：打印当前安装的 npm 版本后立即退出（不启动 MCP）。
 * - 无参数：以 stdio 启动 MCP Server，供 Agent 会话挂载。
 */
import { isVersionRequest } from './cli.js';
import { OPENUI_MCP_VERSION } from './version.js';

/**
 * 启动 stdio MCP。使用动态 import，避免 `--version` 场景拉起重依赖。
 */
async function startStdioMcpServer(): Promise<void> {
  await import('dotenv/config');

  const { StdioServerTransport } =
    await import('@modelcontextprotocol/sdk/server/stdio.js');
  const { createOpenUiMcpServer } = await import('./mcp-server.js');
  const { createProjectRootResolver } = await import('./project-root.js');
  const { createRuntime } = await import('./runtime.js');

  // listRoots 闭包需要引用 server；先占位再在 connect 前挂上 resolver。
  let listRootsImpl: () => Promise<Array<{ uri: string }>> = async () => [];

  const resolveProjectRoot = createProjectRootResolver({
    listRoots: async () => listRootsImpl(),
  });
  const runtime = createRuntime(resolveProjectRoot);
  const { renderService } = runtime;
  const server = createOpenUiMcpServer(renderService);

  listRootsImpl = async () => {
    const result = await server.server.listRoots();
    return result.roots;
  };

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
}

async function main(): Promise<void> {
  if (isVersionRequest(process.argv.slice(2))) {
    // 只输出版本号，方便脚本解析（例如：npx -y @nuwax-ai/openui-mcp@latest --version）
    process.stdout.write(`${OPENUI_MCP_VERSION}\n`);
    return;
  }

  await startStdioMcpServer();
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
