"""
工作流执行示例（Python / requests）
- 包含超时与重试
- 演示错误码处理
"""

from __future__ import annotations

import os
import sys
import time
from typing import Any

import requests
from requests import Response
from requests.exceptions import RequestException

API_BASE = os.getenv("API_BASE", "https://api.demo-platform.cn")
WORKFLOW_ID = os.getenv("WORKFLOW_ID", "wf-patent-draft")
API_TOKEN = os.getenv("API_TOKEN")

if not API_TOKEN:
    sys.exit("请设置 API_TOKEN 环境变量")


def execute_workflow() -> dict[str, Any]:
    url = f"{API_BASE}/api/workflows/{WORKFLOW_ID}/execute"
    payload = {
        "inputs": {
            "caseTitle": "无人机喷洒控制算法",
            "problemStatement": "生成主权利要求与从属权利要求",
        },
        "metadata": {"triggeredFrom": "workspace"},
    }

    max_retry = 3
    backoff = 0.5

    for attempt in range(max_retry):
        try:
            response = requests.post(
                url,
                json=payload,
                headers={"Authorization": f"Bearer {API_TOKEN}"},
                timeout=10,
            )
            _raise_for_status(response)
            return response.json()["data"]
        except TransientError:
            if attempt == max_retry - 1:
                raise
            time.sleep(backoff * (2 ** attempt))
        except RequestException as exc:
            raise SystemExit(f"请求异常：{exc}") from exc

    raise SystemExit("执行失败")


class TransientError(RuntimeError):
    """用于表示可重试的错误。"""


def _raise_for_status(response: Response) -> None:
    if response.status_code >= 500:
        raise TransientError(f"服务器错误 {response.status_code}")

    if response.status_code == 401:
        raise SystemExit("认证失败（401），请检查 API_TOKEN")

    if response.status_code == 429:
        raise TransientError("限流，请稍后重试")

    if not response.ok:
        body = response.json()
        error = body.get("error", {})
        raise SystemExit(f"调用失败：{error.get('code')} {error.get('message')}")


if __name__ == "__main__":
    result = execute_workflow()
    print("执行成功：", result)
