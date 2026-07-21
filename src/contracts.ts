import { z } from 'zod';

export const OPENUI_SCHEMA_VERSION = 'nuwax.openui/v1' as const;
export const OPENUI_LANG_VERSION = '0.5' as const;
export const OPENUI_TOOL_NAME = 'nuwax_render_openui' as const;

const bindingSchema = z.object({
  serverId: z.string().trim().min(1).max(128),
  toolName: z.string().trim().min(1).max(128),
  access: z.enum(['query', 'mutation']),
});

export const renderOpenUiInputSchema = z.object({
  schemaVersion: z.literal(OPENUI_SCHEMA_VERSION),
  title: z.string().trim().min(1).max(160),
  presentation: z.object({
    mode: z.enum(['inline', 'sidecar']),
    preferredWidth: z.enum(['compact', 'normal', 'wide']).optional(),
    autoOpen: z.boolean().default(false),
  }),
  document: z.object({
    language: z.literal('openui-lang'),
    specVersion: z.literal(OPENUI_LANG_VERSION),
    source: z.string().min(1).max(100_000),
  }),
  bindings: z
    .object({
      tools: z.array(bindingSchema).max(32),
    })
    .default({ tools: [] }),
  fallback: z
    .object({
      markdown: z.string().max(20_000).default(''),
    })
    .default({ markdown: '' }),
});

export const openUiArtifactSchema = z.object({
  type: z.literal('nuwax.openui'),
  schemaVersion: z.literal(OPENUI_SCHEMA_VERSION),
  artifactId: z.string().uuid(),
  title: z.string(),
  presentation: z.object({
    mode: z.enum(['inline', 'sidecar']),
    autoOpen: z.boolean(),
    preferredWidth: z.enum(['compact', 'normal', 'wide']).optional(),
  }),
  document: z.object({
    language: z.literal('openui-lang'),
    specVersion: z.literal(OPENUI_LANG_VERSION),
    source: z.string(),
    digest: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  }),
  bindings: z.object({
    tools: z.array(bindingSchema),
  }),
  page: z
    .object({
      url: z.string().url(),
      expiresAt: z.string().datetime(),
      sandboxProfile: z.literal('openui-sidecar-v1'),
    })
    .optional(),
  fallback: z.object({
    markdown: z.string(),
  }),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

export type RenderOpenUiInput = z.infer<typeof renderOpenUiInputSchema>;
export type OpenUiArtifact = z.infer<typeof openUiArtifactSchema>;
export type OpenUiBinding = z.infer<typeof bindingSchema>;
