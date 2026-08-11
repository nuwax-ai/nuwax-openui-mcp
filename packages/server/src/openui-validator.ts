import { createParser } from '@openuidev/react-lang';

import { readOpenUiSchemaText } from './openui-assets.js';

const schema = JSON.parse(readOpenUiSchemaText());
const parser = createParser(schema, 'Stack');

// Enum-typed props per component, straight from the schema
// (generated/openui-schema.json). OpenUI components use purely positional
// signatures; the parser maps positional args onto named props but does NOT
// validate enum values — so a correct token written in the wrong slot (e.g. a
// gap value where direction goes) parses silently and renders a broken layout.
// We walk the parsed tree and reject any enum prop whose value is not allowed.
const COMPONENT_ENUM_PROPS = buildComponentEnumProps(schema);

// Enum tokens are simple words (row, donut, large-heavy, 2xl, ...); binding
// expressions ($var, @Filter, a == b ? ...) never match this, so reactive values
// are left untouched.
const ENUM_LITERAL = /^[A-Za-z0-9-]+$/;

function buildComponentEnumProps(
  schemaValue: unknown,
): Map<string, Map<string, string[]>> {
  const defs =
    (schemaValue as { $defs?: Record<string, unknown> })?.$defs ?? {};
  const result = new Map<string, Map<string, string[]>>();
  for (const [component, def] of Object.entries(defs)) {
    const properties =
      (def as { properties?: Record<string, { enum?: unknown[] }> })
        ?.properties ?? {};
    for (const [prop, spec] of Object.entries(properties)) {
      if (!Array.isArray(spec?.enum)) continue;
      const values = spec.enum.filter(
        (v): v is string => typeof v === 'string',
      );
      if (values.length === 0) continue;
      let propMap = result.get(component);
      if (!propMap) {
        propMap = new Map();
        result.set(component, propMap);
      }
      propMap.set(prop, values);
    }
  }
  return result;
}

function looksLikeElement(
  value: unknown,
): value is { typeName: string; props?: Record<string, unknown> } {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as { typeName?: unknown }).typeName === 'string'
  );
}

function visitElements(
  node: unknown,
  visit: (typeName: string, props: Record<string, unknown>) => void,
): void {
  if (!node || typeof node !== 'object') return;
  const element = node as {
    typeName?: string;
    props?: Record<string, unknown>;
  };
  if (typeof element.typeName === 'string') {
    visit(element.typeName, element.props ?? {});
  }
  const props = element.props;
  if (!props) return;
  // Elements nest under many prop names, not just `children` — e.g. Table.columns,
  // BarChart.series, Tabs/Steps/Accordion items. Recurse through every prop value
  // that holds element nodes; plain data arrays/objects have no `typeName` and are
  // left untouched.
  for (const value of Object.values(props)) {
    if (Array.isArray(value)) {
      for (const item of value) visitElements(item, visit);
    } else if (looksLikeElement(value)) {
      visitElements(value, visit);
    }
  }
}

export class OpenUiDocumentError extends Error {
  constructor(public readonly details: string[]) {
    super(`Invalid OpenUI document: ${details.join('; ')}`);
    this.name = 'OpenUiDocumentError';
  }
}

export function validateOpenUiDocument(source: string): void {
  const result = parser.parse(source);
  const errors = result.meta.errors.map((error) => error.message);

  for (const line of source.split(/\r?\n/)) {
    const filterIndex = line.indexOf('@Filter(');
    const fallbackIndex = line.indexOf('?');
    const hasReactiveFilterValue =
      filterIndex >= 0 &&
      /@Filter\([^\n]*,\s*\$[A-Za-z_][A-Za-z0-9_]*\s*\)/.test(line);
    const hasFallbackBeforeFilter =
      fallbackIndex >= 0 && fallbackIndex < filterIndex;

    if (hasReactiveFilterValue && !hasFallbackBeforeFilter) {
      errors.push(
        'Reactive Filter binding must handle its empty initial value with a conditional fallback before @Filter.',
      );
    }
  }

  if (!result.root) errors.push('The document has no renderable root.');
  if (result.root && result.root.typeName !== 'Stack') {
    errors.push('The root component must be Stack.');
  }
  if (result.meta.incomplete) errors.push('The document is incomplete.');
  if (result.meta.unresolved.length > 0) {
    errors.push(`Unresolved references: ${result.meta.unresolved.join(', ')}.`);
  }
  if (result.meta.orphaned.length > 0) {
    errors.push(
      `Orphaned statements: ${result.meta.orphaned.join(', ')}. ` +
        'These names are defined but never referenced from root ' +
        '(e.g. usersData unused by Table/Col/Stack). ' +
        'Wire them into Col/Table/Stack children, or delete them. ' +
        'Call nuwax_get_openui_reference with profile=dashboard for a minimal table example.',
    );
  }

  if (result.root) {
    visitElements(result.root, (typeName, props) => {
      const enumProps = COMPONENT_ENUM_PROPS.get(typeName);
      if (!enumProps) return;
      for (const [prop, allowed] of enumProps) {
        const value = props[prop];
        if (typeof value !== 'string' || !ENUM_LITERAL.test(value)) continue;
        if (allowed.includes(value)) continue;
        const allowedText = allowed.map((v) => `"${v}"`).join(', ');
        // If this value is valid for a sibling prop of the same component, the
        // caller most likely put a value in the wrong positional slot.
        const sibling = [...enumProps.keys()].find(
          (other) => other !== prop && enumProps.get(other)!.includes(value),
        );
        if (sibling) {
          errors.push(
            `${typeName}.${prop} must be one of ${allowedText} but got "${value}" — "${value}" is a valid ${typeName}.${sibling} value. ` +
              `It looks like the ${sibling} was written in the ${prop} slot; check the positional argument order.`,
          );
        } else {
          errors.push(
            `${typeName}.${prop} must be one of ${allowedText} but got "${value}".`,
          );
        }
      }
    });
  }

  if (errors.length > 0) throw new OpenUiDocumentError(errors);
}
