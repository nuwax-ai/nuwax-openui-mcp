# Nuwax OpenUI MCP

`@nuwax-ai/openui-mcp` provides OpenUI authoring guidance, schema resources,
validation, and durable artifact generation for Nuwax Agent sessions.

## Architecture

The MCP server does not host pages. It writes OpenUI data into the active
project and returns a lightweight reference:

```text
nuwax_render_openui
  -> validate OpenUI Lang
  -> data/{artifactId}.openui.json
  -> nuwax.openui-ref/v1
```

Nuwax PC Web loads the data file and renders it with the frozen static runtime
at `/openui-runtime/index.html`. Inline, sidecar, and file preview all use that
same runtime.

## Installation

Configure the server as a session-scoped stdio MCP so it inherits the current
project directory:

```json
{
  "mcpServers": {
    "nuwax-openui": {
      "command": "npx",
      "args": ["-y", "@nuwax-ai/openui-mcp@0.2.0"]
    }
  }
}
```

Do not configure it as a persistent/global MCP. If the host cannot provide the
project as the process working directory or an MCP Root, set
`NUWAX_OPENUI_PROJECT_ROOT` explicitly.

The file repository is initialized lazily on the first render call. This avoids
creating a `data/` directory when a client starts the server only to discover
its tool list.

## Tools and resources

- `nuwax_render_openui`: creates or updates an Artifact file.
- `nuwax_get_openui_reference`: returns the authoring guide or schema.
- `nuwax://openui/schema/v0.5`: renderer-generated component schema.
- `nuwax://openui/authoring-guide/v0.5`: syntax and examples.
- `nuwax_openui_authoring`: reusable authoring prompt.

Call `nuwax_get_openui_reference` before producing complex forms, charts, or
dashboards.

## Creating an Artifact

```json
{
  "schemaVersion": "nuwax.openui/v1",
  "title": "Deployment status",
  "presentation": {
    "mode": "inline",
    "autoOpen": false
  },
  "document": {
    "language": "openui-lang",
    "specVersion": "0.5",
    "source": "root = Stack([title])\ntitle = TextContent(\"Ready\", \"large-heavy\")"
  },
  "bindings": { "tools": [] },
  "fallback": { "markdown": "Deployment is ready." }
}
```

The response is a `nuwax.openui-ref/v1` pointing to:

```text
data/{artifactId}.openui.json
```

Pass the same `artifactId` on a later call to atomically replace the Artifact.
The original `createdAt` is retained while `updatedAt` and the document digest
are refreshed.

## File contract

```json
{
  "type": "nuwax.openui-file",
  "schemaVersion": "nuwax.openui-file/v1",
  "artifactId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Deployment status",
  "presentation": { "mode": "inline", "autoOpen": false },
  "document": {
    "language": "openui-lang",
    "specVersion": "0.5",
    "source": "root = Stack([])",
    "digest": "sha256:..."
  },
  "bindings": { "tools": [] },
  "fallback": { "markdown": "" },
  "createdAt": "2026-07-22T00:00:00.000Z",
  "updatedAt": "2026-07-22T00:00:00.000Z"
}
```

Artifacts have no TTL. Their lifetime follows the project files and they can be
reviewed and versioned with Git.

## Development

```bash
pnpm install
pnpm verify
```

The web build produces `dist/web/runtime.js` and `dist/web/runtime.css`. In the
Nuwax repository, `scripts/sync-openui-runtime.sh` copies those assets into
`public/openui-runtime/`.
