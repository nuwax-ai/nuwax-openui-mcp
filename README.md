# Nuwax OpenUI MCP

pnpm workspace containing the Nuwax OpenUI MCP server and its frozen renderer
runtime.

## Packages

| Package                                        | Path               | Description                                                                                                                               |
| ---------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [`@nuwax-ai/openui-mcp`](packages/server)      | `packages/server`  | Lean stdio MCP server: OpenUI authoring guidance, validation, and durable artifact generation. Does **not** load the renderer at runtime. |
| [`@nuwax-ai/openui-runtime`](packages/runtime) | `packages/runtime` | Frozen, self-contained OpenUI renderer bundle (`runtime.js` + `runtime.css`) for sidecar / file preview.                                  |

See [`packages/server/README.md`](packages/server/README.md) for the MCP server
contract, installation, and artifact format.

## Development

```bash
pnpm install
pnpm verify          # format + lint + typecheck + test + build (both packages)
```

The server keeps its runtime lean: the component JSON Schema and authoring
reference are precomputed at build time (`pnpm gen:openui` →
`packages/server/src/generated/`) and read as static files, so the stdio process
never imports `@openuidev/react-ui` or `react-dom`.

## Publishing

```bash
pnpm publish --filter @nuwax-ai/openui-mcp
pnpm publish --filter @nuwax-ai/openui-runtime
```
