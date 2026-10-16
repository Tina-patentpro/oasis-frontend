# Dify Workflow & Chatflow 集成指南

## 概述

本文档详细说明如何让后端API与 Dify 的 Workflow 和 Chatflow 进行双向通信,支持:

- ✅ **实时传输**: 使用 SSE (Server-Sent Events) 流式接收响应
- ✅ **异步传输**: 使用 Webhook 回调接收结果
- ✅ **HTTP节点调用**: Dify Workflow 通过 HTTP 节点调用我们的 API

---

## 架构图

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   前端应用   │ ◄─────► │   后端API    │ ◄─────► │    Dify      │
│  (React)     │  HTTP/  │  (Nest.js)   │  HTTP/  │  Workflow/   │
│              │  SSE    │              │  SSE    │  Chatflow    │
└──────────────┘         └──────────────┘         └──────────────┘
       │                        │                        │
       │                        │                        │
       └────────────────────────┴────────────────────────┘
                     实时/异步数据流
```

---

## 一、后端 → Dify (主动调用)

### 1.1 调用 Dify Chatflow (流式)

**场景**: 用户在前端发起 AI 对话,后端调用 Dify Chatflow,实时流式返回

**实现** (`src/ai/dify.service.ts`):

```typescript
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Response } from 'express'

@Injectable()
export class DifyService {
  private readonly logger = new Logger(DifyService.name)
  private readonly difyApiKey: string
  private readonly difyApiUrl: string

  constructor(private configService: ConfigService) {
    this.difyApiKey = this.configService.get<string>('DIFY_API_KEY')
    this.difyApiUrl = this.configService.get<string>('DIFY_API_URL')
  }

  /**
   * 调用 Dify Chatflow - 流式响应
   */
  async streamChat(params: {
    query: string
    conversationId?: string
    user: string
    inputs?: Record<string, any>
    res: Response
  }): Promise<void> {
    const { query, conversationId, user, inputs, res } = params

    this.logger.log(`Calling Dify Chatflow: ${query.substring(0, 50)}...`)

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    try {
      const response = await fetch(`${this.difyApiUrl}/chat-messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.difyApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: inputs || {},
          query,
          response_mode: 'streaming',
          conversation_id: conversationId || '',
          user,
        }),
      })

      if (!response.ok) {
        throw new Error(`Dify API error: ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter((line) => line.trim() !== '')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)

            try {
              const parsed = JSON.parse(data)

              // 转发到前端
              res.write(`data: ${JSON.stringify(parsed)}\n\n`)

              // 如果是结束消息,记录并结束
              if (parsed.event === 'message_end') {
                this.logger.log('Dify stream completed')
                res.end()
                return
              }
            } catch (e) {
              this.logger.error('Failed to parse Dify response', e)
            }
          }
        }
      }

      res.end()
    } catch (error) {
      this.logger.error('Dify stream error:', error)
      res.write(
        `data: ${JSON.stringify({
          type: 'error',
          message: error.message,
        })}\n\n`,
      )
      res.end()
    }
  }

  /**
   * 调用 Dify Chatflow - 非流式响应
   */
  async chat(params: {
    query: string
    conversationId?: string
    user: string
    inputs?: Record<string, any>
  }): Promise<any> {
    const { query, conversationId, user, inputs } = params

    const response = await fetch(`${this.difyApiUrl}/chat-messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.difyApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: inputs || {},
        query,
        response_mode: 'blocking',
        conversation_id: conversationId || '',
        user,
      }),
    })

    if (!response.ok) {
      throw new Error(`Dify API error: ${response.status}`)
    }

    return response.json()
  }
}
```

### 1.2 调用 Dify Workflow (异步)

**场景**: 复杂的专利文档生成,使用 Workflow,通过 Webhook 异步返回结果

**实现** (`src/ai/dify.service.ts` 继续):

```typescript
  /**
   * 调用 Dify Workflow - 异步模式
   * @returns workflow_run_id 用于跟踪任务状态
   */
  async runWorkflow(params: {
    inputs: Record<string, any>;
    user: string;
    webhookUrl?: string;
  }): Promise<{ workflowRunId: string }> {
    const { inputs, user, webhookUrl } = params;

    this.logger.log('Starting Dify Workflow...');

    const response = await fetch(`${this.difyApiUrl}/workflows/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.difyApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs,
        response_mode: 'async',
        user,
        ...(webhookUrl && {
          webhook: {
            url: webhookUrl,
            method: 'POST',
          }
        }),
      }),
    });

    if (!response.ok) {
      throw new Error(`Dify Workflow API error: ${response.status}`);
    }

    const data = await response.json();
    return { workflowRunId: data.workflow_run_id };
  }

  /**
   * 查询 Workflow 执行状态
   */
  async getWorkflowStatus(workflowRunId: string): Promise<any> {
    const response = await fetch(
      `${this.difyApiUrl}/workflows/runs/${workflowRunId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.difyApiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get workflow status: ${response.status}`);
    }

    return response.json();
  }
