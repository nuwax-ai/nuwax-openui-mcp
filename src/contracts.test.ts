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
});
