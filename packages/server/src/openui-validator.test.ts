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

  it('rejects orphaned data variables with an actionable repair hint', () => {
    expect(() =>
      validateOpenUiDocument(
        [
          'root = Stack([title])',
          'title = TextContent("员工信息表", "large-heavy")',
          'usersData = [{name: "张伟", dept: "技术部"}]',
        ].join('\n'),
      ),
    ).toThrow(/Orphaned statements: usersData[\s\S]*Wire them into Col/);
  });

  it('rejects a gap value written in the Stack direction slot', () => {
    expect(() =>
      validateOpenUiDocument(
        ['root = Stack([a], "l")', 'a = TextContent("x")'].join('\n'),
      ),
    ).toThrow(/gap was written in the direction slot/);
  });

  it('rejects an arbitrary invalid Stack direction', () => {
    expect(() =>
      validateOpenUiDocument(
        ['root = Stack([a], "vertical")', 'a = TextContent("x")'].join('\n'),
      ),
    ).toThrow('Stack.direction must be one of "row", "column"');
  });

  it('accepts explicit row/column directions and an omitted direction', () => {
    for (const direction of ['"row"', '"column"', '']) {
      const source = [
        `root = Stack([a]${direction ? `, ${direction}` : ''})`,
        'a = TextContent("x")',
      ].join('\n');
      expect(() => validateOpenUiDocument(source)).not.toThrow();
    }
  });

  it('rejects an invalid enum value on any component, not only Stack', () => {
    // PieChart.variant is "pie"|"donut"; "grouped" is a BarChart value, not a
    // sibling here, so the error is the plain "must be one of" form.
    expect(() =>
      validateOpenUiDocument(
        [
          'root = Stack([chart])',
          'chart = PieChart(labels, values, "grouped")',
          'labels = ["a", "b"]',
          'values = [1, 2]',
        ].join('\n'),
      ),
    ).toThrow('PieChart.variant must be one of "pie", "donut"');
  });

  it('hints at a sibling-slot swap for non-Stack components', () => {
    // Card's 2nd positional is `variant`; a gap token there is invalid for
    // variant but is a valid Card.gap value, so the hint points at the gap sibling.
    expect(() =>
      validateOpenUiDocument(
        [
          'root = Stack([card])',
          'card = Card([body], "m")',
          'body = TextContent("x")',
        ].join('\n'),
      ),
    ).toThrow(/gap was written in the variant slot/);
  });

  it('walks into nested elements under non-children props without false errors', () => {
    // Table nests Col under `columns`; the walker must reach it and not choke.
    expect(() =>
      validateOpenUiDocument(
        [
          'root = Stack([table])',
          'table = Table([nameCol])',
          'nameCol = Col("名称", data)',
          'data = [{name: "张三"}]',
        ].join('\n'),
      ),
    ).not.toThrow();
  });
});
