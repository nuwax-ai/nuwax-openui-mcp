import {
  readOpenUiReferenceRaw,
  readOpenUiSchemaText,
} from './openui-assets.js';
import {
  OPENUI_REFERENCE_TOOL_NAME,
  OPENUI_TOOL_NAME,
  OPENUI_UPDATE_GUIDE_TOOL_NAME,
  type OpenUiReferenceInput,
  type OpenUiUpdateGuideInput,
} from './contracts.js';

const PROFILE_FOCUS: Record<OpenUiReferenceInput['profile'], string> = {
  basic:
    'Focus on Stack, Card, CardHeader, TextContent, Callout, TagBlock, Buttons, and Separator.',
  dashboard:
    'Focus on Table/Col, chart components, KPI Cards, Tabs, and shared data arrays.',
  form: 'Focus on Form, FormControl, input components, Buttons/Action, validation rules, bindings, and Modal.',
  all: 'Use any documented component, but prefer the smallest set that satisfies the request.',
};

/**
 * 工具边界与文件类型约定。
 * OpenUI Lang 专用数据源扩展名是 `*.openui.json`；不禁止直接编辑该文件，但须维持契约。
 */
export const OPENUI_TOOL_BOUNDARY = `## Tool Boundary (CRITICAL)

- ${OPENUI_TOOL_NAME} and nuwax_ask_question are separate tools; ${OPENUI_TOOL_NAME} is not an alias for nuwax_ask_question.
- Use ${OPENUI_TOOL_NAME} to create or update a durable visual Artifact: cards, dashboards, charts, tables, reports, application forms, and interactive pages.
- Never substitute nuwax_ask_question when the user asks to render, show, preview, demonstrate, or update OpenUI. Load the OpenUI reference, author openui-lang, then call ${OPENUI_TOOL_NAME}.
- nuwax_ask_question is only for a blocking clarification or decision that the Agent must receive before it can continue. Its inline/modal/wizard schema is not OpenUI Lang and must never be passed to ${OPENUI_TOOL_NAME}.
- OpenUI Lang durable data source extension is ALWAYS \`*.openui.json\` (canonical path: \`data/{artifactId}.openui.json\`). Do not invent bare \`.openui\` or other suffixes as the OpenUI data source.
- When the user asks to modify an existing OpenUI UI or \`*.openui.json\` file, call ${OPENUI_UPDATE_GUIDE_TOOL_NAME} first, then update via ${OPENUI_TOOL_NAME} (reuse artifactId) or by editing the \`.openui.json\` while keeping the file contract (including document.digest).
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

/**
 * 可达性 / Orphaned 专项指引。
 * 上游官方 prompt 写「静默丢弃」，Nuwax 校验会直接拒绝未引用变量。
 */
const REACHABILITY_GUARDRAILS = `## Nuwax Reachability / Orphaned Statements (CRITICAL)

- On Nuwax, unreferenced (orphaned) variables are NOT silently dropped: validation REJECTS the document with \`Orphaned statements: <name>\`.
- EVERY variable except \`root\` MUST be referenced at least once from another expression that is reachable from \`root\` (typically Stack children, Table/Col data, or chart args).
- Defining \`usersData = [...]\` (or any data array) but never using it in \`Col(...)\` / \`Table(...)\` / \`Stack([...])\` causes \`Orphaned statements: usersData\`.
- Minimal working table (named data wired into Col, then Table, then root):

\`\`\`
root = Stack([title, table])
title = TextContent("员工信息表", "large-heavy")
table = Table([nameCol, deptCol])
nameCol = Col("姓名", usersData.name)
deptCol = Col("部门", usersData.dept)
usersData = [{name: "张伟", dept: "技术部"}, {name: "王芳", dept: "产品部"}]
\`\`\`

- Self-check before calling ${OPENUI_TOOL_NAME}: walk every non-root identifier; if it is never named in another line, either wire it into Col/Table/Stack or delete it.
`;

const INTENT_FOCUS: Record<OpenUiUpdateGuideInput['intent'], string> = {
  title:
    'Focus on changing the visible `title` field (and optionally TextContent strings inside document.source).',
  source:
    'Focus on rewriting `document.source` OpenUI Lang. Keep root = Stack(...), positional args, and every defined variable reachable from root.',
  presentation:
    'Focus on `presentation.mode` (inline vs sidecar), preferredWidth, and autoOpen.',
  general:
    'Cover any update: title, OpenUI Lang source, presentation, or bindings.',
};

