# Nuwax OpenUI MCP

OpenUI over MCP for Nuwax Agent sessions. One MCP tool publishes a validated,
versioned OpenUI artifact that a host can present in either of two places:

- **inline** — rendered directly by the host Renderer by default, with an
  optional OpenUI Runtime iframe mode;
- **sidecar** — the same Runtime page opened in the preview area or a full page.

The project intentionally does not replace the host's chat transport, session
model, permission system, or tool status UI.

## Status

This repository contains the first executable foundation:

- `nuwax_render_openui` MCP tool;
- `nuwax.openui/v1` input and structured-result contract;
- stdio and Streamable HTTP transports;
- direct Renderer and page Runtime options for inline artifacts;
- one OpenUI React page Runtime shared by iframe-inline and sidecar artifacts;
- relative-path and desktop-query transports for proxied Runtime pages;
- `OPENUI_READY` / `OPENUI_RESIZE` page messages for iframe auto-sizing;
- localized required validation, including date and date-range values;
- isolated Runtime styles, independent from the Nuwax host reset stylesheet;
- source policy, artifact TTL, Host validation, CSP, and tests.

The default artifact store is in-memory. Production deployments should provide
a durable, tenant-aware `ArtifactStore` and authentication at the edge.

## Architecture

```text
Agent
  └─ MCP call: nuwax_render_openui
       └─ validate + persist artifact
            ├─ structuredContent → host discovers the artifact
            ├─ inline → host Renderer (default)
            └─ shared Runtime page
                 ├─ inline iframe (optional)
                 └─ sidecar preview / full page
```

`presentation.mode` controls where the host presents the Artifact; it does not
force an inline rendering technology. PC hosts should default inline Artifacts
to the direct Renderer and may explicitly select the iframe Runtime for stronger
style isolation or cross-client page reuse. `GET /openui/pages/:id` is available
for both inline and sidecar artifacts. For backward compatibility, only sidecar
structured results currently contain `artifact.page.url`; an iframe-inline host
builds its trusted page URL from its configured proxy route and `artifactId`.

OpenUI runtime queries and mutations are intentionally not proxied in the first
release. They must be added behind a host-controlled MCP proxy with tenant,
conversation, artifact, allowlist, permission, and audit checks.

## Requirements

- Node.js 20+
- pnpm 10+

## Install and verify

```bash
pnpm install
pnpm verify
```

Install the published package in a host project:

```bash
npm install @nuwax-ai/openui-mcp
```

## Run over stdio

```bash
pnpm build
pnpm dev:stdio
```

Example MCP client configuration:

```json
{
  "mcpServers": {
    "nuwax-openui": {
      "command": "node",
      "args": ["/absolute/path/to/nuwax-openui-mcp/dist/server/stdio.js"],
      "env": {
        "NUWAX_OPENUI_BASE_URL": "http://127.0.0.1:8787"
      }
    }
  }
}
```

The stdio process starts the sidecar HTTP server by default and both transports
share the same in-memory artifact store. Set
`NUWAX_OPENUI_SIDECAR_SERVER_ENABLED=false` only when another process owns the
page Runtime service. Page-based inline rendering also needs this service.

For NuwaClaw, configure this server as persistent so all Agent sessions share
one process and one sidecar port:

```json
{
  "mcpServers": {
    "nuwax-openui": {
      "command": "npx",
      "args": ["-y", "@nuwax-ai/openui-mcp@0.1.10"],
      "env": {
        "NUWAX_OPENUI_HOST": "127.0.0.1",
        "NUWAX_OPENUI_PORT": "8787",
        "NUWAX_OPENUI_BASE_URL": "http://127.0.0.1:8787",
        "NUWAX_OPENUI_ALLOWED_HOSTS": "127.0.0.1,localhost"
      },
      "enabled": true,
      "persistent": true
    }
  }
}
```

> **Note:** The package exposes `openui-mcp` as the default bin (matching the
> unscoped package name) so `npx @nuwax-ai/openui-mcp` resolves to the stdio
> entry. Aliases: `nuwax-openui-mcp` (stdio), `nuwax-openui-mcp-http` (HTTP).

## Run over Streamable HTTP

```bash
cp .env.example .env
pnpm build
pnpm start
```

Endpoints:

| Endpoint                    | Purpose                            |
| --------------------------- | ---------------------------------- |
| `POST /mcp`                 | MCP Streamable HTTP                |
| `GET /healthz`              | Health check                       |
| `GET /openui/artifacts/:id` | Artifact document for the renderer |
| `GET /openui/pages/:id`     | Shared inline/sidecar Runtime page |
| `GET /openui/assets/*`      | Runtime JavaScript and CSS         |

### Proxied page transports

The default page uses relative path assets and Artifact lookup:

```text
GET /openui/pages/{artifactId}
  ├─ ../assets/sidecar.css
  ├─ ../assets/sidecar.js
  └─ ../artifacts/{artifactId}
```

For the Nuwax PC desktop/file proxy, request the page with
`?transport=desktop-query`. The generated page keeps all subsequent requests on
the same conversation-scoped URL and changes only the query:

```text
?openui=css
?openui=js
?openui=artifact&artifactId={artifactId}
```

The query transport is a page transport convention, not a general-purpose
proxy. The Nuwax host must derive the conversation and target service from its
authenticated context and must not accept an arbitrary upstream URL.

## Tool contract

