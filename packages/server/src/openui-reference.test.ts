import { describe, expect, it } from 'vitest';

import {
  getOpenUiReference,
  getOpenUiUpdateGuide,
} from './openui-reference.js';

describe('getOpenUiReference', () => {
  it('keeps OpenUI artifact rendering independent from ask-question', () => {
    const reference = getOpenUiReference('form');

    expect(reference).toContain('nuwax_render_openui');
    expect(reference).toContain('nuwax_ask_question');
    expect(reference).toContain('not an alias');
  });

  it('documents *.openui.json as the dedicated OpenUI Lang data source', () => {
    const reference = getOpenUiReference('basic');

    expect(reference).toContain('*.openui.json');
    expect(reference).toContain('nuwax_get_openui_update_guide');
    expect(reference).not.toMatch(/Never (Write|edit|modify).*openui\.json/i);
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

  it('documents orphaned reachability as a validation error with a minimal table example', () => {
    const reference = getOpenUiReference('dashboard');

    expect(reference).toContain('Orphaned Statements');
    expect(reference).toContain('VALIDATION ERROR');
    expect(reference).toContain('usersData.name');
    expect(reference).toContain('nameCol = Col("姓名", usersData.name)');
    expect(reference).not.toMatch(
      /Unreferenced variables are silently dropped and will NOT render/,
    );
  });

  it('does not teach Query/Mutation data bindings (runtime does not execute them)', () => {
    for (const profile of ['basic', 'dashboard', 'form', 'all'] as const) {
      const reference = getOpenUiReference(profile);
      expect(reference).not.toMatch(/Query\(/);
      expect(reference).not.toMatch(/Mutation\(/);
      expect(reference).not.toMatch(/@Run\(/);
      expect(reference).not.toMatch(/refreshSeconds/);
      // 上游原文里的 "Query args" 措辞（无括号）也必须被 scrub 掉。
      expect(reference).not.toContain('Query args');
    }
  });

  it('rewrites the upstream Shared-filter-across-Tabs tip to drop the Query wording', () => {
    const reference = getOpenUiReference('dashboard');

    expect(reference).toContain(
      "reuse the same $days binding in each TabItem's chart/table args so one filter drives all tabs.",
    );
  });

  it('documents positional-only arguments and the Stack direction/gap footgun', () => {
    for (const profile of ['basic', 'dashboard', 'form', 'all'] as const) {
      const reference = getOpenUiReference(profile);
      expect(reference).toContain('ONLY positional arguments');
      expect(reference).toContain(
        'Stack(children, direction, gap, align, justify, wrap)',
      );
      // 正确写法与反面示例都要出现，便于模型对照
      expect(reference).toContain(
        'root = Stack([header, body], "column", "l")',
      );
      expect(reference).toContain('root = Stack([header, body], "l")');
      // 明确否定具名参数写法
      expect(reference).toMatch(/key: value|key=value|named\/keyword/);
    }
  });
});

describe('getOpenUiUpdateGuide', () => {
  it('explains *.openui.json contract and both update paths without banning edits', () => {
    const guide = getOpenUiUpdateGuide({ intent: 'general' });

    expect(guide).toContain('*.openui.json');
    expect(guide).toContain('nuwax_render_openui');
    expect(guide).toContain('document.digest');
    expect(guide).toContain('sha256:');
    expect(guide).toContain('Direct edit');
    expect(guide).toContain('file-tree preview only');
    expect(guide).toMatch(/MUST call nuwax_render_openui/i);
    expect(guide).not.toMatch(/prohibit|forbidden|do not edit|never edit/i);
  });

  it('embeds artifactId when provided', () => {
    const artifactId = '550e8400-e29b-41d4-a716-446655440000';
    const guide = getOpenUiUpdateGuide({
      artifactId,
      intent: 'title',
    });

    expect(guide).toContain(`data/${artifactId}.openui.json`);
    expect(guide).toContain(artifactId);
    expect(guide).toContain('Focus on changing the visible `title`');
  });
});
