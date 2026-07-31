# Changelog

## 0.3.9

- **Mobile-aware rendering (`/mobile-layout`).** New subpath export
  `@nuwax-ai/openui-mcp/mobile-layout` with `createMobileAwareLibrary(base)` and
  `MobileLayoutProvider`. `createMobileAwareLibrary` overrides `Stack` / `Card` so that
  when `LayoutContext.layout === 'mobile'` their `direction` is forced to `column`
  (row → column); all other components, `componentGroups`, and `root` are preserved, and
  desktop behavior is unchanged. This lets the frozen web runtime and hosts render one
  identical `.openui.json` differently on mobile driven by a **runtime viewport flag**
  (via `LayoutContext`, not CSS-width media queries) — the upstream framework has no
  native mobile/responsive support. `@openuidev/react-ui` is declared as an **optional
  peer dependency** (only consumed by `/mobile-layout`; the MCP server itself never
  imports it, so the slim stdio process is unaffected).
- **Upgrade upstream OpenUI deps.** `@openuidev/react-ui` 0.12.1 → 0.13.2 and
  `@openuidev/react-lang` 0.2.8 → 0.2.9 (the mobile-layout override is implemented
  against the 0.13.x `defineComponent` / `createLibrary` / `LayoutContext` API). The
  generated component schema / reference are byte-identical to 0.3.8.

## 0.3.8

- **Make `/contracts` browser-safe.** Tool names that depend on reading
  `package.json` via `node:fs` moved to `tool-names.ts` (also exported as
  `@nuwax-ai/openui-mcp/tool-names` and from the package root). Hosts can import
  `@nuwax-ai/openui-mcp/contracts` without pulling `node:fs` / `node:path` /
  `node:url` into the Webpack bundle.

## 0.3.7

- **Render tool text is the `nuwax.openui-ref` JSON.** `nuwax_render_openui`
  still returns `structuredContent`, but `content[0].text` is now
  `JSON.stringify(artifact)` (no prose wrapper) so Host / Claude ACP paths that
  only read tool text can still parse `presentation.autoOpen` and open sidecar.
  Update guidance remains in the tool description and
  `nuwax_get_openui_update_guide`.
- **Export OpenUI type / schemaVersion helpers from contracts.** Hosts can import
  `OPENUI_REF_TYPE`, `OPENUI_FILE_TYPE`, `isOpenUiRenderInputSchemaVersion`,
  `isOpenUiRefType`, `isOpenUiFileType`, and `isOpenUiPayloadType` from
  `@nuwax-ai/openui-mcp/contracts` instead of hard-coding string prefixes.

## 0.3.6

- **Version-suffixed MCP tool names (version fingerprint).** The three registered
  tools now carry the package version as a suffix — e.g. `nuwax_render_openui_v0_3_6`,
  `nuwax_get_openui_reference_v0_3_6`, `nuwax_get_openui_update_guide_v0_3_6` — so the
  running version is visible directly in any MCP client's tool list. The suffix is
  derived from `package.json` (dots → underscores, `v` prefix; MCP tool names forbid
  dots) and therefore stays in lockstep with every release. Resource and prompt names
  are unchanged.
- **Record the MCP version in each artifact.** `data/{artifactId}.openui.json` now
  carries a top-level `mcpVersion` (e.g. `"0.3.6"`) written by `nuwax_render_openui`,
  giving every artifact a traceable version fingerprint. The field is optional on the
  file schema, so artifacts written by 0.3.5 and earlier still load.
- **Keep the package versions aligned.** The workspace-root `package.json` (which had
  lagged at `0.3.0`) and the `@nuwax-ai/openui-mcp` server package both move to
  `0.3.6`; `OPENUI_MCP_VERSION`, the CLI `--version`, the MCP `serverInfo.version`,
  the tool-name suffix, and the on-disk `mcpVersion` all resolve from the same
  `package.json`.

## 0.3.5

- **Remove `nuwax_validate_openui` from the MCP tool surface.** Dry-run validate
  tempted agents to stop after "valid" or to claim the UI was rendered without
  calling `nuwax_render_openui`. Source validation remains inside
  `nuwax_render_openui` (same `validateOpenUiDocument` path). The
  `OPENUI_VALIDATE_TOOL_NAME` / `openUiValidateInputSchema` exports stay as
  deprecated compatibility symbols only.
- **Anti-hallucination copy.** Server `instructions`, tool boundary, and render
  authoring hints now state: never tell the user the UI was created / opened /
  auto-opened until a successful `nuwax_render_openui` tool result is in hand;
  drafting OpenUI Lang in assistant text alone does nothing.

## 0.3.4

- **Force render after validate (fix false "already rendered").** Host shows
  inline/sidecar UI only from a successful `nuwax_render_openui` tool result.
  Validate success text now states it did NOT publish or open Host UI and that
  the agent MUST call `nuwax_render_openui` next (sidecar needs
  `mode:"sidecar"` + `autoOpen:true`). Server `instructions`, tool boundary,
  authoring hints, and update guide all state that validate / update_guide /
  hand-editing `*.openui.json` alone never opens conversation UI.

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