```

---

## 二、Dify → 后端 (HTTP 节点调用)

### 2.1 后端提供接口给 Dify HTTP 节点调用

**场景**: Dify Workflow 需要查询数据库、调用业务逻辑等

#### 接口 1: 获取用户项目列表

```typescript
// src/dify-callback/dify-callback.controller.ts
import { Controller, Post, Body, Headers, UnauthorizedException } from '@nestjs/common'

@Controller('dify-callback')
export class DifyCallbackController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly userService: UserService,
  ) {}

  /**
   * Dify HTTP 节点调用: 获取用户项目列表
   * POST /dify-callback/get-user-projects
   */
  @Post('get-user-projects')
  async getUserProjects(
    @Body() body: { userId: number },
    @Headers('x-dify-signature') signature: string,
  ) {
    // 验证签名 (可选,增强安全性)
    this.validateDifySignature(signature, body)

    const projects = await this.projectService.findByUserId(body.userId)

    return {
      success: true,
      data: projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        sessionCount: p.sessions?.length || 0,
      })),
    }
  }

  /**
   * Dify HTTP 节点调用: 保存生成的文档
   * POST /dify-callback/save-document
   */
  @Post('save-document')
  async saveDocument(
    @Body()
    body: {
      sessionId: number
      contentType: string
      generatedContent: string
    },
    @Headers('x-dify-signature') signature: string,
  ) {
    this.validateDifySignature(signature, body)

    const document = await this.documentService.saveGeneratedContent({
      sessionId: body.sessionId,
      contentType: body.contentType,
      generatedContent: body.generatedContent,
    })

    return {
      success: true,
      data: {
        documentId: document.id,
        version: document.version,
      },
    }
  }

  /**
   * Dify HTTP 节点调用: 获取术语词典
   * POST /dify-callback/get-dictionary
   */
  @Post('get-dictionary')
  async getDictionary(
    @Body() body: { userId: number; category?: string },
    @Headers('x-dify-signature') signature: string,
  ) {
    this.validateDifySignature(signature, body)

    const terms = await this.dictionaryService.findByUser(body.userId, body.category)

    return {
      success: true,
      data: terms,
    }
  }

  /**
   * 验证 Dify 签名 (可选)
   */
  private validateDifySignature(signature: string, body: any): void {
    // 实现签名验证逻辑
    // const expectedSignature = crypto
    //   .createHmac('sha256', DIFY_WEBHOOK_SECRET)
    //   .update(JSON.stringify(body))
    //   .digest('hex');
    //
    // if (signature !== expectedSignature) {
    //   throw new UnauthorizedException('Invalid signature');
    // }
  }
}
```

**在 Dify Workflow 中配置 HTTP 节点**:

```json
{
  "url": "https://your-api.com/v1/dify-callback/get-user-projects",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json",
    "X-Dify-Signature": "{{secret_signature}}"
  },
  "body": {
    "userId": "{{user_id}}"
  }
}
```

---

### 2.2 接收 Dify Workflow 异步回调

**场景**: Dify Workflow 执行完成后,通过 Webhook 通知后端

```typescript
// src/dify-callback/dify-callback.controller.ts (继续)

  /**
   * 接收 Dify Workflow 完成回调
   * POST /dify-callback/workflow-completed
   */
  @Post('workflow-completed')
  async handleWorkflowCompleted(
    @Body() body: {
      workflow_run_id: string;
      status: 'succeeded' | 'failed' | 'stopped';
      outputs: Record<string, any>;
      error?: string;
      created_at: number;
      finished_at: number;
    },
  ) {
    this.logger.log(`Workflow ${body.workflow_run_id} completed: ${body.status}`);

    if (body.status === 'succeeded') {
      // 处理成功结果
      await this.handleWorkflowSuccess(body.workflow_run_id, body.outputs);
    } else {
      // 处理失败
      await this.handleWorkflowFailure(body.workflow_run_id, body.error);
    }

    return { success: true };
  }

  private async handleWorkflowSuccess(
    workflowRunId: string,
    outputs: Record<string, any>,
  ): Promise<void> {
    // 从 workflow_run_id 中提取 sessionId (可以在发起时编码进去)
    const sessionId = this.extractSessionId(workflowRunId);

    // 保存生成的内容
    await this.documentService.saveGeneratedContent({
      sessionId,
      contentType: outputs.content_type,
      generatedContent: outputs.generated_content,
    });

    // 发送通知给用户
    await this.notificationService.create({
      userId: outputs.user_id,
      type: 'success',
      title: '内容生成完成',
      message: '您的专利文档已生成完成',
    });
  }

  private async handleWorkflowFailure(
    workflowRunId: string,
    error: string,
  ): Promise<void> {
    const sessionId = this.extractSessionId(workflowRunId);

    // 通知用户失败
    // ... 发送失败通知
  }
