import { OPENUI_MCP_VERSION } from './version.js';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function createSidecarPageHtml(
  artifactId: string,
  title: string,
  transport: 'path' | 'desktop-query' = 'path',
): string {
  const stylesheetUrl =
    transport === 'desktop-query'
      ? `?openui=css&v=${OPENUI_MCP_VERSION}`
      : `../assets/sidecar.css?v=${OPENUI_MCP_VERSION}`;
  const scriptUrl =
    transport === 'desktop-query'
      ? `?openui=js&v=${OPENUI_MCP_VERSION}`
      : `../assets/sidecar.js?v=${OPENUI_MCP_VERSION}`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="referrer" content="no-referrer" />
    <title>${escapeHtml(title)}</title>
    <link rel="stylesheet" href="${stylesheetUrl}" />
  </head>
  <body>
    <main id="root" data-artifact-id="${escapeHtml(artifactId)}"></main>
    <script type="module" src="${scriptUrl}"></script>
  </body>
</html>`;
}
