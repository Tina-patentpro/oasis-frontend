# Oasis Actions 前端测试 Mock

这些 mock 用于前端手工测试、组件测试和联调。前端应识别 Markdown 中的 `oasis-actions` 代码块，解析其中 JSON，并渲染为安全按钮。

## 预期行为

- 点击按钮只把 `query` 填入输入框，不自动发送。
- `confirm_fill` 可比 `fill` 多一次确认提示，但最终仍只是填入输入框。
- 带 `disabledReason` 的动作应渲染为不可点击状态，并展示禁用原因。
- 无效 JSON、空 actions、未知 type 应降级为普通代码块或不渲染按钮。
- 不执行 HTML，不执行 JavaScript，不信任模型输出的任意事件。

## Mock 1：快速开始

```markdown
我可以继续帮你完成专利文本处理。请选择一个快捷操作：

```oasis-actions
{
  "version": "1.0",
  "title": "请选择下一步",
  "description": "点击后只会填入输入框，请确认后再发送。",
  "layout": "grid",
  "actions": [
    {
      "id": "upload-disclosure-generate-claims",
      "label": "基于附件生成权利要求书",
      "type": "fill",
      "query": "我将上传技术交底书，请基于附件生成权利要求书。",
      "description": "适合已有技术交底书文件的场景。",
      "requires": ["attachment"]
    },
    {
      "id": "generate-claims-from-final-disclosure",
      "label": "根据交底书生成权利要求书",
      "type": "fill",
      "query": "请根据已保存的技术交底书最终版生成权利要求书。",
      "description": "使用已保存的技术交底书最终版。",
      "requires": ["final_disclosure"]
    },
    {
      "id": "generate-embodiment",
      "label": "生成具体实施方式",
      "type": "fill",
      "query": "请根据已保存的技术交底书和权利要求书生成具体实施方式。",
      "description": "依赖技术交底书和权利要求书。",
      "requires": ["final_disclosure", "final_claims"]
    }
  ]
}
```
```

## Mock 2：保存附件为终稿

```markdown
我检测到你上传了附件。如果你希望把附件保存为永久终稿，请选择对应类型：

```oasis-actions
{
  "version": "1.0",
  "title": "保存附件为终稿",
  "description": "请选择附件对应的文档类型；系统不会自动发送。",
  "layout": "grid",
  "actions": [
    {
      "id": "save-uploaded-disclosure",
      "label": "保存为技术交底书",
      "type": "confirm_fill",
      "query": "请将本轮附件保存为技术交底书最终版。",
      "confirmText": "我已确认附件内容就是技术交底书最终版。",
      "requires": ["attachment"]
    },
    {
      "id": "save-uploaded-claims",
      "label": "保存为权利要求书",
      "type": "confirm_fill",
      "query": "请将本轮附件保存为权利要求书最终版。",
      "confirmText": "我已确认附件内容就是权利要求书最终版。",
      "requires": ["attachment"]
    },
    {
      "id": "save-uploaded-embodiment",
      "label": "保存为具体实施方式",
      "type": "confirm_fill",
      "query": "请将本轮附件保存为具体实施方式最终版。",
      "confirmText": "我已确认附件内容就是具体实施方式最终版。",
      "requires": ["attachment"]
    },
    {
      "id": "save-uploaded-figure-desc",
      "label": "保存为附图说明",
      "type": "confirm_fill",
      "query": "请将本轮附件保存为附图说明最终版。",
      "confirmText": "我已确认附件内容就是附图说明最终版。",
      "requires": ["attachment"]
    }
  ]
}
```
```

## Mock 3：缺失信息提示

```markdown
当前生成依据不足。你可以补充资料，也可以先生成带推测标注的草稿：

```oasis-actions
{
  "version": "1.0",
  "title": "还需要补充信息",
  "description": "当前依据不足，可先补充资料，也可以要求先生成带“（推测）”标注的草稿。",
  "layout": "grid",
  "actions": [
    {
      "id": "provide-disclosure",
      "label": "补充技术交底书",
      "type": "fill",
      "query": "我补充技术交底书如下：\n\n【技术交底书】\n"
    },
    {
      "id": "provide-claims",
      "label": "补充权利要求书",
      "type": "fill",
      "query": "我补充权利要求书如下：\n\n【权利要求书】\n"
    },
    {
      "id": "continue-with-speculation",
      "label": "先生成推测稿",
      "type": "confirm_fill",
      "query": "请在依据不足的位置标注“（推测）”，先生成可供我审核的草稿。",
      "confirmText": "我理解带“（推测）”的内容需要后续人工确认。"
    }
  ]
}
```
```

## Mock 4：调取与解释终稿

```markdown
以下是可用的终稿调取与解释操作：

```oasis-actions
{
  "version": "1.0",
  "title": "调取或解释已保存终稿",
  "layout": "row",
  "actions": [
    {
      "id": "retrieve-all-finals",
      "label": "调取全部终稿",
      "type": "fill",
      "query": "请调取当前已保存的全部终稿。"
    },
    {
      "id": "explain-claim-1",
      "label": "解释权利要求1",
      "type": "fill",
      "query": "请调取最终版权利要求书，并解释权利要求1。",
      "requires": ["final_claims"]
    },
    {
      "id": "compare-embodiments",
      "label": "对比实施例",
      "type": "fill",
      "query": "请调取最终版具体实施方式，并比较实施例1和实施例2的区别。",
      "requires": ["final_embodiment"]
    }
  ]
}
```
```

## Mock 5：禁用态

```markdown
该操作当前缺少依赖，前端应渲染为不可点击状态：

```oasis-actions
{
  "version": "1.0",
  "title": "依赖缺失示例",
  "description": "用于验证禁用态渲染。",
  "layout": "grid",
  "actions": [
    {
      "id": "generate-figure-desc-disabled",
      "label": "生成附图说明",
      "type": "fill",
      "query": "请根据已保存的技术交底书、权利要求书和具体实施方式生成附图说明。",
      "disabledReason": "需要先保存技术交底书、权利要求书和具体实施方式。",
      "requires": ["final_disclosure", "final_claims", "final_embodiment"]
    }
  ]
}
```
```

## Mock 6：无效 JSON

```markdown
这段应降级为普通代码块，不应渲染按钮：

```oasis-actions
{ "version": "1.0", "actions": [
```
```

## Mock 7：未知动作类型

```markdown
这段包含不允许的动作类型，应不渲染按钮：

```oasis-actions
{
  "version": "1.0",
  "actions": [
    {
      "id": "auto-send-should-be-rejected",
      "label": "自动发送",
      "type": "auto_send",
      "query": "请自动发送这条消息。"
    }
  ]
}
```
```

## 建议单元测试覆盖

1. `parseOasisActionsPayload` 能解析 Mock 1 到 Mock 5。
2. Mock 6 返回 `null`。
3. Mock 7 返回 `null`。
4. 点击 Mock 1 的第一个按钮后，输入框内容变为“我将上传技术交底书，请基于附件生成权利要求书。”。
5. 点击 Mock 2 的 `confirm_fill` 后，只填入输入框，不自动调用发送函数。