```

---

## 三、完整的数据流示例

### 示例 1: 实时 AI 对话 (SSE)

```
用户输入 → 前端 → 后端API → Dify Chatflow → 后端API → 前端
                 SSE ←──────────┘        SSE ←─────┘
```

**前端代码**:

```typescript
// src/services/ai.service.ts
export async function chatWithAI(
  message: string,
  sessionId: number,
  onChunk: (chunk: string) => void,
): Promise<void> {
  const eventSource = new EventSource(
    `/api/v1/ai/chat/stream?sessionId=${sessionId}&message=${encodeURIComponent(message)}`,
    {
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
      },
    },
  )

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data)

    if (data.event === 'agent_message') {
      onChunk(data.answer)
    } else if (data.event === 'message_end') {
      eventSource.close()
    }
  }

  eventSource.onerror = (error) => {
    console.error('SSE Error:', error)
    eventSource.close()
  }
}
```

**后端 Controller**:

```typescript
// src/ai/ai.controller.ts
@Controller('ai')
export class AIController {
  constructor(private readonly difyService: DifyService) {}

  @Get('chat/stream')
  @Sse()
  async chatStream(
    @Query('sessionId') sessionId: number,
    @Query('message') message: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const user = req.user // 从 JWT 中获取

    await this.difyService.streamChat({
      query: message,
      user: user.id.toString(),
      inputs: {
        session_id: sessionId,
      },
      res,
    })
  }
}
```

---

### 示例 2: 异步文档生成 (Webhook)

```
用户请求 → 后端API → Dify Workflow (异步)
                ↓
         返回 workflow_run_id
                ↓
         前端轮询状态 或 等待WebSocket推送
                ↓
  Dify完成 → Webhook → 后端API → WebSocket → 前端通知
