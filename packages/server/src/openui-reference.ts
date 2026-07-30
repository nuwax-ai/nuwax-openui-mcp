import {
  readOpenUiReferenceRaw,
  readOpenUiSchemaText,
} from './openui-assets.js';
import {
  OPENUI_LANG_VERSION,
  OPENUI_SCHEMA_VERSION,
  type OpenUiReferenceInput,
  type OpenUiUpdateGuideInput,
} from './contracts.js';
import {
  OPENUI_REFERENCE_TOOL_NAME,
  OPENUI_TOOL_NAME,
  OPENUI_UPDATE_GUIDE_TOOL_NAME,
} from './tool-names.js';

/**
 * 完整、可校验的 render payload 示例（默认 inline，避免模型把所有看板做成 sidecar）。
 * 嵌入工具描述，给模型一个「结构 + 紧凑 source」的正向锚点。
 * source 经 validateOpenUiDocument 校验通过；故意紧凑、无空格填充，
 * 以避免模型模仿出撑爆 100k source 上限的对齐式填充。
 */
export const RENDER_EXAMPLE_PAYLOAD = {
  schemaVersion: OPENUI_SCHEMA_VERSION,
  title: '销售数据看板',
  presentation: { mode: 'inline' as const },
  document: {
    language: 'openui-lang' as const,
    specVersion: OPENUI_LANG_VERSION,
    source: [
      'root = Stack([kpiRow, salesChart], "column", "l")',
      'kpiRow = Stack([revenueCard, ordersCard], "row", "m")',
      'revenueCard = Card([TextContent("总营收", "small"), TextContent("¥1,286,500", "large-heavy"), TextContent("环比 +12.3%", "small")])',
      'ordersCard = Card([TextContent("订单数", "small"), TextContent("8,642", "large-heavy"), TextContent("环比 +8.7%", "small")])',
      'salesChart = BarChart(products.product, [Series("销量", products.sales)])',
      'products = [{product: "智能手表", sales: 1240}, {product: "无线耳机", sales: 980}, {product: "手机壳", sales: 860}, {product: "充电宝", sales: 720}, {product: "蓝牙音箱", sales: 650}]',
    ].join('\n'),
  },
  bindings: { tools: [] },
  fallback: { markdown: '' },
};

/** 工具描述里随附的 delivery + authoring 紧凑指引（贴近示例，防空格填充）。 */
export const RENDER_AUTHORING_HINTS = `Author document.source as compact single-line statements with no space/tab padding for alignment (padding bloats the payload past the 100000-char source limit and the call fails JSON parsing). The Host shows UI ONLY after a successful ${OPENUI_TOOL_NAME} tool result (returning nuwax.openui-ref). NEVER tell the user the UI was created/opened/auto-opened until that tool result arrives—planning, drafting source, or quoting this example is NOT enough. Choose presentation.mode by intent: inline for compact in-chat UI (default example below); use sidecar with autoOpen: true only when the user wants a full-screen / standalone page / "don't put it in the chat bubble" experience—copy presentation:{"mode":"sidecar","autoOpen":true}. Example: ${JSON.stringify(RENDER_EXAMPLE_PAYLOAD)}`;

const PROFILE_FOCUS: Record<OpenUiReferenceInput['profile'], string> = {
  basic:
    'Focus on Stack, Card, CardHeader, TextContent, Callout, TagBlock, Buttons, and Separator.',
  dashboard:
    'Focus on Table/Col, chart components, KPI Cards, Tabs, and shared data arrays.',
  form: 'Focus on Form, FormControl, input components, Buttons/Action, validation rules, bindings, and Modal.',
  all: 'Use any documented component, but prefer the smallest set that satisfies the request.',
};

/**
 * Server 级路由声明（MCP initialize 握手下发给宿主）。
 * 以"能力象限"定义 OpenUI 整体接入方案适合做什么 / 不推荐做什么，
 * 让宿主对任意请求按意图自我路由，而非匹配触发关键词或组件清单。
 */
