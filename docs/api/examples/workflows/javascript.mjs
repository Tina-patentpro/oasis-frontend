/**
 * 工作流执行示例（JavaScript / Fetch）
 * - 自动刷新 401（示例使用 refreshToken）
 * - 简单的 5xx 重试
 */

const API_BASE = process.env.API_BASE ?? 'https://api.demo-platform.cn';
const WORKFLOW_ID = process.env.WORKFLOW_ID ?? 'wf-patent-draft';

let accessToken = process.env.API_TOKEN;
const refreshToken = process.env.REFRESH_TOKEN;

if (!accessToken) {
  throw new Error('请设置 API_TOKEN 环境变量');
}

async function request(url, options = {}, retryCount = 0) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  if (response.status === 401 && refreshToken && retryCount === 0) {
    await refreshTokenFlow();
    return request(url, options, retryCount + 1);
  }

  if (response.status >= 500 && retryCount < 2) {
    await new Promise((resolve) => setTimeout(resolve, 2 ** retryCount * 500));
    return request(url, options, retryCount + 1);
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`请求失败: ${response.status} ${errorBody}`);
  }

  return response.json();
}

async function refreshTokenFlow() {
  if (!refreshToken) {
    throw new Error('401 且未提供 REFRESH_TOKEN，无法刷新令牌');
  }
  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    throw new Error('刷新令牌失败');
  }
  const body = await res.json();
  accessToken = body.data.accessToken;
}

async function executeWorkflow() {
  const { data } = await request(`${API_BASE}/api/workflows/${WORKFLOW_ID}/execute`, {
    method: 'POST',
    body: JSON.stringify({
      inputs: {
        caseTitle: '无人机喷洒控制算法',
        problemStatement: '生成主权利要求与从属权利要求',
        priority: 'high',
      },
      metadata: { triggeredFrom: 'workspace' },
    }),
  });

  console.log('执行结果：', data);
}

executeWorkflow().catch((err) => {
  console.error(err);
  process.exit(1);
});
