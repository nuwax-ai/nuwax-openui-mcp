import { createParser } from '@openuidev/react-lang';
import { openuiLibrary } from '@openuidev/react-ui/genui-lib';

const parser = createParser(openuiLibrary.toJSONSchema(), 'Stack');

export class OpenUiDocumentError extends Error {
  constructor(public readonly details: string[]) {
    super(`Invalid OpenUI document: ${details.join('; ')}`);
    this.name = 'OpenUiDocumentError';
  }
}

export function validateOpenUiDocument(source: string): void {
  const result = parser.parse(source);
  const errors = result.meta.errors.map((error) => error.message);

  if (!result.root) errors.push('The document has no renderable root.');
  if (result.root && result.root.typeName !== 'Stack') {
    errors.push('The root component must be Stack.');
  }
  if (result.meta.incomplete) errors.push('The document is incomplete.');
  if (result.meta.unresolved.length > 0) {
    errors.push(`Unresolved references: ${result.meta.unresolved.join(', ')}.`);
  }
  if (result.meta.orphaned.length > 0) {
    errors.push(`Orphaned statements: ${result.meta.orphaned.join(', ')}.`);
  }

  if (errors.length > 0) throw new OpenUiDocumentError(errors);
}
