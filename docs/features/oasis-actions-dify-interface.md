# Oasis Actions Dify 工作流输出接口参考

本文档给 Dify 工作流作者使用，用于让 Dify 在 Chatflow 回复中输出“动作有序列表”。

前端不会接收真实 HTML 按钮。Dify 只需要输出 Markdown 代码块。最小可用示例如下：

````markdown
```oasis-actions
{
  "version": "1.0",
  "title": "请选择下一步",
  "description": "点击后只会填入输入框，请确认后再发送。",
  "layout": "grid",
  "actions": [
    {
      "id": "next_action",
      "label": "继续处理",
      "type": "fill",
      "query": "请继续处理当前任务。"
    }
  ]
}
```
````

前端会识别 `oasis-actions` 代码块，安全解析 JSON，然后渲染为右栏会话里的有序列表；列表项内的操作控件只负责把内容填入输入框。

## 1. 输出位置

Dify 最终回复可以由普通说明文字加一个 `oasis-actions` 代码块组成。

示例：

````markdown
我可以继续帮你完成专利文本处理。请选择一个快捷操作：

```oasis-actions
{
  "version": "1.0",
  "title": "请选择下一步",
  "description": "点击后只会填入输入框，请确认后再发送。",
  "layout": "grid",
  "actions": [
    {
      "id": "generate_claims",
      "label": "生成权利要求书",
      "type": "fill",
      "query": "请根据技术交底书生成权利要求书。"
    }
  ]
}
```
````

## 2. 顶层字段

| 字段 | 是否必填 | 类型 | 限制 | 说明 |
| --- | --- | --- | --- | --- |
| `version` | 推荐 | 字符串 | 目前只建议 `1.0` | 协议版本。 |
| `title` | 否 | 字符串 | 最多 60 字符 | 动作列表标题。 |
| `description` | 否 | 字符串 | 最多 120 字符 | 动作列表说明。 |
| `layout` | 否 | 字符串 | `grid` 或 `row` | 兼容字段；当前前端统一渲染为有序列表，不再按该字段渲染卡片网格。 |
| `actions` | 是 | 数组 | 最多 6 个 | 动作列表；为空或全不合法时不渲染列表；超过 6 个时，前端只取前 6 个合法动作。 |

## 3. action 字段

| 字段 | 是否必填 | 类型 | 限制 | 说明 |
| --- | --- | --- | --- | --- |
| `id` | 是 | 字符串 | 最多 64 字符 | 按钮唯一标识，建议英文、数字、短横线或下划线。 |
| `label` | 是 | 字符串 | 最多 32 字符 | 按钮上显示的文字。 |
| `type` | 是 | 字符串 | 仅支持 `fill`、`confirm_fill` | 按钮类型。 |
| `query` | 是 | 字符串 | 最多 800 字符，不能为空 | 点击按钮后填入右栏输入框的内容。 |
| `confirmText` | `confirm_fill` 推荐 | 字符串 | 最多 120 字符 | 确认弹窗文案；不填时使用默认文案“确认执行该操作？”。 |
| `description` | 否 | 字符串 | 最多 120 字符 | 按钮下方的小说明。 |
| `disabledReason` | 否 | 字符串 | 最多 120 字符 | 有值时按钮不可点击，并展示该原因。 |
| `requires` | 否 | 字符串数组 | 只接受固定枚举 | 标记按钮依赖条件，前端第一版只保留，不展示、不自动判断；如需禁用按钮，请同时输出 `disabledReason`。 |

`requires` 可用值：

- `attachment`：需要用户已上传附件。
- `input`：需要用户已输入内容。
- `final_disclosure`：需要已保存技术交底书最终版。
- `final_claims`：需要已保存权利要求书最终版。
- `final_embodiment`：需要已保存具体实施方式最终版。
- `final_figure_desc`：需要已保存附图说明最终版。

## 4. 按钮类型

### 4.1 `fill`

点击后直接把 `query` 填入右栏输入框。

不会自动发送。

```json
{
  "id": "generate_claims",
  "label": "生成权利要求书",
  "type": "fill",
  "query": "请根据技术交底书生成权利要求书。"
}
```

### 4.2 `confirm_fill`

点击后先弹出确认框。用户确认后，才把 `query` 填入右栏输入框。

不会自动发送。

适合保存终稿、覆盖用户认知成本较高的动作。

```json
{
  "id": "save_uploaded_disclosure",
  "label": "保存为技术交底书",
  "type": "confirm_fill",
  "query": "请将本轮附件保存为技术交底书最终版。",
  "confirmText": "我已确认附件内容就是技术交底书最终版。"
}
```

## 5. Dify 输出模板

可以把下面模板放进 Dify 的提示词、LLM 节点或代码节点输出中。