/**
 * 纠正上游生成 prompt 中与 Nuwax 校验不一致的表述。
 */
function normalizeGeneratedReference(reference: string): string {
  return reference
    .replace(
      '- Searchable: filtered = @Filter(data.rows, "title", "contains", $search). Bind $search to Input',
      '- Searchable: filtered = $search == "" ? data.rows : @Filter(data.rows, "title", "contains", $search). Bind $search to Input; the empty binding must show all rows.',
    )
    .replace(
      '5. EVERY variable (except root) MUST be referenced by at least one other variable. Unreferenced variables are silently dropped and will NOT render. Always include defined variables in their parent\'s children/items array.',
      '5. EVERY variable (except root) MUST be referenced by at least one other variable. On Nuwax, unreferenced variables are a VALIDATION ERROR (Orphaned statements) and the document is rejected—they are not silently dropped. Always include defined variables in their parent\'s children/items array or in Col/Table/chart expressions.',
    );
}

export function getOpenUiReference(
  profile: OpenUiReferenceInput['profile'],
): string {
  const dashboardGuardrails =
    profile === 'dashboard' || profile === 'all'
      ? `\n\n${REACTIVE_DASHBOARD_GUARDRAILS}`
      : '';
  return `${OPENUI_TOOL_BOUNDARY}\nAuthoring profile: ${profile}. ${PROFILE_FOCUS[profile]}\nDo not emit XML, HTML, JSX, markdown fences, or explanations inside document.source.\n\n${REACHABILITY_GUARDRAILS}${dashboardGuardrails}\n\n${normalizeGeneratedReference(readOpenUiReferenceRaw())}`;
}

export function getOpenUiDslSchema(): string {
  return readOpenUiSchemaText();
}

/**
 * 返回更新已有 OpenUI Artifact 的操作指引。
 * 明确 `*.openui.json` 是专用数据源；支持 render 复用 artifactId 或直接编辑（须维护 digest）。
 *
 * @param input 可选 artifactId 与更新意图
 * @returns 纯文本指引
 */
export function getOpenUiUpdateGuide(
  input: OpenUiUpdateGuideInput = { intent: 'general' },
): string {
  const artifactId = input.artifactId;
  const pathHint = artifactId
    ? `data/${artifactId}.openui.json`
    : 'data/{artifactId}.openui.json';
  const renderExampleId = artifactId ?? '<existing-artifact-uuid>';

  return `## Nuwax OpenUI update guide

Intent: ${input.intent}. ${INTENT_FOCUS[input.intent]}

### Dedicated data source type

- OpenUI Lang durable artifacts use the file extension \`*.openui.json\` only (canonical path: \`${pathHint}\`).
- Do not create or point users at bare \`.openui\` or other suffixes as the OpenUI Lang data source.
- File body must be \`nuwax.openui-file/v1\` JSON: type, schemaVersion, artifactId, title, presentation, document (language/specVersion/source/digest), bindings, fallback, createdAt, updatedAt.

### Two valid ways to update (neither is banned)

1. **Recommended — call ${OPENUI_TOOL_NAME} again** with the same \`artifactId\` (\`${renderExampleId}\`). Pass the full new title / document.source / presentation. The server rewrites \`${pathHint}\`, recomputes \`document.digest\` as \`sha256:\` + SHA-256 hex of source (64 hex chars), keeps \`createdAt\`, refreshes \`updatedAt\`. Do not invent digest/createdAt/updatedAt/type yourself when using this tool.

2. **Direct edit of the \`.openui.json\` file** is allowed. You may change \`title\`, \`document.source\`, \`presentation\`, etc. If you change \`document.source\`, you MUST set \`document.digest\` to \`sha256:\` followed by the lowercase hex SHA-256 of the exact new source string (64 hex digits). Keep \`type\`, \`schemaVersion\`, \`artifactId\`, and other required fields. Invalid or missing digest causes Host preview failure (\`document.digest\` must match \`/^sha256:[a-f0-9]{64}$/\`).

### Before you edit

- Confirm the target file ends with \`.openui.json\` (not bare \`.openui\`).
- For OpenUI Lang body changes, keep every non-root variable referenced from root (see ${OPENUI_REFERENCE_TOOL_NAME} profile=dashboard for table wiring). Orphaned variables (e.g. unused \`usersData\`) are rejected.
- After updating via render, tell the user the path from the tool result (\`${pathHint}\`).
`;
}
