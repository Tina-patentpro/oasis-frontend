import http from 'node:http'
import { randomUUID } from 'node:crypto'
import { parse } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'

const port = Number(process.env.MOCK_PORT ?? 4010)
const host = process.env.MOCK_HOST ?? '0.0.0.0'

const sseClients = new Set<http.ServerResponse>()

const sendJson = (res, statusCode, payload) => {
  const body = JSON.stringify({ success: true, data: payload })
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  })
  res.end(body)
}

const readRequestBody = async (req) => {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(chunk)
  }
  if (!chunks.length) return null
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf-8'))
  } catch {
    return null
  }
}

const sendSse = (res, event, data) => {
  res.write(`event: ${event}\n`)
  res.write(`id: ${randomUUID()}\n`)
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

const handleWorkflowExecute = async (req, res, workflowId) => {
  const payload = (await readRequestBody(req)) ?? {}
  const executionId = `exec-${randomUUID()}`
  console.log('[mock] workflow execute', workflowId, payload)

  sendJson(res, 202, {
    executionId,
    status: 'accepted',
    queuedAt: new Date().toISOString(),
  })

  // 异步广播进度
  const steps = [
    { status: 'running', step: '解析输入' },
    { status: 'running', step: '执行工作流' },
    { status: 'running', step: '生成结果' },
    { status: 'completed', step: '完成' },
  ]
  for (const client of sseClients) {
    sendSse(client, 'workflow', {
      executionId,
      workflowId,
      queuedAt: new Date().toISOString(),
      status: 'queued',
    })
  }
  let idx = 0
  for (const step of steps) {
    await delay(750)
    for (const client of sseClients) {
      sendSse(client, 'workflow', {
        executionId,
        workflowId,
        status: step.status,
        currentStep: idx,
        message: step.step,
        updatedAt: new Date().toISOString(),
      })
    }
    idx += 1
  }
}

const handleProgress = async (res, executionId) => {
  const steps = [
    { status: 'running', percentage: 25, message: '拉取项目上下文' },
    { status: 'running', percentage: 50, message: '执行 AI 推理' },
    { status: 'running', percentage: 85, message: '生成文档草稿' },
    { status: 'completed', percentage: 100, message: '完成' },
  ]
  sendJson(res, 200, {
    executionId,
    status: 'running',
    steps,
    updatedAt: new Date().toISOString(),
  })
}

const handleChatStream = (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })
  res.write('\n')
  sseClients.add(res)
  console.log('[mock] SSE connection opened, clients:', sseClients.size)

  const timer = setInterval(() => {
    sendSse(res, 'chat', {
      id: randomUUID(),
      role: 'assistant',
      content: '模拟响应 ' + new Date().toLocaleTimeString(),
    })
  }, 1500)

  reqOnClose(req, res, () => {
    clearInterval(timer)
    sseClients.delete(res)
    console.log('[mock] SSE connection closed, clients:', sseClients.size)
  })
}

const reqOnClose = (req, res, cb) => {
  req.on('close', cb)
  res.on('close', cb)
  res.on('finish', cb)
  res.on('error', cb)
}

const handlePaymentCallback = async (req, res) => {
  const payload = (await readRequestBody(req)) ?? {}
  console.log('[mock] 支付回调：', payload)
  sendJson(res, 200, {
    status: 'received',
    receivedAt: new Date().toISOString(),
  })
}

const handleDownloadBundle = async (res) => {
  const body = JSON.stringify({
    jobId: `bundle-${randomUUID()}`,
    status: 'processing',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    files: [
      { name: 'workflow-report.pdf', size: 1024 * 340 },
      { name: 'attachments.zip', size: 1024 * 1024 * 2 },
    ],
  })
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  })
  res.end(body)
}

const server = http.createServer(async (req, res) => {
  const url = parse(req.url ?? '/', true)
  const pathname = url.pathname ?? ''

  if (req.method === 'POST' && pathname.startsWith('/api/workflows/') && pathname.endsWith('/execute')) {
    const workflowId = pathname.split('/')[3]
    return handleWorkflowExecute(req, res, workflowId)
  }

  if (req.method === 'GET' && pathname.startsWith('/api/workflow-executions/') && pathname.endsWith('/progress')) {
    const executionId = pathname.split('/')[3]
    return handleProgress(res, executionId)
  }

  if (req.method === 'GET' && pathname === '/api/chat/stream') {
    return handleChatStream(req, res)
  }

  if (req.method === 'POST' && pathname === '/api/payments/callback') {
    return handlePaymentCallback(req, res)
  }

  if (req.method === 'GET' && pathname === '/api/files/bundle') {
    return handleDownloadBundle(res)
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: '未定义的 Mock 路径' } }))
})

server.listen(port, host, () => {
  console.log(`[mock] Mock server running at http://${host}:${port}`)
  console.log('[mock] SSE 端点: GET /api/chat/stream')
  console.log('[mock] 工作流执行: POST /api/workflows/:workflowId/execute')
  console.log('[mock] 支付回调: POST /api/payments/callback')
})

process.on('SIGINT', () => {
  console.log('\n[mock] shutting down...')
  server.close(() => process.exit(0))
})