```json
{
  "schemaVersion": "nuwax.openui/v1",
  "title": "Release status",
  "presentation": {
    "mode": "inline",
    "autoOpen": false
  },
  "document": {
    "language": "openui-lang",
    "specVersion": "0.5",
    "source": "root = Stack([title])\ntitle = TextContent(\"Release is ready\", \"large-heavy\")"
  },
  "bindings": {
    "tools": []
  },
  "fallback": {
    "markdown": "Release is ready."
  }
}
```

The MCP response always contains a text fallback plus machine-readable
`structuredContent`. Hosts must identify OpenUI results by all three fields:

```text
tool name      = nuwax_render_openui
type           = nuwax.openui
schemaVersion  = nuwax.openui/v1
```

Do not infer UI from arbitrary MCP tool results.

## Agent authoring guidance

The server publishes the DSL contract through multiple MCP capabilities so an
Agent does not need to guess syntax or inspect installed package files:

| Capability | Name / URI                            | Purpose                                                                      |
| ---------- | ------------------------------------- | ---------------------------------------------------------------------------- |
| Tool       | `nuwax_get_openui_reference`          | Returns the generated authoring guide or complete DSL JSON Schema            |
| Prompt     | `nuwax_openui_authoring`              | Starts an authoring flow with a `basic`, `dashboard`, `form`, or `all` focus |
| Resource   | `nuwax://openui/schema/v0.5`          | Complete JSON Schema generated from the renderer's current component library |
| Resource   | `nuwax://openui/authoring-guide/v0.5` | Complete generated OpenUI Lang authoring guide                               |

`nuwax_render_openui` also includes trigger guidance and a minimal valid example
in its tool description and input schema. Agents should use it when the user
asks for a visual card, dashboard, chart, table, report, form, status panel, or
other structured interface even if the user does not explicitly mention
OpenUI.

For a complex interface, call `nuwax_get_openui_reference` with `format=guide`
and the closest profile before rendering. Clients that only expose MCP tools
can also retrieve the complete DSL schema with `format=schema`. OpenUI Lang is
assignment-based and is not XML, HTML, or JSX:

```text
root = Stack([title, status])
title = TextContent("Deployment", "large-heavy")
status = Callout("success", "Ready", "Deployment completed successfully.")
```

The JSON Schema and guide are generated from the exact OpenUI renderer library
used by this package, preventing the authoring contract from drifting away from
runtime behavior.

## Host integration

PC Web inline supports two rendering strategies. The direct Renderer is the
default because it has no local Runtime/network dependency and integrates with
the existing conversation lifecycle:

```tsx
<Renderer
  library={openuiLibrary}
  response={artifact.document.source}
  isStreaming={false}
/>
```

The host may explicitly select iframe mode for isolation or page-runtime
testing:

```tsx
<ToolProcessShell header={existingToolBar}>
  <iframe
    src={resolveTrustedOpenUiPageUrl(artifact.artifactId)}
    sandbox="allow-scripts"
    title={artifact.title}
  />
</ToolProcessShell>
```

For sidecar mode, `artifact.page.url` can be used only after the host validates
its origin and artifact context. Use a dedicated restrictive iframe sandbox;
do not reuse a broad legacy sandbox profile.

### Page bridge and automatic height

After an Artifact is loaded, the Runtime sends these messages to its parent:

```ts
type OpenUiRuntimeMessage =
  | {
      type: 'OPENUI_READY';
      protocolVersion: 'nuwax.openui-page/v1';
      artifactId: string;
    }
  | {
      type: 'OPENUI_RESIZE';
      protocolVersion: 'nuwax.openui-page/v1';
      artifactId: string;
      height: number;
    };
```

The current Runtime uses `ResizeObserver` on its rendered root, so form
validation messages, date selection, expanding content, and responsive wrapping
can update the iframe height. The host must validate `event.source`, the trusted
Runtime origin, `protocolVersion`, and `artifactId` before applying the height.
It should also clamp the height and provide an expand/scroll fallback for large
documents.

The v1 bridge currently reports readiness and size only. Host context, actions,
nonce/sequence replay protection, and native/mobile WebView bridges are planned
extensions and must not be assumed by clients yet.

### Runtime styles, validation, and locale

The page Runtime imports the official `@openuidev/react-ui` stylesheet inside
its own document. This prevents host rules such as `button { color: inherit }`
from overriding iframe-rendered OpenUI button colors. A direct Renderer shares
the host document and must load the official layered stylesheet plus scoped,
unlayered compatibility overrides for host reset rules.

The page Runtime replaces the built-in `required` validator to correctly accept
`Date`, date-range objects, wrapped values, and selected checkbox maps. Required
messages follow `navigator.language` for English, Simplified Chinese,
Traditional Chinese, and Japanese. Unknown locales fall back to English. A host
using the direct Renderer must install the equivalent validator integration in
its own JavaScript context; Nuwax PC Web does this through its i18n runtime.

## Security model

- OpenUI document size and line count are bounded.
- Script-like source patterns are rejected before persistence.
- Sidecar URLs are generated by this service, never accepted from the model.
- The HTTP server validates `Host` to reduce DNS rebinding exposure.
- Sidecar responses use CSP and no-store caching. Set
  `NUWAX_OPENUI_FRAME_ANCESTORS` to the exact Nuwax origins that may embed the
  page; the default permits only same-origin framing.
- Runtime MCP bindings are explicit and cannot contain wildcards.
- Mutations are data only in this contract; execution requires a separate,
  permission-aware host proxy.

This foundation is not a substitute for authentication. A production Nuwax
deployment must bind every artifact to user, tenant, conversation, message, and
tool-call context.

## Development

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## License

Apache License 2.0. See [LICENSE](LICENSE).
