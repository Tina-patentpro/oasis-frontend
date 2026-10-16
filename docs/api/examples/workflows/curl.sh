#!/usr/bin/env bash

# 工作流执行示例（curl）
# - 包含 Bearer 认证
# - 演示失败重试（HTTP 5xx）

set -euo pipefail

API_BASE="${API_BASE:-https://api.demo-platform.cn}"
WORKFLOW_ID="${1:-wf-patent-draft}"
TOKEN="${API_TOKEN:?请先将 API_TOKEN 设置为有效的 Bearer Token}"

MAX_RETRY=3
retry=0

while true; do
  if response=$(curl --silent --show-error --fail \
    --request POST \
    --url "${API_BASE}/api/workflows/${WORKFLOW_ID}/execute" \
    --header "Authorization: Bearer ${TOKEN}" \
    --header "Content-Type: application/json" \
    --data @- <<'JSON'
{
  "inputs": {
    "caseTitle": "无人机喷洒控制算法",
    "problemStatement": "生成主权利要求与从属权利要求",
    "priority": "high"
  },
  "projectId": "prj-2024-001",
  "metadata": {
    "triggeredFrom": "workspace"
  }
}
JSON
  ); then
    echo "请求成功："
    echo "${response}" | jq
    break
  fi

  status=$?
  if [[ $status -ge 22 ]]; then
    ((retry++)) || true
    if [[ $retry -ge $MAX_RETRY ]]; then
      echo "请求失败，重试次数耗尽" >&2
      exit 1
    fi
    echo "请求失败，${retry}/${MAX_RETRY} 次重试…" >&2
    sleep $((2 ** retry))
  else
    exit $status
  fi
done
