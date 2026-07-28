#!/usr/bin/env node
/**
 * 把 `src/generated/` 的预生成产物拷贝到 `dist/server/generated/`。
 * `tsc` 只编译 `.ts`，不会搬运 `.json` / `.txt` 数据文件，故需显式拷贝。
 * 运行时 `src/openui-assets.ts` 通过 `<模块目录>/generated/<file>` 定位它们，
 * 编译后即落在 `dist/server/generated/`。
 */
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', 'src', 'generated');
const dest = join(here, '..', 'dist', 'server', 'generated');

if (!existsSync(src)) {
  throw new Error('Missing src/generated — run `pnpm gen:openui` first.');
}

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });

process.stdout.write(`Copied OpenUI artifacts -> ${dest}\n`);
