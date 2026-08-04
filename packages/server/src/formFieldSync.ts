import { createElement, useEffect } from 'react';

import {
  createLibrary,
  defineComponent,
  parseStructuredRules,
  useFormName,
  useFormValidation,
  useIsStreaming,
  useSetDefaultValue,
  useStateField,
  type ComponentRenderProps,
  type DefinedComponent,
  type Library,
} from '@openuidev/react-lang';

/**
 * 表单字段默认值同步（修复 RadioGroup / Slider 必填误报）。
 *
 * 上游 `@openuidev/react-ui` genui-lib：
 * - UI 展示用 `field.value ?? props.defaultValue`（有 default 时看起来已选中）
 * - `registerField` 校验只读 `field.value`（store 未写入则为空）
 * - Radix 对已选中项再点不会触发 onValueChange，store 永远不更新
 *
 * 结果：已显示选中的必填项仍报「请填写此字段」。
 *
 * 本模块覆盖 RadioGroup / Slider：
 * 1. `useSetDefaultValue` 把展示用的 default 写入 store
 * 2. 在父级 effect 中覆盖 registerField getter，校验取值与 UI 一致
 *
 * 接入方式对齐 `mobileLayout.ts`：对 base library 做组件覆盖后交给 Renderer。
 */

/** 需要做 default ↔ store 同步的组件名。 */
const SYNC_DEFAULT_COMPONENTS = new Set(['RadioGroup', 'Slider']);

type FieldSyncProps = {
  name?: string;
  value?: unknown;
  defaultValue?: unknown;
  min?: number;
  rules?: unknown;
};

/**
 * 解析组件用于写入 store / 校验回退的默认值。
 * Slider 无 defaultValue 时 UI 仍显示 `[min]`，需同步以免必填误杀。
 */
function resolveDefaultValue(
  componentType: string,
  props: FieldSyncProps,
): unknown {
  if (props.defaultValue !== undefined) return props.defaultValue;
  if (componentType === 'Slider' && typeof props.min === 'number') {
    return [props.min];
  }
  return undefined;
}

/**
 * 校验取值：优先 store；为空时回退到与 UI 一致的 default（含 Slider 的 [min]）。
 */
function resolveValidationValue(
  fieldValue: unknown,
  defaultValue: unknown,
): unknown {
  if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
    return defaultValue;
  }
  return fieldValue;
}

/**
 * 返回与 `original` 同名同 schema 的覆盖组件：挂载后同步 default → store，
 * 并覆盖 registerField getter。其余渲染委托原 renderer。
 */
function withDefaultValueSync(
  original: DefinedComponent,
  componentType: string,
): DefinedComponent {
  const OriginalRenderer = original.component;

  const overrideRenderer = (
    renderProps: ComponentRenderProps<Record<string, unknown>>,
  ) => {
    const props = (renderProps.props ?? {}) as FieldSyncProps;
    const name = typeof props.name === 'string' ? props.name : '';
    const formName = useFormName();
    const field = useStateField(name, props.value);
    const formValidation = useFormValidation();
    const isStreaming = useIsStreaming();
    const defaultValue = resolveDefaultValue(componentType, props);

    // 流式结束后把 default 写入 store，避免「UI 已选、store 仍空」
    useSetDefaultValue({
      formName,
      componentType,
      name,
      existingValue: field.value,
      defaultValue,
    });

    // 父级 effect 在子组件（原 RadioGroup）effect 之后执行，覆盖其 registerField。
    // 故意不在 cleanup 里 unregister，以免与子组件 cleanup 顺序打架；
    // Form 卸载时 fieldsRef 随组件一起丢弃。
    useEffect(() => {
      if (isStreaming || formValidation == null || name.length === 0) return;
      const rules = parseStructuredRules(props.rules as never);
      if (!Array.isArray(rules) || rules.length === 0) return;
      formValidation.registerField(name, rules, () =>
        resolveValidationValue(field.value, defaultValue),
      );
    }, [
      defaultValue,
      field.value,
      formValidation,
      isStreaming,
      name,
      props.rules,
    ]);

    return createElement(OriginalRenderer, renderProps);
  };

  return defineComponent({
    name: original.name,
    props: original.props,
    description: original.description,
    component: overrideRenderer,
  });
}

/**
 * 基于 `base` 库构造「表单默认值同步」库：RadioGroup / Slider 校验与 UI 选中态一致。
 * 可与 `createMobileAwareLibrary` 组合：`createMobileAwareLibrary(createFormFieldSyncLibrary(base))`。
 */
export function createFormFieldSyncLibrary(base: Library): Library {
  const components = Object.values(base.components).map((component) =>
    SYNC_DEFAULT_COMPONENTS.has(component.name)
      ? withDefaultValueSync(component, component.name)
      : component,
  );
  return createLibrary({
    components,
    componentGroups: base.componentGroups,
    root: base.root,
  });
}
