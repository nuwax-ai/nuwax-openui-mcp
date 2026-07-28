# Nuwax OpenUI Runtime

`@nuwax-ai/openui-runtime` ships the **frozen static OpenUI renderer bundle**
(`dist/runtime.js` + `dist/runtime.css`) used by the Nuwax host for sidecar and
file-preview rendering.

It is intentionally separate from the MCP server package
([`@nuwax-ai/openui-mcp`](../../README.md)):

- The MCP server is the small, fast-starting stdio process agents spawn. It must
  stay lean, so it does not carry this multi-megabyte renderer bundle.
- This package holds the heavy bundle (React, react-dom, the OpenUI component
  library, charts, syntax highlighting) inlined into a single self-contained
  `runtime.js`. It is **never imported as a module** — the host copies the static
  files into `public/static/openui-runtime/`.

The bundle is fully self-contained: every dependency is a `devDependency`
(build-time only). There are no runtime `dependencies`.

## Build

```bash
pnpm install
pnpm --filter @nuwax-ai/openui-runtime build
```

Produces `dist/runtime.js` and `dist/runtime.css`.

## Consuming (Nuwax host)

Run the host's `pnpm sync:openui-runtime`, which resolves this package and copies
`dist/{runtime.js,runtime.css}` into `public/static/openui-runtime/`. The compact
theme is shared from `@nuwax-ai/openui-mcp/compact-theme`.