````markdown
请根据当前对话状态输出一段自然语言说明，并在末尾输出一个 `oasis-actions` 代码块。

要求：
- 只能输出 JSON，不要在 JSON 里写注释。
- `actions` 最多 6 个。
- `type` 只能是 `fill` 或 `confirm_fill`。
- 不要输出 HTML。
- 不要输出 JavaScript。
- 不要输出 `send`、`auto_send`、`confirm_send`。
- `query` 必须是用户检查后可以手动发送的完整指令。

输出格式：

```oasis-actions
{
  "version": "1.0",
  "title": "请选择下一步",
  "description": "点击后只会填入输入框，请确认后再发送。",
  "layout": "grid",
  "actions": [
    {
      "id": "action_id",
      "label": "按钮文字",
      "type": "fill",
      "query": "要填入输入框的完整指令"
    }
  ]
}
```
````

## 6. 常用场景示例

注意：`requires` 只是依赖标记，不会自动禁用按钮。如果 Dify 已经判断条件不足，请输出 `disabledReason`，这样前端才会把按钮显示为不可点击。

### 6.1 快速开始

适用场景：用户刚进入右栏会话，需要引导下一步。

````markdown
我可以继续帮你完成专利文本处理。请选择一个快捷操作：

```oasis-actions
{
  "version": "1.0",
  "title": "请选择下一步",
  "description": "点击后只会填入输入框，请确认后再发送。",
  "layout": "grid",
  "actions": [
    {
      "id": "upload_disclosure_generate_claims",
      "label": "基于附件生成权利要求书",
      "type": "fill",
      "query": "我将上传技术交底书，请基于附件生成权利要求书。",
      "description": "适合已有技术交底书文件的场景。",
      "requires": ["attachment"]
    },
    {
      "id": "generate_claims_from_final_disclosure",
      "label": "根据交底书生成权利要求书",
      "type": "fill",
      "query": "请根据已保存的技术交底书最终版生成权利要求书。",
      "description": "使用已保存的技术交底书最终版。",
      "requires": ["final_disclosure"]
    },
    {
      "id": "generate_embodiment",
      "label": "生成具体实施方式",
      "type": "fill",
      "query": "请根据已保存的技术交底书和权利要求书生成具体实施方式。",
      "description": "依赖技术交底书和权利要求书。",
      "requires": ["final_disclosure", "final_claims"]
    }
  ]
}
```
````

### 6.2 保存附件为终稿

适用场景：Dify 判断用户上传了附件，并想让用户选择保存为哪类终稿。

````markdown
我检测到你上传了附件。如果你希望把附件保存为永久终稿，请选择对应类型：

```oasis-actions
{
  "version": "1.0",
  "title": "保存附件为终稿",
  "description": "请选择附件对应的文档类型；系统不会自动发送。",
  "layout": "grid",
  "actions": [
    {
      "id": "save_uploaded_disclosure",
      "label": "保存为技术交底书",
      "type": "confirm_fill",
      "query": "请将本轮附件保存为技术交底书最终版。",
      "confirmText": "我已确认附件内容就是技术交底书最终版。",
      "requires": ["attachment"]
    },
    {
      "id": "save_uploaded_claims",
      "label": "保存为权利要求书",
      "type": "confirm_fill",
      "query": "请将本轮附件保存为权利要求书最终版。",
      "confirmText": "我已确认附件内容就是权利要求书最终版。",
      "requires": ["attachment"]
    },
    {
      "id": "save_uploaded_embodiment",
      "label": "保存为具体实施方式",
      "type": "confirm_fill",
      "query": "请将本轮附件保存为具体实施方式最终版。",
      "confirmText": "我已确认附件内容就是具体实施方式最终版。",
      "requires": ["attachment"]
    },
    {
      "id": "save_uploaded_figure_desc",
      "label": "保存为附图说明",
      "type": "confirm_fill",
      "query": "请将本轮附件保存为附图说明最终版。",
      "confirmText": "我已确认附件内容就是附图说明最终版。",
      "requires": ["attachment"]
    }
  ]
}
```
````

### 6.3 缺失信息提示

适用场景：当前材料不足，需要用户补充资料或同意先生成推测稿。

````markdown
当前生成依据不足。你可以补充资料，也可以先生成带推测标注的草稿：

```oasis-actions
{
  "version": "1.0",
  "title": "还需要补充信息",
  "description": "当前依据不足，可先补充资料，也可以要求先生成带“（推测）”标注的草稿。",
  "layout": "grid",
  "actions": [
    {
      "id": "provide_disclosure",
      "label": "补充技术交底书",
      "type": "fill",
      "query": "我补充技术交底书如下：\n\n【技术交底书】\n"
    },
    {
      "id": "provide_claims",
      "label": "补充权利要求书",
      "type": "fill",
      "query": "我补充权利要求书如下：\n\n【权利要求书】\n"
    },
    {
      "id": "continue_with_speculation",
      "label": "先生成推测稿",
      "type": "confirm_fill",
      "query": "请在依据不足的位置标注“（推测）”，先生成可供我审核的草稿。",
      "confirmText": "我理解带“（推测）”的内容需要后续人工确认。"
    }
  ]
}
```
````

