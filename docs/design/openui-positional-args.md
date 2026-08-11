# OpenUI 位置参数错位：设计备忘（internal）

> 记录「OpenUI Lang 位置参数错位 → 静默渲染坏布局」这类问题的根因、**OpenUI 官方**
> 的方案思路、本仓库已落地的根治方案、其覆盖边界。内部备忘，不作为上游 issue/PR 发出。

## 1. 根因（已实测）

`@openuidev/react-lang` 的 `createParser(schema, root)` 行为：

- **纯位置参数**：`Component(a, b, c)` 按 schema `properties` 顺序映射成具名 props。
  `Stack([...], "l")` → `props.direction = "l"`。
- **不校验 enum 取值**：parser 只做位置→具名映射，**不检查值是否属于该 prop 的 `enum`**。
  `direction` 只允许 `row`/`column`，`"l"` 被静默接受 → 渲染器拿到非法 flex 方向 → 布局塌陷。
- **多余位置参数**：报 `excess dropped`；必需之外的可选位置参数（如 `Col.type`）正常捕获。
- **同类型 / `any` 位置参数换位无信号**：`xLabel`/`yLabel` 同为 string、`labels`/`series`
  同为 array、`Col.data` 为 `any`——仅凭值无法区分谁是谁。

## 2. OpenUI 官方的方案思路

来源：`@openuidev/react-ui` 的 `openuiLibrary.prompt({})`（即本仓库 `generated/openui-reference.txt`
的原文）——这是官方权威的 authoring 规则。其「Syntax Rules」明确：

> 5. EVERY variable (except root) MUST be referenced… **Unreferenced variables are silently
>    dropped and will NOT render.**
> 6. **Arguments are POSITIONAL (order matters, not names).** Write `Stack([children], "row", "l")`
>    **NOT** `Stack([children], direction: "row", gap: "l")` — **colon syntax is NOT supported
>    and silently breaks.**
> 7. **Optional arguments can be omitted from the end.**

结论——官方对这个问题的处理是：

- **纯位置参数是有意设计**，不是疏漏。colon / 具名语法被**明确拒绝**，且被告知「silently breaks」。
- 官方**不做校验**：未引用变量「silently dropped」、参数错位「silently breaks」，都是被**接受**的
  语言行为；责任转嫁给作者（「Always include…」「omit from the end」）。
- 官方「方案」= **文档 + 作者自律**（把规则写进 LLM 用的 prompt），不在 parser/渲染器里拦截。

这决定了我们（下游消费方）的定位：**做官方刻意不提供的那一层——校验安全网**，把官方的
「silently breaks / silently dropped」转成**显式、可操作的报错**。这与本仓库既有做法一致：
官方说未引用变量 silently dropped，我们的 validator 就把它升级成 `Orphaned statements` 硬错误。
本次对 enum 错位的校验，是同一条路线的延续。

## 3. 本仓库的根治方案（已实现，三层闭环）

以 generated schema 为唯一事实源：

1. **校验执行** — `packages/server/src/openui-validator.ts`
   - `COMPONENT_ENUM_PROPS` 从 `generated/openui-schema.json` 自动构建「组件→enum prop→合法值」。
   - `visitElements` 递归**全部嵌套**（含 `Table.columns`、`BarChart.series`，非仅 `children`）。
   - 非法 enum 值 → 拒绝；若值恰为同组件兄弟 prop 合法值 → 给「写错槽」修复提示。
   - binding 表达式（`$var` / `@Filter` / 三目）用 `ENUM_LITERAL = /^[A-Za-z0-9-]+$/` 跳过，不误报。
   - `render-service.ts` 每次渲染前调用，错误以 `isError` 工具结果回传 agent。
2. **契约可读** — `scripts/openui-schema-overlay.mjs`（generator overlay）
   - 对上游 `toJSONSchema()` 结果，补齐缺失的组件 `description`（枚举值优先）。纯增量、幂等。
3. **生成端教学** — `openui-reference.ts` 的 `POSITIONAL_ARGS_GUARDRAILS`
   - 所有 profile 都带：明确「无具名参数、位置签名固定」+ Stack direction/gap 正反例 + 校验上限说明。

**覆盖：全部 34 个 enum prop**（Stack/Card/图表/Col/Tag/Button…）。新增 schema 组件的 enum prop
**自动被覆盖，无需改代码**。

## 4. 覆盖边界（诚实）

| 子类                                                                        | 状态                  |
| --------------------------------------------------------------------------- | --------------------- |
| enum 值写错槽（direction/gap/variant/Col.type…）                            | ✅ 已根治（三层闭环） |
| 同类型 / `any` 位置参数换位（xLabel/yLabel、labels/series、Col label/data） | ❌ 校验层不可解       |

**为何类型校验也补不了后一类**：实测 `Col.data` 为 `any`、`labels`/`series` 同为 array、
`xLabel`/`yLabel` 同为 string；且真实值多为命名引用（`usersData.name`、`data.rows`），为避免
误报必须跳过引用 → 类型校验真实覆盖率接近 0，ROI 不可行。

## 5. 关于「具名参数」根解（不推进）

理论上，唯一能让「非-enum 位置换位」也消失的是语法层**具名参数**：
`Stack(children=[...], direction="column", gap="l")`。

但 §2 已确认：**OpenUI 官方明确拒绝具名/colon 语法，纯位置是其有意设计**（为 LLM 生成更紧凑、
更利流式）。因此本仓库**不向上游提具名参数提案**——与官方设计哲学冲突，属逆向推动，ROI 低。
我们的正确姿势是 **§3 的下游校验加固**：不动语言本身，把官方接受为 silent 的失败，在消费侧拦响。

## 6. 扩展指引

- **新增带 enum 的组件**：validator 自动覆盖（吃 generated schema）。若上游 schema 未给 enum，
  先在 overlay 或上游补 enum，再 `pnpm gen:openui`。
- **schema 变更**：`pnpm gen:openui` 重生成；overlay 幂等，不会重复或破坏既有 description。
- **新的「silent 失败」**：按本备忘 §2 的定位——优先转成 validator 里的显式硬错误（参考既有
  `Orphaned statements` 与 `enum` 校验），而非试图改语言。
- **回归基线**：`pnpm test`（含 validator / reference / overlay 测试）+ `pnpm typecheck`。
