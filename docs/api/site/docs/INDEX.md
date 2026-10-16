# 接口索引

| 设计目标                 | 功能说明                         | 接口文件                        | 主要路径                                                        | Visibility | Owner              |
| ------------------------ | -------------------------------- | ------------------------------- | --------------------------------------------------------------- | ---------- | ------------------ |
| 3.a 工作流分类与选择     | 查询可用工作流、按分类过滤       | workflows.yaml                  | GET /api/workflows                                              | team       | Workflow Squad     |
| 3.b 动态输入参数         | 返回工作流详情与 JSON Schema     | workflows.yaml                  | GET /api/workflows/{workflowId}                                 | team       | Workflow Squad     |
| 3.c 历史数据读取         | 通过项目 ID 查看执行历史         | workflows.yaml                  | GET /api/workflows/{workflowId}/executions                      | team       | Workflow Squad     |
| 3.d 文件下载             | 获取执行结果及关联文件           | workflows.yaml                  | GET /api/workflow-executions/{executionId}                      | private    | Workflow Squad     |
| 3.e 链式调用             | 维护参数映射预设与工作流链       | workflows.yaml                  | GET /api/workflow-presets · POST /api/workflow-chains           | team       | Workflow Squad     |
| 3.f 进度显示             | 轮询/流式查看执行进度            | workflows.yaml                  | GET /api/workflow-executions/{executionId}/progress             | private    | Workflow Squad     |
| 4.a 多对话流输入         | 管理对话流输入渠道、Prompt 配置  | chatflows.yaml                  | GET /api/chatflows/{chatflowId}                                 | team       | Conversation Squad |
| 4.b 历史数据读取（对话） | 查看会话消息历史与分页           | conversations.yaml              | GET /api/conversations/{conversationId}/messages                | private    | Conversation Squad |
| 4.c 指令库管理           | 关联系统/团队/个人指令模板       | chatflows.yaml                  | PUT /api/chatflows/{chatflowId}/instructions                    | team       | Conversation Squad |
| 5.a 项目 CRUD            | 创建/更新/归档项目               | projects.yaml                   | POST /api/projects · PATCH /api/projects/{projectId}            | team       | Project Squad      |
| 5.b 结果关联项目         | 查看项目下的工作流执行           | projects.yaml                   | GET /api/projects/{projectId}/workflows                         | team       | Project Squad      |
| 5.c 项目读取关联数据     | 获取项目详情、成员、业务字段     | projects.yaml                   | GET /api/projects/{projectId}                                   | team       | Project Squad      |
| 5.d 项目导出             | 导出项目执行/会话/附件           | projects.yaml                   | POST /api/projects/{projectId}/export                           | private    | Project Squad      |
| 5.x Legacy 项目列表兼容  | 现网 Folder 列表分页/搜索/筛选   | projects-legacy-folderlist.yaml | GET /api/user/user/folderlist                                   | private    | Project Squad      |
| 6.a 会话关联项目         | 会话绑定或更换所属项目           | conversations.yaml              | PATCH /api/conversations/{conversationId}                       | private    | Conversation Squad |
| 6.b 会话重命名删除       | 重命名、归档或删除会话           | conversations.yaml              | PATCH /api/conversations/{conversationId} · DELETE …            | private    | Conversation Squad |
| 6.c 会话导出             | 生成对话导出任务                 | conversations.yaml              | POST /api/conversations/{conversationId}/export                 | private    | Conversation Squad |
| 7.a 注册信息管理         | 获取/更新用户资料与偏好          | users-auth.yaml                 | GET /api/users/me · PATCH /api/users/me                         | private    | Identity Platform  |
| 7.b 充值消费             | 创建充值订单、查询账务摘要       | billing.yaml                    | POST /api/billing/top-ups · GET /api/billing/summary            | team       | Billing Team       |
| 7.c 使用统计             | 仪表盘总体概览与明细             | usage-insights.yaml             | GET /api/usage/summary · GET /api/usage/breakdown               | team       | Analytics Team     |
| 7.d 有奖建议征集         | 提交建议与投票，展示活动         | support-feedback.yaml           | POST /api/feedback/suggestions · GET /api/feedback/campaigns    | team       | Support Team       |
| 7.e 用户支持             | 工单管理与客服会话               | support-feedback.yaml           | POST /api/support/tickets · GET /api/support/tickets/{ticketId} | private    | Support Team       |
| 7.f 通知中心             | 拉取通知、批量已读、获取实时通道 | users-auth.yaml                 | GET /api/notifications · POST /api/notifications/channel-token  | private    | Identity Platform  |
| 8.a 数据导出/删除        | 启动个人数据导出任务             | utilities.yaml                  | POST /api/utilities/export/data                                 | private    | Platform Core      |
| 8.b 缓存清理             | 清理客户端缓存/草稿              | utilities.yaml                  | POST /api/utilities/cache/clear                                 | private    | Platform Core      |
| 8.c 信息显示设置         | 配置布局、密度                   | utilities.yaml                  | GET/PUT /api/utilities/preferences/layout                       | private    | Platform Core      |
| 8.d 帮助文档             | 获取帮助文章列表                 | utilities.yaml                  | GET /api/utilities/help-articles                                | global     | Platform Core      |
| 8.e 主题设置             | 切换主题模式                     | utilities.yaml                  | PUT /api/utilities/theme                                        | private    | Platform Core      |
| 8.f 弹出气泡开关         | 管理引导气泡显示                 | utilities.yaml                  | GET/PATCH /api/utilities/tooltips                               | private    | Platform Core      |
| 8.g 版本差异比较         | 查看版本差异说明                 | utilities.yaml                  | GET /api/utilities/release-notes                                | global     | Platform Core      |
| 8.h 显示区域管理         | 管理模块可见性（Visibility 列）  | utilities.yaml                  | GET/PATCH /api/utilities/preferences/visibility                 | team       | Platform Core      |
| 8.i 登录登出             | 登录/刷新/登出接口               | users-auth.yaml                 | POST /api/auth/login · POST /api/auth/logout                    | global     | Identity Platform  |
| 8.j 文本操作             | 发送对话消息、触发模型生成       | conversations.yaml              | POST /api/conversations/{conversationId}/messages               | private    | Conversation Squad |
