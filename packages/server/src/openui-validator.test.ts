import { describe, expect, it } from 'vitest';

import {
  OpenUiDocumentError,
  validateOpenUiDocument,
} from './openui-validator.js';
import { validInlineInput } from './test/fixtures.js';

describe('validateOpenUiDocument', () => {
  it('accepts a complete document built from registered components', () => {
    expect(() =>
      validateOpenUiDocument(validInlineInput.document.source),
    ).not.toThrow();
  });

  it('rejects unknown components', () => {
    expect(() =>
      validateOpenUiDocument(
        'root = Stack([unknown])\nunknown = ArbitraryWidget("no")',
      ),
    ).toThrow(OpenUiDocumentError);
  });

  it('requires the configured Stack root', () => {
    expect(() =>
      validateOpenUiDocument(
        'root = Card([title])\ntitle = TextContent("Wrong root")',
      ),
    ).toThrow('root component must be Stack');
  });

  it('rejects an optional Filter binding without an empty-value fallback', () => {
    expect(() =>
      validateOpenUiDocument(
        [
          'root = Stack([count])',
          'count = TextContent("" + @Count(filtered))',
          'rows = [{name: "Keyboard"}]',
          'filtered = @Filter(rows, "name", "contains", $search)',
        ].join('\n'),
      ),
    ).toThrow('Reactive Filter binding must handle its empty initial value');
  });

  it('accepts a Filter binding guarded by an empty-value fallback', () => {
    expect(() =>
      validateOpenUiDocument(
        [
          'root = Stack([count])',
          'count = TextContent("" + @Count(filtered))',
          'rows = [{name: "Keyboard"}]',
          'filtered = $search == "" ? rows : @Filter(rows, "name", "contains", $search)',
        ].join('\n'),
      ),
    ).not.toThrow();
  });
});
