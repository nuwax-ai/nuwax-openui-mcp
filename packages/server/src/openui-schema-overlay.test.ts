import { describe, expect, it } from 'vitest';

import { applyDescriptionOverlay } from '../scripts/openui-schema-overlay.mjs';

describe('applyDescriptionOverlay', () => {
  it('fills a missing description, listing enum props and their allowed values first', () => {
    const schema = {
      $defs: {
        Input: {
          properties: {
            name: {},
            type: { enum: ['text', 'email', 'password'] },
            value: {},
          },
        },
      },
    };

    applyDescriptionOverlay(schema);

    const desc = schema.$defs.Input.description;
    expect(desc).toContain('type=text|email|password');
    expect(desc).toContain('Other props: name, value');
  });

  it('does not clobber an existing description', () => {
    const schema = {
      $defs: { Stack: { description: 'Flex container.', properties: {} } },
    };

    applyDescriptionOverlay(schema);

    expect(schema.$defs.Stack.description).toBe('Flex container.');
  });

  it('lists only non-enum props when the component has no enums', () => {
    const schema = {
      $defs: { TextArea: { properties: { name: {}, rows: {} } } },
    };

    applyDescriptionOverlay(schema);

    expect(schema.$defs.TextArea.description).toBe(
      'TextArea component. Other props: name, rows.',
    );
    expect(schema.$defs.TextArea.description).not.toContain('Enum props');
  });

  it('is idempotent (running twice yields the same description)', () => {
    const schema = {
      $defs: { Input: { properties: { type: { enum: ['text'] } } } },
    };

    applyDescriptionOverlay(schema);
    const once = schema.$defs.Input.description;
    applyDescriptionOverlay(schema);

    expect(schema.$defs.Input.description).toBe(once);
  });

  it('skips components without properties', () => {
    const schema = { $defs: { Empty: {} } };

    applyDescriptionOverlay(schema);

    expect(schema.$defs.Empty.description).toBeUndefined();
  });
});
