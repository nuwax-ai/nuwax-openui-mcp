# Proposal: Named (keyword) arguments for OpenUI Lang

> 摘要：OpenUI Lang 当前只支持位置参数，组件签名顺序固定。值放错位置槽会**静默**
> 渲染成坏布局（例如 `Stack([...], "l")` 把 gap 值当 direction）。本提案建议在保留
> 位置参数的基础上**新增具名参数**（`Stack(children=[...], direction="column", gap="l")`），
> 让参数身份显式化，从语法层根除「值对、槽错」这一整类问题。

- **目标仓库**：`@openuidev/react-lang`（解析器）+ `@openuidev/react-ui`（组件 schema/渲染）
- **提案方**：nuwax-openui-mcp 维护方
- **状态**：草案，待与上游对齐

## 1. 背景（已核实的事实）

在 `@openuidev/react-lang` 的 `createParser(schema, rootComponent)` 上实测：

1. **纯位置参数**：调用 `Component(a, b, c)` 按 schema `properties` 顺序映射为具名 props。
   `Stack([...], "l")` → `props.direction = "l"`。
2. **不校验 enum 取值**：parser 把位置参数映射成 props，但**不检查值是否属于该 prop 的
   `enum`**。`direction` 合法值只有 `row`/`column`，`"l"` 被静默接受 → 渲染器拿到非法 flex
   方向 → 布局塌陷。
3. **多余位置参数被丢弃并报错**：`Col(label, data, type, extra)` → `meta.errors` 报
   `Col takes 3 arg(s), got 4 (1 excess dropped)`；必需之外的可选位置参数（如 `Col.type`）
   会被正常捕获。
4. **同类型 / `any` 类型位置参数的换位无法识别**：`BarChart(xLabel, yLabel)` 都是 string，
   `BarChart(labels, series)` 都是 array，`Col(label, data)` 的 data 是 `any`。仅凭值本身
   没有任何信号能区分「谁是谁」。

下游 MCP（本仓库）已在**校验层**对 enum 类错位做了根治（schema 驱动，覆盖全部 34 个 enum
prop，带「写错槽」提示），并在生成端文档显式化纯位置参数契约。但**非 enum 的位置换位**
（同类型 / `any`）在校验层不可解——只有语法层支持具名参数才能彻底消除。

## 2. 目标 / 非目标

**目标**

- 让每个参数的身份可显式指定，不再依赖位置。
- 完全后向兼容：现有位置参数写法继续可用、语义不变。
- 让「值对、槽错」在**写的时候**就不可能发生，而非写完再靠校验/渲染发现。

**非目标**

- 不改变 OpenUI Lang 的赋值式语句结构（`name = Component(...)`）。
- 不引入动态计算 / 新表达式语义；仅扩展调用参数的写法。
- 不强制具名（不破坏存量 source）。

## 3. 提案语法

在调用参数列表中允许 `name = value` 形式；与位置参数可混用。

```
# 纯位置（现状，继续有效）
root = Stack([header, body], "column", "l")

# 纯具名（顺序无关）
root = Stack(children=[header, body], direction="column", gap="l")
root = Stack(gap="l", direction="column", children=[header, body])

# 混用：未具名的按声明顺序填前若干位，具名的按名填
root = Stack([header, body], direction="column", gap="l")
```

### 解析规则（建议）

1. 调用形如 `Component( arg (',' arg)* )`，其中每个 `arg` 是 `value` 或 `name = value`。
2. `name = value` 在调用内出现即视为具名参数；`name` 必须是该组件 schema 的某个 prop。
3. 未具名的 `value` 按**声明顺序**填入尚未被具名占据的最靠前位置槽（Python 语义，禁止
   「位置参数出现在具名参数之后」以避免歧义，或显式允许——见开放问题）。
4. 具名参数名不在 schema `properties` 中 → **解析期错误**（`Unknown property <name> for
<Component>`），替代当前的「多余位置参数静默丢弃」。
5. 同一 prop 既被位置占据又被具名 → 解析期错误（重复赋值）。

> 关键：`name = value` 在调用内出现即具名，与语句级赋值 `x = ...` 的 `=` 不冲突——后者只
> 出现在行首 `标识符 =` 位置，前者只出现在 `(...)` 内部、且左侧是 prop 名。

## 4. 为什么这能根治该类问题

| 失败类别                                        | 现状                | 具名参数后                                     |
| ----------------------------------------------- | ------------------- | ---------------------------------------------- |
| enum 值写错槽（direction/gap/variant/Col.type） | 下游校验已拦 + 提示 | 写法上不可能错（`gap="l"` 不会落到 direction） |
| 同类型位置换位（xLabel/yLabel、labels/series）  | **不可检测**        | 写法上不可能错                                 |
| `any` 类型位置换位（Col label/data）            | **不可检测**        | 写法上不可能错                                 |
| 多余 / 拼错参数名                               | 静默丢弃            | 解析期明确报错                                 |

## 5. 后向兼容与迁移

- 保留位置参数：存量 `.openui.json` / source 无需改动。
- 具名参数为增量能力，旧 parser 遇到 `name=value` 报语法错——需 parser 版本升级。
- 建议渲染器生成的参考示例逐步改用具名写法（尤其多参数组件：Stack/Card/图表/Col/Steps/Tabs）。
- schema 无需结构变更；`toJSONSchema()` 已含每个 prop 的名字、顺序、enum，parser 据此绑定具名参数。

## 6. 备选方案与为何不够

- **A. 仅靠下游校验拦截 enum 错位**：已实现（本仓库），但**只覆盖 enum**，同类型/`any` 换位
  无法覆盖。
- **B. 下游按 schema 类型做位置参数类型校验**：实测不可行——`Col.data` 是 `any`、
  `labels`/`series` 同为 array、`xLabel`/`yLabel` 同为 string，且真实值多为命名引用（为避免
  误报需跳过引用），真实覆盖率接近 0。
- **C. 仅靠文档 / 示例教育**：减少但无法消除；模型仍会偶发写错。
- → A+C 是本仓库已落地的兜底；唯有具名参数（本提案）是**语法层根治**。

## 7. 开放问题

1. 是否允许「位置参数出现在具名参数之后」（如 `Stack(direction="column", [...], "l")`）？
   建议初期**禁止**（报错），降低歧义与实现复杂度。
2. 是否为部分组件标记「某些 prop 仅限具名」（keyword-only，类比 Python `*`）？例如对易错
   的 enum prop 鼓励具名。可作为后续增强。
3. 错误信息文案 / i18n。
4. 对 IDE / Linter 的语法高亮与补全影响（正向）。

## 8. 验收

- `Stack(children=[...], gap="l")` 解析为 `props.gap="l"`、`props.direction` 取默认值，**不**
  落入 direction 槽。
- 未知具名 `Stack(children=[...], dirction="column")`（拼写错）→ 解析期明确报错。
- 现有纯位置 source 行为完全不变（回归基线）。
- 渲染器对具名与位置写法产出**完全一致**的渲染结果。
