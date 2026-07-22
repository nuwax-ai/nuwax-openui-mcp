import { describe, expect, it } from 'vitest';

import { renderOpenUiInputSchema } from './contracts.js';
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
});
