import { openuiLibrary } from '@openuidev/react-ui/genui-lib';

import type { OpenUiReferenceInput } from './contracts.js';

const PROFILE_FOCUS: Record<OpenUiReferenceInput['profile'], string> = {
  basic:
    'Focus on Stack, Card, CardHeader, TextContent, Callout, TagBlock, Buttons, and Separator.',
  dashboard:
    'Focus on Table/Col, chart components, KPI Cards, Tabs, and shared data arrays.',
  form: 'Focus on Form, FormControl, input components, Buttons/Action, validation rules, bindings, and Modal.',
  all: 'Use any documented component, but prefer the smallest set that satisfies the request.',
};

export const OPENUI_TOOL_BOUNDARY = `## Tool Boundary (CRITICAL)

- nuwax_render_openui and nuwax_ask_question are separate tools; nuwax_render_openui is not an alias for nuwax_ask_question.
- Use nuwax_render_openui to create or update a durable visual Artifact: cards, dashboards, charts, tables, reports, application forms, and interactive pages.
- Never substitute nuwax_ask_question when the user asks to render, show, preview, demonstrate, or update OpenUI. Load the OpenUI reference, author openui-lang, then call nuwax_render_openui.
- nuwax_ask_question is only for a blocking clarification or decision that the Agent must receive before it can continue. Its inline/modal/wizard schema is not OpenUI Lang and must never be passed to nuwax_render_openui.
`;

const REACTIVE_DASHBOARD_GUARDRAILS = `## Nuwax Reactive Dashboard Guardrails (CRITICAL)

- Reactive input and select bindings start with an empty value. An optional filter MUST bypass @Filter until its binding is non-empty.
- Safe search: filtered = $search == "" ? data.rows : @Filter(data.rows, "title", "contains", $search)
- Safe select: byStatus = $status == "all" ? filtered : ($status == "" ? filtered : @Filter(filtered, "status", "==", $status))
- Never write a direct optional filter such as filtered = @Filter(data.rows, "title", "contains", $search); it produces an empty initial dashboard in the current runtime and validation rejects it.
- Before rendering PieChart, RadialChart, or SingleStackedBarChart, guard a zero total and show an empty state: @Count(filtered) > 0 ? PieChart(...) : TextContent("No matching data")
- Use the same guarded dataset for KPIs, charts, and tables. Verify the initial empty-binding state has non-zero rows when source data is non-empty.
- Named numeric references inside chart arrays are supported. If KPIs and table rows are also zero, debug the upstream filter dataset instead of inlining the same count expressions.
`;

function normalizeGeneratedReference(reference: string): string {
  return reference.replace(
    '- Searchable: filtered = @Filter(data.rows, "title", "contains", $search). Bind $search to Input',
    '- Searchable: filtered = $search == "" ? data.rows : @Filter(data.rows, "title", "contains", $search). Bind $search to Input; the empty binding must show all rows.',
  );
}

export function getOpenUiReference(
  profile: OpenUiReferenceInput['profile'],
): string {
  const guardrails =
    profile === 'dashboard' || profile === 'all'
      ? `\n\n${REACTIVE_DASHBOARD_GUARDRAILS}`
      : '';
  return `${OPENUI_TOOL_BOUNDARY}\nAuthoring profile: ${profile}. ${PROFILE_FOCUS[profile]}\nDo not emit XML, HTML, JSX, markdown fences, or explanations inside document.source.${guardrails}\n\n${normalizeGeneratedReference(openuiLibrary.prompt({}))}`;
}

export function getOpenUiDslSchema(): string {
  return JSON.stringify(openuiLibrary.toJSONSchema(), null, 2);
}
