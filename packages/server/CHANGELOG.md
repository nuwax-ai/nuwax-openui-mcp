# Changelog

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
