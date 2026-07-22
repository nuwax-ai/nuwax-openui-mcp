import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express, { type Express, type Request, type Response } from 'express';

import type { ArtifactStore } from './artifact-store.js';
import type { AppConfig } from './config.js';
import { createOpenUiMcpServer } from './mcp-server.js';
import { createSidecarPageHtml } from './page-template.js';
import type { RenderOpenUiService } from './render-service.js';

export interface HttpAppDependencies {
  config: AppConfig;
  store: ArtifactStore;
  renderService: RenderOpenUiService;
}

function requestHost(request: Request): string {
  return (request.headers.host ?? '').split(':')[0] ?? '';
}

function addSecurityHeaders(
  response: Response,
  frameAncestors: string[],
): void {
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader(
    'Content-Security-Policy',
    `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors ${frameAncestors.join(' ')}`,
  );
}

export function createHttpApp(dependencies: HttpAppDependencies): Express {
  const { config, renderService, store } = dependencies;
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.use((request, response, next) => {
    if (!config.allowedHosts.includes(requestHost(request))) {
      response.status(421).json({ error: 'Untrusted Host header.' });
      return;
    }
    next();
  });

  app.get('/healthz', (_request, response) => {
    response.json({ status: 'ok', service: 'nuwax-openui-mcp' });
  });

  app.post('/mcp', async (request, response) => {
    const server = createOpenUiMcpServer(renderService);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    response.on('close', () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(request, response, request.body);
    } catch (error) {
      if (!response.headersSent) {
        response.status(500).json({
          error: error instanceof Error ? error.message : 'MCP request failed.',
        });
      }
    }
  });

  app.get('/openui/artifacts/:artifactId', async (request, response) => {
    const artifact = await store.get(request.params.artifactId);
    if (!artifact) {
      response.status(404).json({ error: 'Artifact not found or expired.' });
      return;
    }
    response.setHeader('Cache-Control', 'private, no-store');
    response.json(artifact);
  });

  app.get('/openui/pages/:artifactId', async (request, response) => {
    const artifact = await store.get(request.params.artifactId);
    // The page runtime is shared by inline and sidecar hosts. Presentation
    // controls how the host displays it, not whether a page can be rendered.
    if (!artifact) {
      response.status(404).send('Artifact not found or expired.');
      return;
    }
    addSecurityHeaders(response, config.frameAncestors);
    response.setHeader('Cache-Control', 'private, no-store');
    response
      .type('html')
      .send(
        createSidecarPageHtml(
          artifact.artifactId,
          artifact.title,
          request.query.transport === 'desktop-query'
            ? 'desktop-query'
            : 'path',
        ),
      );
  });

  const moduleDirectory = dirname(fileURLToPath(import.meta.url));
  const webAssetsDirectory = resolve(moduleDirectory, '../web');
  if (existsSync(webAssetsDirectory)) {
    app.use(
      '/openui/assets',
      express.static(webAssetsDirectory, {
        immutable: true,
        maxAge: '1y',
      }),
    );
  }

  return app;
}
