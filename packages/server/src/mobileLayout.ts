import { createElement, type ReactNode } from 'react';

import {
  createLibrary,
  defineComponent,
  type ComponentRenderProps,
  type DefinedComponent,
  type Library,
} from '@openuidev/react-lang';
import { LayoutContextProvider, useLayoutContext } from '@openuidev/react-ui';

/**
 * 移动端布局覆盖层（Option B：运行时自动重排）。
 *
 * 上游 OpenUI 框架不原生支持"移动端/PC 端"渲染适配（Renderer 无 viewport prop、
 * Stack/Card 不读任何设备 context、DSL 无 @Mobile/断点）。本模块通过覆盖组件库的
 * Stack / Card renderer，在 `LayoutContext.layout === 'mobile'` 时把 `direction`
 * 强制为 `column`（横排改竖排），其余参数与渲染逻辑全部委托给原 renderer，从而：
 * - 一份 `.openui.json` / digest 不变（只在渲染层重排，不落盘、不改 source）；
 * - 由运行时"是否移动端"标志（`LayoutContext`，非 CSS 宽度）驱动；
 * - 被 web runtime（iframe / WebView）与 nuwax PC web 直连 Renderer 路径共用。
 *
 * 镜像 `compactTheme.ts` 的导出方式：经 `@nuwax-ai/openui-mcp/mobile-layout` 子路径
 * 暴露；MCP server 自身不 import 本模块，因此不会把 react-ui 拉进 stdio 进程。
 */

type DirectionalProps = { direction?: 'row' | 'column' };

/** 需要在移动端强制竖排的组件（其余组件原样保留）。 */
const MOBILE_FORCE_COLUMN_COMPONENTS = new Set(['Stack', 'Card']);

/**
 * 返回一个与 `original` 同名同 schema 的覆盖组件：mobile 时把 `direction` 强制
 * `column`，再调用原 renderer 渲染。桌面端行为与原组件完全一致。
 */
function forceColumnOnMobile(original: DefinedComponent): DefinedComponent {
  const OriginalRenderer = original.component;
  const overrideRenderer = (
    renderProps: ComponentRenderProps<Record<string, unknown>>,
  ) => {
    const isMobile = useLayoutContext().layout === 'mobile';
    const baseProps = (renderProps.props ?? {}) as DirectionalProps;
    const effectiveProps = isMobile
      ? { ...baseProps, direction: 'column' as const }
      : baseProps;
    return createElement(OriginalRenderer, {
      ...renderProps,
      props: effectiveProps,
    });
  };
  return defineComponent({
    name: original.name,
    props: original.props,
    description: original.description,
    component: overrideRenderer,
  });
}

/**
 * 基于 `base` 库构造一个"移动端感知"库：Stack / Card 在 mobile 布局下自动横排→竖排，
 * 其余组件、componentGroups、root 全部保留。始终用此库渲染——组件自行按 LayoutContext
 * 决定是否重排，桌面端零变化。
 */
export function createMobileAwareLibrary(base: Library): Library {
  const components = Object.values(base.components).map((component) =>
    MOBILE_FORCE_COLUMN_COMPONENTS.has(component.name)
      ? forceColumnOnMobile(component)
      : component,
  );
  return createLibrary({
    components,
    componentGroups: base.componentGroups,
    root: base.root,
  });
}

/**
 * Provider：按 `isMobile` 向子树提供 `LayoutContext`（`'mobile' | 'fullscreen'`）。
 * 包住 `<Renderer>` 即可让 `createMobileAwareLibrary` 产出的组件感知移动端。
 */
export function MobileLayoutProvider({
  isMobile,
  children,
}: {
  isMobile: boolean;
  children: ReactNode;
}): ReactNode {
  return createElement(LayoutContextProvider, {
    layout: isMobile ? 'mobile' : 'fullscreen',
    children,
  });
}