export const OPENUI_SERVER_INSTRUCTIONS = `## Nuwax OpenUI routing (CRITICAL)

This server is the ONLY way to produce UI that the Nuwax Host can render inline in conversation or in a sidecar page. 本服务是 Host 唯一能在对话内 / sidecar 渲染 UI 的协议。

### Visibility prerequisite (可见性前提 — CRITICAL)
The Host shows UI (inline OR sidecar) ONLY when you successfully call ${OPENUI_TOOL_NAME} and receive a tool result with \`nuwax.openui-ref\` / an artifact path. There is NO separate validate tool—${OPENUI_TOOL_NAME} validates source itself. ${OPENUI_UPDATE_GUIDE_TOOL_NAME} and hand-editing \`*.openui.json\` do NOT open conversation inline/sidecar (file-tree preview only). Anti-hallucination: NEVER claim the dashboard/UI was created, published, opened, or auto-opened unless you already have that successful ${OPENUI_TOOL_NAME} tool result in this turn. Drafting OpenUI Lang in assistant text without calling the tool does nothing for the user. For full-screen / "don't put it in the chat bubble", pass presentation.mode="sidecar" and autoOpen=true on that render call.

### Prefer ${OPENUI_TOOL_NAME} (首选象限)
Route by intent, not by keywords. Whenever the user's underlying goal is a SINGLE, SELF-CONTAINED visual interface that presents or collects STRUCTURED information using standard components—KPI cards, charts, tables, forms, text, images—whether they ask to build a dashboard, monitoring panel, report, data-collection form, status page, or any comparable outcome, in any wording or language—you MUST call ${OPENUI_TOOL_NAME}. Do not wait for them to say "OpenUI" or to use a specific term like "dashboard"/"看板". 按意图路由：只要用户的真实目的是"用一个自包含界面呈现或收集结构化信息"（指标卡、图表、表格、表单、文本、图像等标准组件可表达的：数据看板、监控面板、报表、表单、状态页），无论措辞、无论语言、无论是否点名图表或组件，都必须走 ${OPENUI_TOOL_NAME}。For complex UI or uncertain component signatures, call ${OPENUI_REFERENCE_TOOL_NAME} first.

### Do NOT use OpenUI (不推荐象限) — leave these to ordinary coding
OpenUI is NOT the right tool when the request is really for:
- A multi-page application, website, or anything with client-side routing / navigation between screens (多页应用、网站、需要路由跳转的界面).
- A highly interactive or bespoke experience: games, animations, canvas/SVG editors, drag-and-drop builders, pixel-perfect custom layouts (重交互或高度定制体验：游戏、动画、画布编辑器、拖拽搭建、像素级自由布局——OpenUI 用标准结构化组件，不提供像素级自由布局).
- Free-form documents, rich-text/Markdown content, or long-form articles (自由文档、富文本、长文内容).
- Anything that must run arbitrary JavaScript, load external scripts, or embed raw HTML/CSS (需要执行任意 JS、加载外部脚本、或嵌入原生 HTML/CSS 的场景——OpenUI Lang 是受限 DSL，不允许这些).
These outcomes are better served by writing ordinary code/files directly; do NOT force them into ${OPENUI_TOOL_NAME}. 上述需求应直接写普通代码/文件，不要套 OpenUI。

### Judgment principle for the gray zone (灰区判断原则)
Ask two questions: (1) Is the deliverable ONE self-contained interface rather than a navigable app? (2) Can it be expressed with structured data + standard components (KPI/chart/table/form/text), without arbitrary JS or pixel-level custom layout? If BOTH are yes, use ${OPENUI_TOOL_NAME}; otherwise write ordinary code/files. When in doubt, prefer the option whose output the Host can actually render in-conversation—never silently fall back to a bare \`*.html\` file just because the request sounds ambiguous. 判断两点：交付物是不是单个自包含界面？能否用"结构化数据 + 标准组件（指标/图表/表格/表单/文本）"表达、不需要任意 JS 或像素级自由布局？两个都"是"就走 ${OPENUI_TOOL_NAME}，否则写普通代码/文件。拿不准时，优先选 Host 真能在对话内渲染的那条路，绝不要因为需求含糊就默默退化成裸 \`*.html\` 文件。

### Hard exclusions (硬性排除)
- NEVER satisfy a "prefer" intent by writing bare HTML/CSS/JS files (\`*.html\`), SVG/PNG chart files, or by using any frontend/dataviz/charting code-generation skill or tool (such as frontend-design, dataviz, or any skill that produces web pages, charts, or visualization code). 禁止用裸 HTML、图片/SVG 图表、或任何前端 / 数据可视化 / 图表类 skill 代替 ${OPENUI_TOOL_NAME}——这些产出 Host 都无法在对话内 / sidecar 渲染。
- ${OPENUI_TOOL_NAME} and nuwax_ask_question are separate tools: nuwax_ask_question is only for a blocking clarification the Agent must receive before it can continue; never use it to render UI.
- The durable OpenUI data source is ALWAYS \`data/{artifactId}.openui.json\`. To update an existing UI, call ${OPENUI_UPDATE_GUIDE_TOOL_NAME} first, then reuse the artifactId with ${OPENUI_TOOL_NAME}.
`;

