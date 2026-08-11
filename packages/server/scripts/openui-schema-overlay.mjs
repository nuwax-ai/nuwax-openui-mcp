/**
 * 构建期 schema description overlay。
 *
 * `generated/openui-schema.json` 由上游 `@openuidev/react-ui` 的 `toJSONSchema()`
 * 生成，但部分组件缺 `description`（Input/TextArea/Select/DatePicker/CheckBoxGroup/
 * CheckBoxItem/RadioGroup/RadioItem），导致 `format=schema` 输出对模型不可读、
 * 位置参数 / 枚举契约不全。本 overlay 在生成后补齐「缺失」的 description：
 * 枚举型 prop 优先列出合法值（这是位置参数错位的高发区），其余 prop 给出名字清单。
 *
 * 纯增量、幂等：已有 description 的组件一律不动，故可安全重复执行；上游补齐后可删。
 */
export function applyDescriptionOverlay(schema) {
  const defs = schema?.$defs ?? schema?.definitions ?? {};
  for (const [name, def] of Object.entries(defs)) {
    if (!def || typeof def !== 'object') continue;
    if (typeof def.description === 'string' && def.description.trim()) continue;
    const props = def.properties ?? {};
    const entries = Object.entries(props);
    if (entries.length === 0) continue;
    const enumParts = [];
    const otherParts = [];
    for (const [prop, spec] of entries) {
      if (Array.isArray(spec?.enum) && spec.enum.length > 0) {
        enumParts.push(`${prop}=${spec.enum.join('|')}`);
      } else {
        otherParts.push(prop);
      }
    }
    const bits = [];
    if (enumParts.length > 0) bits.push(`Enum props: ${enumParts.join('; ')}.`);
    if (otherParts.length > 0)
      bits.push(`Other props: ${otherParts.join(', ')}.`);
    def.description = `${name} component. ${bits.join(' ')}`.trim();
  }
  return schema;
}
