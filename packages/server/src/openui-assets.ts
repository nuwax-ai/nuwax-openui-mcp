import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 运行时读取构建期预生成的 OpenUI 静态产物（schema / authoring reference）。
 *
 * 关键点：MCP server 不再在运行时 import `@openuidev/react-ui/genui-lib`，因此不会
 * 把 react-dom / recharts / react-syntax-highlighter 等渲染栈拉进 stdio 进程。
 * 这些产物由 `scripts/gen-openui-artifacts.mjs` 在构建期生成，提交进 `src/generated/`，
 * 并由 `scripts/copy-openui-artifacts.mjs` 拷贝到 `dist/server/generated/`。
 *
 * 通过 `import.meta.url` 解析 `<本模块目录>/generated/<file>`：
 * - 源码模式（tsx 直接跑 `src/`）：读到 `src/generated/...`
 * - 构建产物模式（`dist/server/`）：读到 `dist/server/generated/...`
 */
const generatedDir = join(dirname(fileURLToPath(import.meta.url)), 'generated');

let schemaTextCache: string | undefined;
let referenceCache: string | undefined;

/** 完整的 renderer 生成 JSON Schema（原始字符串，已格式化）。 */
export function readOpenUiSchemaText(): string {
  if (schemaTextCache === undefined) {
    schemaTextCache = readFileSync(
      join(generatedDir, 'openui-schema.json'),
      'utf8',
    );
  }
  return schemaTextCache;
}

/** 未归一化的原始 authoring reference；运行时由 `getOpenUiReference` 再做替换。 */
export function readOpenUiReferenceRaw(): string {
  if (referenceCache === undefined) {
    referenceCache = readFileSync(
      join(generatedDir, 'openui-reference.txt'),
      'utf8',
    );
  }
  return referenceCache;
}
