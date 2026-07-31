import { createLibrary, defineComponent } from '@openuidev/react-lang';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createMobileAwareLibrary } from './mobileLayout.js';

/** 构造一个极小 base 库：Stack/Card（有 direction）+ TextContent（无 direction）。 */
function buildBaseLibrary() {
  const directional = z.object({
    direction: z.enum(['row', 'column']).optional(),
  });
  const flat = z.object({});
  const noop = () => null;
  return createLibrary({
    root: 'Stack',
    components: [
      defineComponent({
        name: 'Stack',
        props: directional,
        description: 'stack',
        component: noop,
      }),
      defineComponent({
        name: 'Card',
        props: directional,
        description: 'card',
        component: noop,
      }),
      defineComponent({
        name: 'TextContent',
        props: flat,
        description: 'text',
        component: noop,
      }),
    ],
  });
}

describe('createMobileAwareLibrary', () => {
  it('覆盖 Stack/Card、保留其余组件、保留 root', () => {
    const base = buildBaseLibrary();
    const mobile = createMobileAwareLibrary(base);

    expect(Object.keys(mobile.components).sort()).toEqual([
      'Card',
      'Stack',
      'TextContent',
    ]);
    // Stack / Card 的 renderer 被替换（不再是原函数）。
    expect(mobile.components.Stack.component).not.toBe(
      base.components.Stack.component,
    );
    expect(mobile.components.Card.component).not.toBe(
      base.components.Card.component,
    );
    // 其余组件原样保留（同一引用）。
    expect(mobile.components.TextContent.component).toBe(
      base.components.TextContent.component,
    );
    // root 与 componentGroups 保留。
    expect(mobile.root).toBe('Stack');
    expect(mobile.componentGroups).toBe(base.componentGroups);
  });
});
