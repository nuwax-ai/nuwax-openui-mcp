import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { describe, expect, it } from 'vitest';

import { createOpenUiMcpServer } from './mcp-server.js';
import type { RenderOpenUiService } from './render-service.js';
import type { OpenUiArtifactRef } from './contracts.js';
import {
  OPENUI_SOURCE_MAX_CHARS,
  OPENUI_SOURCE_TOO_BIG_MESSAGE,
  renderOpenUiInputSchema,
} from './contracts.js';
import { RENDER_EXAMPLE_PAYLOAD } from './openui-reference.js';
import { validateOpenUiDocument } from './openui-validator.js';

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

/** 从 callTool 结果取出可读错误文案（SDK 前置校验走 content[0].text）。 */
function toolErrorText(result: {
  content?: Array<{ type: string; text?: string }>;
}): string {
  const block = result.content?.find((c) => c.type === 'text');
  return block?.text ?? '';
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
      // 可见性前提：必须拿到 render 工具结果；禁止幻觉已打开；sidecar 需 autoOpen。
      expect(instructions).toMatch(/Anti-hallucination|NEVER claim/i);
      expect(instructions).toMatch(/NO separate validate tool/i);
      expect(instructions).not.toContain('nuwax_validate_openui');
      expect(instructions).toContain('autoOpen');
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
      // delivery 指引：sidecar + autoOpen；无独立 validate 工具。
      expect(description).toContain('autoOpen');
      expect(description).toMatch(/sidecar/i);
      expect(description).not.toContain('nuwax_validate_openui');
      expect(description).toMatch(/MUST call it|ONLY tool that publishes/i);
      expect(description).toMatch(/NEVER tell the user|planning.*NOT enough/i);
      // 嵌入的完整 payload 示例以 inline 为默认锚点；sidecar 仅在文案中说明。
      expect(description).toContain('"mode":"inline"');
      expect(description).toContain('"mode":"sidecar"');
      expect(description).toContain('"autoOpen":true');
      // 紧凑 authoring 指引：禁对齐空格填充。
      expect(description).toMatch(/no space\/tab padding|padding/i);
      // 没有 render 工具结果 = 用户看不到 UI。
      expect(description).toMatch(/sees NO UI|ONLY after a successful/i);
    } finally {
      await close();
    }
  });

  it('does not register nuwax_validate_openui (removed in 0.3.5)', async () => {
    const { client, close } = await createConnectedPair();
    try {
      const { tools } = await client.listTools();
      expect(
        tools.find((t) => t.name === 'nuwax_validate_openui'),
      ).toBeUndefined();
      expect(tools.map((t) => t.name)).toEqual(
        expect.arrayContaining([
          'nuwax_render_openui',
          'nuwax_get_openui_reference',
          'nuwax_get_openui_update_guide',
        ]),
      );
    } finally {
      await close();
    }
  });

  it('surfaces the padding-root-cause message when source exceeds the limit via render', async () => {
    const { client, close } = await createConnectedPair();
    try {
      const oversized = 'x'.repeat(OPENUI_SOURCE_MAX_CHARS + 1);

      const renderResult = await client.callTool({
        name: 'nuwax_render_openui',
        arguments: {
          ...RENDER_EXAMPLE_PAYLOAD,
          document: {
            ...RENDER_EXAMPLE_PAYLOAD.document,
            source: oversized,
          },
        },
      });
      expect(renderResult.isError).toBe(true);
      const renderText = toolErrorText(renderResult);
      expect(renderText).toContain(OPENUI_SOURCE_TOO_BIG_MESSAGE);
      expect(renderText).toMatch(/alignment|padding/i);
      expect(renderText).toContain('nuwax_render_openui');
    } finally {
      await close();
    }
  });
});

describe('RENDER_EXAMPLE_PAYLOAD', () => {
  it('is a complete, schema-valid render input with a validator-passing source', () => {
    const parsed = renderOpenUiInputSchema.parse(RENDER_EXAMPLE_PAYLOAD);
    expect(parsed.presentation.mode).toBe('inline');
    expect(parsed.presentation.autoOpen).toBe(false);
    expect(() =>
      validateOpenUiDocument(RENDER_EXAMPLE_PAYLOAD.document.source),
    ).not.toThrow();
    // 紧凑性护栏：source 不得含对齐用的连续空格/制表符填充。
    expect(RENDER_EXAMPLE_PAYLOAD.document.source).not.toMatch(/ {2,}|\t/);
    expect(RENDER_EXAMPLE_PAYLOAD.document.source.length).toBeLessThan(2000);
  });
});
