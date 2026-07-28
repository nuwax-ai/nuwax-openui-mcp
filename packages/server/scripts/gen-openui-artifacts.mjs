#!/usr/bin/env node
/**
 * 构建期预生成 OpenUI 静态产物。
 *
 * MCP server 运行时不再 import `@openuidev/react-ui/genui-lib`（那会把 react-dom、
 * recharts、react-syntax-highlighter 等 ~20MB 的渲染栈拉进 stdio 进程）。改为在
 * 构建期调用 `openuiLibrary.toJSONSchema()` / `.prompt({})` 生成静态文件，运行时
 * 直接读取。
 *
 * 产物写入 `src/generated/`（提交进仓库，保证 `pnpm test` 无需先构建）；
 * `build:server` 会再把它们拷贝到 `dist/server/generated/`。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { openuiLibrary } from '@openuidev/react-ui/genui-lib';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'src', 'generated');

// 注意：这里写的是 *未归一化* 的原始 prompt。`getOpenUiReference()` 在运行时仍会
// 调用 `normalizeGeneratedReference()` 做同样的替换，保持与历史行为完全一致。
const reference = openuiLibrary.prompt({});
const schema = JSON.stringify(openuiLibrary.toJSONSchema(), null, 2);

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'openui-reference.txt'), reference, 'utf8');
writeFileSync(join(outDir, 'openui-schema.json'), `${schema}\n`, 'utf8');

process.stdout.write(
  `Generated OpenUI artifacts -> ${outDir} ` +
    `(reference ${reference.length}b, schema ${schema.length}b)\n`,
);
