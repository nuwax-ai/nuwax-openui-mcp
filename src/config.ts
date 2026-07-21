import { z } from 'zod';

const configSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().min(1).max(65_535),
  baseUrl: z.string().url(),
  sidecarServerEnabled: z.boolean(),
  allowedHosts: z.array(z.string().min(1)).min(1),
  frameAncestors: z.array(z.string().min(1)).min(1),
  artifactTtlSeconds: z.coerce.number().int().min(60).max(86_400),
});

export type AppConfig = z.infer<typeof configSchema>;

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  throw new Error(`Invalid boolean value "${value}".`);
}

function parseCsv(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseFrameAncestors(value: string): string[] {
  return parseCsv(value).map((item) => {
    if (item === "'self'" || item === "'none'") return item;

    const url = new URL(item);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== item) {
      throw new Error(
        `Invalid frame ancestor "${item}". Use an exact HTTP(S) origin.`,
      );
    }
    return item;
  });
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const host = env.NUWAX_OPENUI_HOST ?? '127.0.0.1';
  const port = env.NUWAX_OPENUI_PORT ?? '8787';

  return configSchema.parse({
    host,
    port,
    baseUrl: env.NUWAX_OPENUI_BASE_URL ?? `http://${host}:${String(port)}`,
    sidecarServerEnabled: parseBoolean(
      env.NUWAX_OPENUI_SIDECAR_SERVER_ENABLED,
      true,
    ),
    allowedHosts: parseCsv(
      env.NUWAX_OPENUI_ALLOWED_HOSTS ?? '127.0.0.1,localhost',
    ),
    frameAncestors: parseFrameAncestors(
      env.NUWAX_OPENUI_FRAME_ANCESTORS ?? "'self'",
    ),
    artifactTtlSeconds: env.NUWAX_OPENUI_ARTIFACT_TTL_SECONDS ?? '3600',
  });
}
