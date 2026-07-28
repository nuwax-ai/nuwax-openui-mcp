import { describe, expect, it } from 'vitest';

import { renderOpenUiInputSchema } from './contracts.js';
import { enforceOpenUiPolicy, OpenUiPolicyError } from './policy.js';
import { validInlineInput } from './test/fixtures.js';

describe('enforceOpenUiPolicy', () => {
  it('accepts a declarative OpenUI document', () => {
    expect(() =>
      enforceOpenUiPolicy(renderOpenUiInputSchema.parse(validInlineInput)),
    ).not.toThrow();
  });

  it('rejects script content', () => {
    const input = renderOpenUiInputSchema.parse({
      ...validInlineInput,
      document: {
        ...validInlineInput.document,
        source: 'root = Text("<script>alert(1)</script>")',
      },
    });

    expect(() => enforceOpenUiPolicy(input)).toThrow(OpenUiPolicyError);
  });

  it('rejects duplicate MCP bindings', () => {
    const binding = {
      serverId: 'analytics',
      toolName: 'query',
      access: 'query' as const,
    };
    const input = renderOpenUiInputSchema.parse({
      ...validInlineInput,
      bindings: { tools: [binding, binding] },
    });

    expect(() => enforceOpenUiPolicy(input)).toThrow('Duplicate MCP binding');
  });
});
