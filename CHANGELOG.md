# Changelog

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
