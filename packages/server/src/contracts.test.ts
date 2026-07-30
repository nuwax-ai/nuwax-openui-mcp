import { describe, expect, it } from 'vitest';

import { openUiFileSchema, renderOpenUiInputSchema } from './contracts.js';
import { validInlineInput } from './test/fixtures.js';

describe('renderOpenUiInputSchema', () => {
  it('accepts a valid inline document', () => {
    expect(renderOpenUiInputSchema.parse(validInlineInput)).toEqual(
      validInlineInput,
    );
  });

  it('rejects an unknown contract version', () => {
    expect(() =>
      renderOpenUiInputSchema.parse({
        ...validInlineInput,
        schemaVersion: 'nuwax.openui/v2',
      }),
    ).toThrow();
  });

  it('accepts an optional stable artifact UUID', () => {
    const artifactId = '550e8400-e29b-41d4-a716-446655440000';
    expect(
      renderOpenUiInputSchema.parse({ ...validInlineInput, artifactId })
        .artifactId,
    ).toBe(artifactId);
  });

  it('accepts the reserved presentation.density option', () => {
    const parsed = renderOpenUiInputSchema.parse({
      ...validInlineInput,
      presentation: {
        ...validInlineInput.presentation,
        density: 'compact' as const,
      },
    });
    expect(parsed.presentation.density).toBe('compact');
  });

  it('defaults presentation.density to undefined when omitted', () => {
    const parsed = renderOpenUiInputSchema.parse(validInlineInput);
    expect(parsed.presentation.density).toBeUndefined();
  });

  it('accepts an unset customComponents placeholder but rejects a non-empty one', () => {
    expect(
      renderOpenUiInputSchema.parse({
        ...validInlineInput,
        customComponents: [],
      }).customComponents,
    ).toEqual([]);
    expect(() =>
      renderOpenUiInputSchema.parse({
        ...validInlineInput,
        customComponents: [{ name: 'MyWidget' }],
      }),
    ).toThrow();
  });

  it('rejects non-empty bindings.tools at render time (unexecuted) but keeps the file schema compatible', () => {
    const binding = {
      serverId: 'srv',
      toolName: 'get_sales',
      access: 'query' as const,
    };
    // Render input: only an empty tools array is accepted today.
    expect(
      renderOpenUiInputSchema.parse(validInlineInput).bindings.tools,
    ).toEqual([]);
    expect(() =>
      renderOpenUiInputSchema.parse({
        ...validInlineInput,
        bindings: { tools: [binding] },
      }),
    ).toThrow();
    // File schema: existing artifacts that already carry bindings still parse.
    const digest = `sha256:${'a'.repeat(64)}`;
    expect(
      openUiFileSchema.parse({
        type: 'nuwax.openui-file',
        schemaVersion: 'nuwax.openui-file/v1',
        artifactId: '550e8400-e29b-41d4-a716-446655440000',
        title: validInlineInput.title,
        presentation: validInlineInput.presentation,
        document: { ...validInlineInput.document, digest },
        bindings: { tools: [binding] },
        fallback: validInlineInput.fallback,
        createdAt: '2026-07-22T00:00:00.000Z',
        updatedAt: '2026-07-22T00:00:00.000Z',
      }).bindings.tools,
    ).toHaveLength(1);
  });
});