```

**前端代码**:

```typescript
// src/services/ai.service.ts
export async function generateDocument(
  sessionId: number,
  inputs: Record<string, any>,
): Promise<{ workflowRunId: string }> {
  const response = await fetch('/api/v1/ai/generate-async', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAccessToken()}`,
    },
    body: JSON.stringify({
      sessionId,
      inputs,
    }),
  })

  return response.json()
}

// 轮询状态
export async function pollWorkflowStatus(
  workflowRunId: string,
  onComplete: (result: any) => void,
): Promise<void> {
  const interval = setInterval(async () => {
    const response = await fetch(`/api/v1/ai/workflow-status/${workflowRunId}`, {
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
      },
    })

    const data = await response.json()

    if (data.status === 'succeeded' || data.status === 'failed') {
      clearInterval(interval)
      onComplete(data)
    }
  }, 2000) // 每2秒轮询一次
}
```

**后端 Controller**:

```typescript
// src/ai/ai.controller.ts (继续)

  @Post('generate-async')
  async generateAsync(
    @Body() body: {
      sessionId: number;
      inputs: Record<string, any>;
    },
    @Req() req: Request,
  ): Promise<{ workflowRunId: string }> {
    const user = req.user;

    // 构造 webhook URL
    const webhookUrl = `${this.configService.get('API_BASE_URL')}/v1/dify-callback/workflow-completed`;

    const result = await this.difyService.runWorkflow({
      inputs: {
        ...body.inputs,
        session_id: body.sessionId,
        user_id: user.id,
      },
      user: user.id.toString(),
      webhookUrl,
    });

    // 存储 workflow_run_id 与 sessionId 的映射
    await this.workflowTrackingService.create({
      workflowRunId: result.workflowRunId,
      sessionId: body.sessionId,
      userId: user.id,
      status: 'running',
    });

    return result;
  }

  @Get('workflow-status/:workflowRunId')
  async getWorkflowStatus(
    @Param('workflowRunId') workflowRunId: string,
  ): Promise<any> {
    return this.difyService.getWorkflowStatus(workflowRunId);
  }
```

---

## 四、Dify Workflow 配置示例

### Workflow 配置: 专利文档生成

```yaml
name: '专利文档生成'
nodes:
  - id: start
    type: start

  - id: get_user_context
    type: http
    config:
      url: '{{API_BASE_URL}}/v1/dify-callback/get-user-projects'
      method: POST
      headers:
        Content-Type: 'application/json'
      body:
        userId: '{{user_id}}'

  - id: get_dictionary
    type: http
    config:
      url: '{{API_BASE_URL}}/v1/dify-callback/get-dictionary'
      method: POST
      body:
        userId: '{{user_id}}'
        category: '技术术语'

  - id: generate_content
    type: llm
    config:
      model: 'gpt-4'
      prompt: |
        基于以下信息生成专利文档:

        用户项目: {{get_user_context.data}}
        术语词典: {{get_dictionary.data}}
        输入内容: {{inputs.content}}

        请生成:
        1. 技术背景
        2. 技术方案
        3. 有益效果

  - id: save_result
    type: http
    config:
      url: '{{API_BASE_URL}}/v1/dify-callback/save-document'
      method: POST
      body:
        sessionId: '{{inputs.session_id}}'
        contentType: 'generated'
        generatedContent: '{{generate_content.output}}'

  - id: end
    type: end
    config:
      outputs:
        generated_content: '{{generate_content.output}}'
        document_id: '{{save_result.data.documentId}}'
```

---

## 五、环境配置

### `.env` 文件

```env
# Dify 配置
DIFY_API_KEY=app-xxxxxxxxxxxx
DIFY_API_URL=https://api.dify.ai/v1

# Dify Webhook 密钥 (用于验证签名)
DIFY_WEBHOOK_SECRET=your-webhook-secret

# API 基础URL (用于 Dify HTTP 节点回调)
API_BASE_URL=https://your-api.com/v1
```

---

## 六、安全建议

### 1. Webhook 签名验证

```typescript
import * as crypto from 'crypto'

function validateWebhookSignature(signature: string, body: any, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex')

  return signature === expectedSignature
}
```

### 2. IP 白名单

```typescript
const DIFY_IP_WHITELIST = [
  '123.456.789.0',
  // Dify 的 IP 地址
]

@Injectable()
export class DifyIpGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const clientIp = request.ip

    return DIFY_IP_WHITELIST.includes(clientIp)
  }
}
```

### 3. 限流

```typescript
@Controller('dify-callback')
@UseGuards(ThrottlerGuard)
@Throttle(100, 60) // 每分钟最多 100 次请求
export class DifyCallbackController {
  // ...
}
```

---

## 七、监控和日志

### 记录所有 Dify 交互

```typescript
@Injectable()
export class DifyInteractionLogger {
  async logRequest(params: {
    type: 'chatflow' | 'workflow'
    direction: 'outgoing' | 'incoming'
    data: any
  }): Promise<void> {
    await this.difyLogRepository.save({
      type: params.type,
      direction: params.direction,
      data: JSON.stringify(params.data),
      timestamp: new Date(),
    })
  }
}
```

---

## 八、测试

### 测试 Dify Chatflow (流式)

```bash
curl -N -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:3000/v1/ai/chat/stream?sessionId=1&message=Hello"
```

### 测试 Dify Workflow (异步)

```bash
curl -X POST http://localhost:3000/v1/ai/generate-async \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "sessionId": 1,
    "inputs": {
      "title": "智能机器人控制系统",
      "content": "技术背景内容..."
    }
  }'
```

### 模拟 Dify Webhook 回调

```bash
curl -X POST http://localhost:3000/v1/dify-callback/workflow-completed \
  -H "Content-Type: application/json" \
  -H "X-Dify-Signature: test-signature" \
  -d '{
    "workflow_run_id": "wr-xxxxx",
    "status": "succeeded",
    "outputs": {
      "generated_content": "生成的专利文档内容...",
      "user_id": 1
    },
    "created_at": 1234567890,
    "finished_at": 1234567900
  }'
```

---

## 总结

这套方案实现了:

✅ **实时通信**: SSE 流式传输,用户实时看到 AI 生成过程  
✅ **异步处理**: Webhook 回调,处理长时间运行的任务  
✅ **双向集成**: 后端可调用 Dify,Dify 也可通过 HTTP 节点调用后端  
✅ **安全可靠**: 签名验证、IP 白名单、限流保护  
✅ **可监控**: 完整的日志记录和状态追踪

---

## 新增：前端消费的输出归一化要求

- **文本即富文本**：后端需在返回的 `documentSections[]` 中提供 Markdown/HTML 片段，按照「标题 + 内容」拆分，前端按照顺序拼接渲染。纯字符串、数值、布尔、基础数组全部写入 `documentSections`，不要再保留原始 list 结构。
- **对象必须拆分**：复杂对象请在后端转成若干 `documentSections` 或生成文件（例如 JSON 附件），避免把大块 JSON 直接交给前端解析。
- **附件统一输出**：将图片/文件上传 OSS 后，把 `WorkflowExecutionFile` 元数据（`fileId/fileName/url/mimeType/size` 等）写入 `files[]`，前端会在下载按钮上显示数量并唤起下载对话框。
- **原始数据留备选**：仍可通过 `rawResponse` 保存完整结果，方便排查；常规渲染仅使用 `documentSections` 与 `files`。

下一步可以根据实际业务需求调整 Workflow 配置和接口实现!