### 6.4 调取与解释终稿

适用场景：已有终稿时，引导用户调取、解释或对比。

````markdown
以下是可用的终稿调取与解释操作：

```oasis-actions
{
  "version": "1.0",
  "title": "调取或解释已保存终稿",
  "layout": "row",
  "actions": [
    {
      "id": "retrieve_all_finals",
      "label": "调取全部终稿",
      "type": "fill",
      "query": "请调取当前已保存的全部终稿。"
    },
    {
      "id": "explain_claim_1",
      "label": "解释权利要求1",
      "type": "fill",
      "query": "请调取最终版权利要求书，并解释权利要求1。",
      "requires": ["final_claims"]
    },
    {
      "id": "compare_embodiments",
      "label": "对比实施例",
      "type": "fill",
      "query": "请调取最终版具体实施方式，并比较实施例1和实施例2的区别。",
      "requires": ["final_embodiment"]
    }
  ]
}
```
````

### 6.5 禁用态

适用场景：Dify 已经判断某个动作依赖条件不足，希望展示但不允许点击。

````markdown
该操作当前缺少依赖，暂时不可直接执行：

```oasis-actions
{
  "version": "1.0",
  "title": "依赖缺失示例",
  "description": "用于提示用户先补齐前置材料。",
  "layout": "grid",
  "actions": [
    {
      "id": "generate_figure_desc_disabled",
      "label": "生成附图说明",
      "type": "fill",
      "query": "请根据已保存的技术交底书、权利要求书和具体实施方式生成附图说明。",
      "disabledReason": "需要先保存技术交底书、权利要求书和具体实施方式。",
      "requires": ["final_disclosure", "final_claims", "final_embodiment"]
    }
  ]
}
```
````

## 7. Dify 分支建议

| Dify 判断条件 | 建议输出 |
| --- | --- |
| 用户刚开始对话，不清楚下一步 | 快速开始按钮。 |
| 用户上传了附件 | 保存附件为终稿按钮，使用 `confirm_fill`。 |
| 缺少技术交底书或权利要求书 | 补充资料按钮。 |
| 已有终稿 | 调取、解释、对比终稿按钮。 |
| 依赖不足但希望展示动作 | 使用 `disabledReason` 禁用按钮。 |
| JSON 无法稳定生成 | 不输出 `oasis-actions`，改用普通文字提示。 |

## 8. 必须遵守

允许：

- 输出普通 Markdown 文本。
- 推荐每次回复只输出一个 `oasis-actions` 代码块；如确需多个，也应控制每个代码块的动作数量和展示顺序。
- 使用 `fill` 填入输入框。
- 使用 `confirm_fill` 先确认再填入输入框。
- 用 `disabledReason` 表示暂不可用。

禁止：

- 禁止输出 HTML 按钮。
- 禁止输出 JavaScript。
- 禁止输出 `send`、`auto_send`、`confirm_send`。
- 禁止让按钮自动发送消息。
- 禁止让按钮自动保存终稿。
- 禁止在 JSON 中写注释。
- 禁止让 `query` 为空。
- 禁止在单个 `oasis-actions` 代码块中输出超过 6 个动作；如果超过，前端只会取前 6 个合法动作。

## 9. 前端降级规则

以下情况前端不会渲染动作列表：

- JSON 格式错误。
- 缺少 `actions`。
- `actions` 是空数组。
- 所有 action 都不合法。
- `type` 不是 `fill` 或 `confirm_fill`。
- `query` 为空。

如果部分 action 不合法，前端会忽略不合法项，仍渲染合法项。

前端会尽量退回普通代码块显示，避免页面崩溃。

## 10. 最小可用模板

如果只需要一个动作，用这个模板即可：

````markdown
```oasis-actions
{
  "version": "1.0",
  "title": "下一步",
  "layout": "grid",
  "actions": [
    {
      "id": "next_action",
      "label": "继续处理",
      "type": "fill",
      "query": "请继续处理当前任务。"
    }
  ]
}
```
````

## 11. 给 Dify 的一句话约束

可以直接放入 Dify 提示词：

> 当需要给用户提供快捷操作时，只能输出 `oasis-actions` Markdown 代码块；JSON 中 `actions[].type` 只能是 `fill` 或 `confirm_fill`；动作只能把 `query` 填入输入框，不能自动发送，不能输出 HTML 或 JavaScript。
