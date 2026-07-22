import { z } from 'zod';

export const OPENUI_SCHEMA_VERSION = 'nuwax.openui/v1' as const;
export const OPENUI_LANG_VERSION = '0.5' as const;
export const OPENUI_TOOL_NAME = 'nuwax_render_openui' as const;
export const OPENUI_REFERENCE_TOOL_NAME = 'nuwax_get_openui_reference' as const;
export const OPENUI_AUTHORING_PROMPT_NAME = 'nuwax_openui_authoring' as const;
export const OPENUI_SCHEMA_RESOURCE_URI = 'nuwax://openui/schema/v0.5' as const;
export const OPENUI_GUIDE_RESOURCE_URI =
  'nuwax://openui/authoring-guide/v0.5' as const;

export const openUiReferenceInputSchema = z.object({
  format: z
    .enum(['guide', 'schema'])
    .default('guide')
    .describe(
      'Use guide for authoring instructions, component signatures, and examples. Use schema for the complete renderer-generated JSON Schema.',
    ),
  profile: z
    .enum(['basic', 'dashboard', 'form', 'all'])
    .default('basic')
    .describe(
      'Component reference to return: basic for cards/content, dashboard for tables/charts, form for inputs/actions, all only when the other profiles are insufficient.',
    ),
});

const bindingSchema = z.object({
  serverId: z.string().trim().min(1).max(128),
  toolName: z.string().trim().min(1).max(128),
  access: z.enum(['query', 'mutation']),
});

export const renderOpenUiInputSchema = z.object({
  schemaVersion: z
    .literal(OPENUI_SCHEMA_VERSION)
    .describe('Always use nuwax.openui/v1.'),
  title: z.string().trim().min(1).max(160).describe('Visible UI title.'),
  presentation: z.object({
    mode: z
      .enum(['inline', 'sidecar'])
      .describe(
        'Use inline for cards, forms, tables, and compact dashboards in chat. Use sidecar only for a full-page experience.',
      ),
    preferredWidth: z.enum(['compact', 'normal', 'wide']).optional(),
    autoOpen: z.boolean().default(false),
  }),
  document: z.object({
    language: z.literal('openui-lang'),
    specVersion: z.literal(OPENUI_LANG_VERSION),
    source: z
      .string()
      .min(1)
      .max(100_000)
      .describe(
        'OpenUI Lang assignment syntax, NEVER XML/HTML/JSX. The first line must define root = Stack(...); arguments are positional. Minimal valid example: root = Stack([title])\\ntitle = TextContent("Ready", "large-heavy"). Call nuwax_get_openui_reference before authoring a complex document or whenever a signature is uncertain.',
      ),
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
export type OpenUiReferenceInput = z.infer<typeof openUiReferenceInputSchema>;
export type OpenUiArtifact = z.infer<typeof openUiArtifactSchema>;
export type OpenUiBinding = z.infer<typeof bindingSchema>;
