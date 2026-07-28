import { OPENUI_SCHEMA_VERSION } from '../contracts.js';

export const validInlineInput = {
  schemaVersion: OPENUI_SCHEMA_VERSION,
  title: 'Deployment summary',
  presentation: { mode: 'inline' as const, autoOpen: false },
  document: {
    language: 'openui-lang' as const,
    specVersion: '0.5' as const,
    source:
      'root = Stack([title, status])\ntitle = TextContent("Deployment", "large-heavy")\nstatus = Callout("success", "Ready", "Deployment completed successfully.")',
  },
  bindings: { tools: [] },
  fallback: { markdown: 'Deployment is ready.' },
};
