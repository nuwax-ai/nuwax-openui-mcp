# Changelog

## 0.3.3

- **Fewer authoring mistakes, higher first-try success.** Add a read-only
  `nuwax_validate_openui` dry-run tool that validates an OpenUI Lang
  `document.source` (syntax, root=Stack, orphaned statements, unresolved
  references, reactive-filter guards) WITHOUT writing a file, so an agent can
  self-check and fix before rendering instead of looping on render errors. The
  render tool description embeds a complete, schema-valid **inline** example
  payload (`RENDER_EXAMPLE_PAYLOAD`) plus compact single-line authoring rules
  (no space/tab alignment padding—the usual cause of "source exceeds 100000
  chars" failures). Sidecar + `autoOpen: true` is documented in text for
  full-screen / "don't put it in the chat bubble" requests. The source length
  limit error is attached to the Zod `.max({ error })` so MCP SDK pre-handler
  validation surfaces the padding root cause (handler-side catch never sees
  `too_big`). Authoring prompt now says dry-run with validate, then render.
- **Presentation field descriptions** map full-screen / standalone-page wording
  to `mode:"sidecar"` + `autoOpen:true`, and `document.language` /
  `document.specVersion` carry explicit fixed-value descriptions.

## 0.3.2

- **Route by capability quadrant, not by keyword or skill name.** The
  server-level `instructions` sent during the MCP `initialize` handshake, the
  tool boundary, and the `nuwax_render_openui` description now define routing as
  three quadrants. (1) Prefer: a single, self-contained visual interface that
  presents or collects structured information using standard components (KPI
  cards, charts, tables, forms, text, images)—dashboards, monitoring panels,
  reports, data-collection forms, status pages, in any wording or language. (2)
  Do NOT use OpenUI: multi-page apps / websites / client-side routing, games or
  highly interactive bespoke experiences, free-form documents, or anything
  needing arbitrary JavaScript / external scripts / raw HTML—those belong to
  ordinary code/files. (3) Gray zone: ask whether the deliverable is ONE
  self-contained interface and whether it can be expressed with structured data
  - standard components without arbitrary JS or pixel-level custom layout; if
    both are yes use OpenUI, and never silently fall back to a bare `*.html` file
    because the request sounds ambiguous.
- **Class-level exclusions, not skill-name enumeration.** The "no bare HTML / no
  SVG or PNG chart file / no frontend, dataviz, or charting code-generation
  skill" rule is phrased as an exclusion of a whole class of output paths, not a
  closed list of skill names, so newly added skills are covered too.
- **Pre-seed extension points for upcoming parity with official openui-lang.**
  (1) `presentation.density` (`"compact" | "normal"`, optional) is reserved for
  theme density and stored on the artifact; the compact token set already ships
  in the runtime. (2) `customComponents` is an optional placeholder that must be
  empty today, reserved for official-style `defineComponent` + `createLibrary`
  registration. (3) `bindings.tools` is an optional placeholder that must stay
  empty today, reserved for live MCP-tool data bindings. All are inert in this
  release.
- **Keep Query/Mutation out of the authoring surface while unexecuted.** The
  runtime does not execute Query/Mutation tool bindings, so the reference and
  tool schema no longer teach `Query(...)`/`Mutation(...)`/`@Run`. The render
  input schema now hard-rejects non-empty `bindings.tools` (`.max(0)`) instead
  of merely advising against it—the on-disk file schema keeps `max(32)` so
  existing artifacts still parse. `bindings.tools` is described as a reserved
  placeholder to leave empty, so an agent never authors bindings the runtime
  cannot run. `presentation.density`'s description now states plainly that it is
  stored-only with no visual effect today.
- Add a handshake-level regression test (`mcp-server.test.ts`) asserting that
  `instructions` is sent and that both it and the render tool description keep
  the quadrant routing rule, the no-multi-page boundary, and the class-level
  no-HTML / no-code-gen-skill exclusion; `openui-reference.test.ts` asserts the
  reference does NOT teach Query/Mutation/`@Run`.

## 0.3.1

- Add `nuwax_get_openui_update_guide` explaining that `*.openui.json` is the
  dedicated OpenUI Lang data source and how to update via
  `nuwax_render_openui` (reuse `artifactId`) or by editing the file while
  keeping `document.digest` valid.
- Clarify tool boundary: prefer `data/{artifactId}.openui.json`; do not invent
  bare `.openui` paths. Direct edits of `.openui.json` are allowed when the
  file contract is preserved.
- Strengthen reachability guidance: orphaned variables are validation errors
  (not silently dropped), with a minimal table wiring example and clearer
  orphan error text.

## 0.3.0

- **Smaller, faster-starting MCP server.** The server no longer imports
  `@openuidev/react-ui/genui-lib` at runtime, so it stops pulling react-dom,
  recharts, react-syntax-highlighter, and the full ~20 MB OpenUI renderer stack
  into the stdio process on every start. The component JSON Schema and authoring
  reference are now precomputed at build time into `src/generated/` and read as
  static files at runtime. `--version` now starts in ~25 ms.
- **Web bundle moved to a separate package.** The frozen renderer runtime
  (`runtime.js` + `runtime.css`) ships in the new `@nuwax-ai/openui-runtime`
  package instead of `@nuwax-ai/openui-mcp`. The MCP server package drops from
  862 kB to ~33 kB packed (3.7 MB → 137 kB unpacked). Hosts sync the runtime via
  `@nuwax-ai/openui-runtime/dist`.
- **Slimmed runtime dependencies.** `@openuidev/react-ui`, `react-dom`, and
  `zustand` are no longer runtime dependencies of the MCP server package (only
  `@modelcontextprotocol/sdk`, `@openuidev/react-lang`, `dotenv`, `react`, and
  `zod` remain); a clean install no longer resolves `react-dom`.
- **Removed source maps** from `dist` (`sourceMap` and `declarationMap` off).

## 0.2.4

- Support `openui-mcp --version` / `-V` to print the installed npm package
  version without starting the stdio MCP server.
- Resolve `OPENUI_MCP_VERSION` from `package.json` so CLI output and MCP
  `serverInfo.version` stay aligned.

## 0.2.3

- Add a compact density theme (`@nuwax-ai/openui-mcp/compact-theme`) tuned to the
  Nuwax host baseline (14px body text, tighter spacing and radii), and apply it
  to the frozen Runtime through the official `ThemeProvider` so sidecar and file
  preview render more compactly.
- Narrow the Runtime canvas from 1440px to 1080px and reduce its outer padding.

## 0.2.2

- Apply the Host-selected light or dark mode through OpenUI's official
  `ThemeProvider` instead of falling back to the operating-system color scheme.
- Keep the frozen Runtime light by default until a Host explicitly requests
  dark mode.

## 0.2.1

- Clarify that `nuwax_render_openui` creates OpenUI Artifacts and is never an alias for the blocking `nuwax_ask_question` interaction tool.
- Keep the MCP server-reported version aligned with the npm package version.

## 0.2.0

- Persist OpenUI artifacts as `data/{artifactId}.openui.json`.
- Support atomic updates by reusing `artifactId`.
- Return lightweight `nuwax.openui-ref/v1` results.
- Replace the localhost page server with a frozen postMessage Runtime bundle.
- Remove Artifact TTL, sidecar page URLs, and HTTP server configuration.

## 0.1.12

- Treat sidecar `structuredContent.page.url` as an internal local Runtime
  locator and explicitly prohibit Agents from showing it to users.
- Return only the Artifact ID in the sidecar tool text result. The Nuwax Host
  derives the authenticated user-facing proxy URL from conversation context.

## 0.1.11

- Fix dashboard authoring guidance for reactive filters: empty input/select
  bindings must bypass `@Filter` so initial KPIs, charts, and tables keep their
  source rows.
- Reject unguarded reactive `@Filter(..., $binding)` statements during Artifact
  validation, returning an actionable correction to the Agent.
- Require an explicit empty state for zero-total dynamic pie/radial chart data
  in the dashboard reference.
- Clarify that named numeric references inside chart arrays are supported; when
  all dashboard outputs are zero, the upstream filtered dataset is the first
  diagnostic target.

## 0.1.10

- Serve the optional shared OpenUI Runtime page for both inline and sidecar
  Artifacts; PC Web inline remains direct-Renderer-first.
- Add the `desktop-query` page transport used by the conversation-scoped Nuwax
  PC proxy.
- Use relative Runtime asset and Artifact URLs so non-root proxy prefixes work.
- Send `OPENUI_READY` and `OPENUI_RESIZE` messages for iframe integration and
  automatic height updates.
- Import the official OpenUI UI stylesheet inside the Runtime page to isolate it
  from host reset styles.
- Correct required validation for dates, date ranges, wrapped values, and option
  groups.
- Localize required validation messages for English, Simplified Chinese,
  Traditional Chinese, and Japanese.
- Add cache-versioned Runtime assets and synchronize the npm package, MCP server,
  and page asset versions.

## 0.1.9 and earlier

- Initial `nuwax_render_openui` tool, Artifact contract, authoring prompt, DSL
  schema resources, stdio/Streamable HTTP transports, and sidecar Runtime.
