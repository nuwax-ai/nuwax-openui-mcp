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

Produces `dist/runtime.js` and `dist/runtime.css`. The runtime is intentionally
**pure**: it speaks only standard `window.parent.postMessage` and carries no
web-view JSSDK or bridge logic — all uni-app x / 小程序 bridging lives in the host
entry `index.html` (see Consuming).

## Consuming (Nuwax host)

Run the host's `pnpm sync:openui-runtime`, which resolves this package and copies
`dist/{runtime.js,runtime.css}` into `public/static/openui-runtime/`.

The runtime emits `OPENUI_*` only via `window.parent.postMessage`. The host-maintained
entry `index.html` adapts that to the environment: in real iframes (PC web / H5) the
parent receives the postMessage directly; in a top-level webview (App / 小程序,
`window.parent === window`) it loads the official `/static/uni.webview.1.5.5.js` (the
single JSSDK copy, kept in the nuwax repo — **not** shipped by this package) and runs a
small bootstrap relay that forwards those messages to `<web-view>` `@message` via
`uni.webView.postMessage`. This package stays free of any uni-webview coupling. The
compact theme is shared from `@nuwax-ai/openui-mcp/compact-theme`.
