import { createLibrary, defineComponent } from '@openuidev/react-lang';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createFormFieldSyncLibrary } from './formFieldSync.js';

/** 构造含 RadioGroup / Slider / 其它组件的极小 base 库。 */
function buildBaseLibrary() {
  const field = z.object({
    name: z.string(),
    defaultValue: z.string().optional(),
  });
  const slider = z.object({
    name: z.string(),
    min: z.number().optional(),
    defaultValue: z.array(z.number()).optional(),
  });
  const flat = z.object({});
  const noop = () => null;
  return createLibrary({
    root: 'Form',
    components: [
      defineComponent({
        name: 'RadioGroup',
        props: field,
        description: 'radio',
        component: noop,
      }),
      defineComponent({
        name: 'Slider',
        props: slider,
        description: 'slider',
        component: noop,
      }),
      defineComponent({
        name: 'Input',
        props: flat,
        description: 'input',
        component: noop,
      }),
      defineComponent({
        name: 'Form',
        props: flat,
        description: 'form',
        component: noop,
      }),
    ],
  });
}

describe('createFormFieldSyncLibrary', () => {
  it('覆盖 RadioGroup/Slider、保留其余组件与 root', () => {
    const base = buildBaseLibrary();
    const synced = createFormFieldSyncLibrary(base);

    expect(Object.keys(synced.components).sort()).toEqual([
      'Form',
      'Input',
      'RadioGroup',
      'Slider',
    ]);
    expect(synced.components.RadioGroup.component).not.toBe(
      base.components.RadioGroup.component,
    );
    expect(synced.components.Slider.component).not.toBe(
      base.components.Slider.component,
    );
    expect(synced.components.Input.component).toBe(
      base.components.Input.component,
    );
    expect(synced.components.Form.component).toBe(base.components.Form.component);
    expect(synced.root).toBe('Form');
    expect(synced.componentGroups).toBe(base.componentGroups);
  });
});
