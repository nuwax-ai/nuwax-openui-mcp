import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { describe, expect, it } from 'vitest';

import { createOpenUiMcpServer } from './mcp-server.js';
import type { RenderOpenUiService } from './render-service.js';
import type { OpenUiArtifactRef } from './contracts.js';

const stubRenderService = {
  async render(): Promise<OpenUiArtifactRef> {
    throw new Error('render is not exercised by these tests');
  },
} as unknown as RenderOpenUiService;

async function createConnectedPair() {
  const server = createOpenUiMcpServer(stubRenderService);
  const client = new Client({ name: 'test-client', version: '0.0.0' });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return {
    client,
    async close() {
      await Promise.all([client.close(), server.close()]);
    },
  };
}

describe('nuwax-openui-mcp routing surface', () => {
  it('sends capability-quadrant routing instructions during initialize', async () => {
    const { client, close } = await createConnectedPair();
    try {
      const instructions = client.getInstructions();
      expect(instructions).toBeTruthy();
      expect(instructions).toContain('nuwax_render_openui');
      // 首选象限：单个自包含界面（锁概念，不锁枚举词）。
      expect(instructions).toMatch(/self-contained/i);
      expect(instructions).toContain('自包含');
      // 不推荐象限：多页应用 / 网站 / 路由。
      expect(instructions).toMatch(/multi-page/i);
      expect(instructions).toContain('多页');
      // 灰区判断原则存在。
      expect(instructions).toMatch(/gray zone|灰区/i);
      // 硬性排除：禁裸 HTML / 图片图表 / 代码生成 skill（按类别，非封闭枚举）。
      expect(instructions).toContain('.html');
      expect(instructions).toMatch(/skill/);
      expect(instructions).toContain('nuwax_ask_question');
    } finally {
      await close();
    }
  });

  it('exposes nuwax_render_openui with quadrant routing and the no-HTML boundary', async () => {
    const { client, close } = await createConnectedPair();
    try {
      const { tools } = await client.listTools();
      const renderTool = tools.find((t) => t.name === 'nuwax_render_openui');
      expect(renderTool).toBeDefined();
      const description = renderTool?.description ?? '';
      // 首选象限：单个自包含界面。
      expect(description).toMatch(/self-contained/i);
      expect(description).toContain('自包含');
      // 不推荐象限：多页应用。
      expect(description).toMatch(/multi-page/i);
      expect(description).toContain('多页');
      // 与代码生成 skill / 裸 HTML 的边界（按类别排除，非封闭枚举）。
      expect(description).toMatch(/skill/);
      expect(description).toContain('*.html');
      // 既有边界不回归。
      expect(description).toContain('nuwax_ask_question');
      expect(description).toContain('*.openui.json');
    } finally {
      await close();
    }
  });
});
