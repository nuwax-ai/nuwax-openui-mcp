import type { Server } from 'node:http';

import type { AppConfig } from './config.js';
import { createHttpApp } from './http-app.js';
import type { OpenUiRuntime } from './runtime.js';

export interface StartHttpServerOptions {
  config: AppConfig;
  runtime: OpenUiRuntime;
}

export async function startHttpServer({
  config,
  runtime,
}: StartHttpServerOptions): Promise<Server> {
  const app = createHttpApp({ config, ...runtime });

  return new Promise((resolve, reject) => {
    const server = app.listen(config.port, config.host);
    const onError = (error: Error): void => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = (): void => {
      server.off('error', onError);
      resolve(server);
    };

    server.once('error', onError);
    server.once('listening', onListening);
  });
}

export async function closeHttpServer(server: Server): Promise<void> {
  if (!server.listening) return;

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
