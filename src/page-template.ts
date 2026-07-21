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
): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="referrer" content="no-referrer" />
    <title>${escapeHtml(title)}</title>
    <link rel="stylesheet" href="/openui/assets/sidecar.css" />
  </head>
  <body>
    <main id="root" data-artifact-id="${escapeHtml(artifactId)}"></main>
    <script type="module" src="/openui/assets/sidecar.js"></script>
  </body>
</html>`;
}