/**
 * 工具边界与文件类型约定。
 * OpenUI Lang 专用数据源扩展名是 `*.openui.json`；不禁止直接编辑该文件，但须维持契约。
 */
export const OPENUI_TOOL_BOUNDARY = `## Tool Boundary (CRITICAL)

- ${OPENUI_TOOL_NAME} and nuwax_ask_question are separate tools; ${OPENUI_TOOL_NAME} is not an alias for nuwax_ask_question.
- Visibility: without a successful ${OPENUI_TOOL_NAME} tool result the user sees NO UI (neither inline nor sidecar). ${OPENUI_UPDATE_GUIDE_TOOL_NAME} / hand-editing \`*.openui.json\` do not open conversation UI. Never claim created/opened/auto-opened until the tool result is in hand.
- Route by intent, not by keyword: use ${OPENUI_TOOL_NAME} whenever the user's goal is ONE self-contained interface for structured information (dashboards, KPI cards, charts, tables, reports, forms, status panels), regardless of wording or language. Do NOT use it for multi-page apps/sites, games or highly interactive bespoke experiences, free-form documents, or anything needing arbitrary JS / external scripts / raw HTML—those belong to ordinary code/files. 按意图路由：单个自包含的结构化信息界面（看板/指标卡/图表/表格/报表/表单/状态页）一律走本工具；多页应用、游戏/重交互、自由文档、或需要任意 JS 的场景不要用 OpenUI，直接写普通代码。
- Never substitute nuwax_ask_question when the user asks to render, show, preview, demonstrate, or update OpenUI. Load the OpenUI reference, author openui-lang, then call ${OPENUI_TOOL_NAME}.
- nuwax_ask_question is only for a blocking clarification or decision that the Agent must receive before it can continue. Its inline/modal/wizard schema is not OpenUI Lang and must never be passed to ${OPENUI_TOOL_NAME}.
- Do NOT produce UI through ANY code-generation or file-writing path: no bare HTML/CSS/JS files (\`*.html\`), no SVG/PNG chart files, and no frontend/dataviz/charting skills or tools (such as frontend-design, dataviz, or any skill that generates web pages, charts, or visualization code). 裸 HTML、图片/SVG 图表、以及任何前端 / 数据可视化 / 图表类 skill 的产出都无法在 Host inline/sidecar 中渲染，只有 ${OPENUI_TOOL_NAME} 写入的 \`*.openui.json\` 才是 Host 可渲染的协议。用户意图只要是"单个自包含的可视化界面"，一律走 ${OPENUI_TOOL_NAME}，不要写 \`*.html\`。
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
      "5. EVERY variable (except root) MUST be referenced by at least one other variable. Unreferenced variables are silently dropped and will NOT render. Always include defined variables in their parent's children/items array.",
      "5. EVERY variable (except root) MUST be referenced by at least one other variable. On Nuwax, unreferenced variables are a VALIDATION ERROR (Orphaned statements) and the document is rejected—they are not silently dropped. Always include defined variables in their parent's children/items array or in Col/Table/chart expressions.",
    )
    .replace(
      '- Shared filter across Tabs: same $days binding in Query args works across all TabItems',
      "- Shared filter across Tabs: reuse the same $days binding in each TabItem's chart/table args so one filter drives all tabs.",
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

2. **Direct edit of the \`.openui.json\` file** is allowed. You may change \`title\`, \`document.source\`, \`presentation\`, etc. If you change \`document.source\`, you MUST set \`document.digest\` to \`sha256:\` followed by the lowercase hex SHA-256 of the exact new source string (64 hex digits). Keep \`type\`, \`schemaVersion\`, \`artifactId\`, and other required fields. Invalid or missing digest causes Host preview failure (\`document.digest\` must match \`/^sha256:[a-f0-9]{64}$/\`). **Important:** a direct file edit can be opened from the file-tree preview only—it does NOT emit a conversation tool result, so it will NOT auto-open sidecar / will NOT show an inline card in chat. For conversation inline or sidecar UX (including autoOpen), you MUST call ${OPENUI_TOOL_NAME} again.

### Before you edit

- Confirm the target file ends with \`.openui.json\` (not bare \`.openui\`).
- For OpenUI Lang body changes, keep every non-root variable referenced from root (see ${OPENUI_REFERENCE_TOOL_NAME} profile=dashboard for table wiring). Orphaned variables (e.g. unused \`usersData\`) are rejected.
- After updating via render, tell the user the path from the tool result (\`${pathHint}\`).
`;
}
