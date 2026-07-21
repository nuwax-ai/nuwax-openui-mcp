import type { RenderOpenUiInput } from './contracts.js';

const FORBIDDEN_SOURCE_PATTERNS: Array<{ code: string; pattern: RegExp }> = [
  { code: 'raw-script', pattern: /<\s*script\b/i },
  { code: 'javascript-url', pattern: /javascript\s*:/i },
  { code: 'html-data-url', pattern: /data\s*:\s*text\/html/i },
  { code: 'dynamic-import', pattern: /\bimport\s*\(/i },
  { code: 'eval', pattern: /\beval\s*\(/i },
  { code: 'function-constructor', pattern: /\bFunction\s*\(/ },
];

const MAX_LINES = 2_000;
const MAX_BINDINGS = 32;

export class OpenUiPolicyError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'OpenUiPolicyError';
  }
}

export function enforceOpenUiPolicy(input: RenderOpenUiInput): void {
  const lineCount = input.document.source.split(/\r?\n/).length;
  if (lineCount > MAX_LINES) {
    throw new OpenUiPolicyError(
      'too-many-lines',
      `OpenUI document exceeds ${MAX_LINES} lines.`,
    );
  }

  if (input.bindings.tools.length > MAX_BINDINGS) {
    throw new OpenUiPolicyError(
      'too-many-bindings',
      `OpenUI document exceeds ${MAX_BINDINGS} tool bindings.`,
    );
  }

  const duplicateBindings = new Set<string>();
  for (const binding of input.bindings.tools) {
    const key = `${binding.serverId}:${binding.toolName}`;
    if (duplicateBindings.has(key)) {
      throw new OpenUiPolicyError(
        'duplicate-binding',
        `Duplicate MCP binding: ${key}.`,
      );
    }
    duplicateBindings.add(key);
  }

  for (const forbidden of FORBIDDEN_SOURCE_PATTERNS) {
    if (forbidden.pattern.test(input.document.source)) {
      throw new OpenUiPolicyError(
        forbidden.code,
        `OpenUI document contains forbidden content: ${forbidden.code}.`,
      );
    }
  }
}
