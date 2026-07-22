import { describe, expect, it } from 'vitest';

import { getOpenUiReference } from './openui-reference.js';

describe('getOpenUiReference', () => {
  it('keeps OpenUI artifact rendering independent from ask-question', () => {
    const reference = getOpenUiReference('form');

    expect(reference).toContain('nuwax_render_openui');
    expect(reference).toContain('nuwax_ask_question');
    expect(reference).toContain('not an alias');
  });

  it('documents safe reactive filters and empty chart states for dashboards', () => {
    const reference = getOpenUiReference('dashboard');

    expect(reference).toContain(
      'filtered = $search == "" ? data.rows : @Filter(data.rows, "title", "contains", $search)',
    );
    expect(reference).toContain(
      '@Count(filtered) > 0 ? PieChart(...) : TextContent("No matching data")',
    );
    expect(reference).toContain(
      'Reactive input and select bindings start with an empty value',
    );
    expect(reference).not.toContain(
      'Searchable: filtered = @Filter(data.rows, "title", "contains", $search)',
    );
  });
});
