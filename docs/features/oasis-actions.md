# Oasis Actions 动作卡片协议

Chatflow 可以在回答中输出 `oasis-actions` 代码块，让前端显示为动作按钮。

第一版只支持“填入输入框”，不会自动发送消息。

## 示例

````markdown
```oasis-actions
{
  "version": "1.0",
  "title": "下一步可以选择：",
  "description": "点击后会填入输入框，你可以检查后再发送。",
  "layout": "grid",
  "actions": [
    {
      "id": "generate_claims",
      "label": "生成权利要求书",
      "type": "fill",
      "query": "请根据技术交底书生成权利要求书。"
    },
    {
      "id": "save_attachment_as_disclosure",
      "label": "保存附件为技术交底书最终版",
      "type": "confirm_fill",
      "query": "请将本轮附件保存为技术交底书最终版。",
      "confirmText": "这会把附件保存为技术交底书最终版，是否继续？"
    }
  ]
}
```
````

## 支持字段

- `version`：协议版本，目前建议填写 `1.0`。
- `title`：动作卡片标题。
- `description`：动作卡片说明。
- `layout`：按钮布局，支持 `grid` 或 `row`。
- `actions`：按钮列表，最多 6 个。
- `id`：按钮唯一标识。
- `label`：按钮文字。
- `type`：按钮类型，第一版仅支持 `fill` 和 `confirm_fill`。
- `query`：点击后填入右栏会话输入框的指令。
- `confirmText`：`confirm_fill` 的确认提示文案。
- `disabledReason`：按钮不可点击时展示的原因。
- `requires`：按钮所需前置条件标记，仅用于展示和后续扩展，不会在前端自动执行操作。

## 行为说明

- `fill`：点击后直接把 `query` 填入输入框。
- `confirm_fill`：点击后先弹出确认框，确认后再把 `query` 填入输入框。
- 用户仍需要自己检查并发送输入框内容。
- 前端不会因为动作按钮自动发送、自动保存或自动修改项目内容。

## 安全限制

- 不支持 HTML 按钮。
- 不执行 JavaScript。
- 不支持 `send` 或 `confirm_send`。
- JSON 错误、字段不合法或没有可用按钮时，会显示为普通代码块。
- 未知字段会被忽略。
- 过长字段会被截断，避免撑破右侧会话区域。
