# 项目/会话服务基线梳理（Phase 1）

> 目标：明确现有服务契约、关键数据模型与前端触点，为后续集成改造提供依据。

## 1. 服务契约盘点

### projectService（`src/api/services/project.service.ts`）

| 方法                                              | 请求参数                             | 返回值                       | 后端端点（真实模式）             | 备注                                     |
| ------------------------------------------------- | ------------------------------------ | ---------------------------- | -------------------------------- | ---------------------------------------- |
| `getProjects(params?)`                            | `ListProjectsParams`（分页、状态等） | `PaginatedResponse<Project>` | `GET /projects`                  | mock 走 `mockProjectService.getProjects` |
| `getProject(id)`                                  | `number`                             | `Project`                    | `GET /projects/{id}`             | mock 返回 `response.data.project`        |
| `createProject(data)`                             | `CreateProjectRequest`               | `Project`                    | `POST /projects`                 | mock/real 同参                           |
| `quickCreateProject(data)`                        | `QuickCreateProjectRequest`          | `Project`                    | `POST /projects/quick`           | mock 共用 `createProject`                |
| `updateProject(id, data)`                         | `UpdateProjectRequest`               | `Project`                    | `PUT /projects/{id}`             |                                          |
| `deleteProject(id)`                               | -                                    | `void`                       | `DELETE /projects/{id}`          |                                          |
| `archiveProject(id)`                              | -                                    | `Project`                    | `PATCH /projects/{id}/archive`   |                                          |
| `unarchiveProject(id)`                            | -                                    | `Project`                    | `PATCH /projects/{id}/unarchive` |                                          |
| `getProjectSessions(projectId, page?, pageSize?)` | `number`, `number?`, `number?`       | `PaginatedResponse<Session>` | `GET /projects/{id}/sessions`    | mock 接口额外包装 `page/pageSize`        |

### sessionService（`src/api/services/session.service.ts`）

| 方法                               | 请求参数                                    | 返回值                           | 后端端点                          | 备注                                  |
| ---------------------------------- | ------------------------------------------- | -------------------------------- | --------------------------------- | ------------------------------------- |
| `getSessions(params?)`             | `ListSessionsParams`                        | `PaginatedResponse<Session>`     | `GET /sessions`                   | mock 返回值手动铸造                   |
| `getSession(id)`                   | `number`                                    | `SessionDetail`                  | `GET /sessions/{id}`              |                                       |
| `createSession(data)`              | `CreateSessionRequest`                      | `Session`                        | `POST /sessions`                  | mock 需自建 `toolType`/`modelVersion` |
| `updateSession(id, data)`          | `UpdateSessionRequest`                      | `Session`                        | `PUT /sessions/{id}`              |                                       |
| `renameSession(id, data)`          | `RenameSessionRequest`                      | `Session`                        | `PATCH /sessions/{id}/rename`     | mock 复用 `updateSession`             |
| `associateProject(id, data)`       | `AssociateProjectRequest`                   | `Session`                        | `PATCH /sessions/{id}/associate`  |                                       |
| `dissociateProject(id)`            | -                                           | `Session`                        | `PATCH /sessions/{id}/dissociate` |                                       |
| `updateSessionInputs(id, data)`    | `UpdateSessionInputsRequest`                | `void`                           | `PUT /sessions/{id}/inputs`       | mock 仅存本地                         |
| `deleteSession(id)`                | -                                           | `void`                           | `DELETE /sessions/{id}`           |                                       |
| `getChatHistory(params)`           | `GetChatHistoryParams` (`sessionId` + 分页) | `PaginatedResponse<ChatMessage>` | `GET /sessions/{id}/chat/history` | mock 在内存过滤                       |
| `exportSession(sessionId, format)` | `number`, `'json' \| 'pdf' \| 'docx'`       | `ExportTaskResponse`             | `POST /sessions/{id}/export`      | 未接入 mock                           |
| `batchExportSessions(data)`        | `ExportDataRequest`                         | `ExportTaskResponse`             | `POST /sessions/batch-export`     | mock 未实现                           |
| `getExportTaskStatus(taskId)`      | `string`                                    | `ExportTaskResponse`             | `GET /export-tasks/{taskId}`      |                                       |

### statisticsService（`src/api/services/statistics.service.ts`）

| 方法                                   | 后端端点                                    | 返回值                                  | 备注                              |
| -------------------------------------- | ------------------------------------------- | --------------------------------------- | --------------------------------- |
| `getProjectDetail(projectId)`          | `GET /projects/{id}/detail`                 | `ProjectDetail`                         | mock 未接管                       |
| `getProjectActivities(params)`         | `GET /projects/{id}/activities`             | `PaginatedResponse<ProjectActivity>`    |                                   |
| `getProjectFiles(params)`              | `GET /projects/{id}/files`                  | `PaginatedResponse<ProjectFile>`        |                                   |
| `getProjectPatents(params)`            | `GET /projects/{id}/patents`                | `PaginatedResponse<PatentSearchResult>` |                                   |
| `getProjectManagementStats(params?)`   | `GET /statistics/project-management`        | `ProjectManagementStats`                | mock 使用 `mockStatisticsService` |
| `exportProjectData(projectId, format)` | `GET /projects/{id}/export`                 | `string` (下载 URL)                     | mock 直接返回 JSON                |
| `exportStatisticsReport(params)`       | `GET /statistics/project-management/export` | `string`                                | mock 返回 JSON 字符串             |

### historyService（`src/api/services/history.service.ts`）

| 方法                                      | 后端端点                     | 返回值                                   | 备注                       |
| ----------------------------------------- | ---------------------------- | ---------------------------------------- | -------------------------- |
| `getHistoryData(params?)`                 | `GET /history`               | `PaginatedResponse<HistoryDataItem>`     | mock 在内存列表上分页      |
| `getHistoryDataItem(id)`                  | `GET /history/{id}`          | `HistoryDataItem`                        |                            |
| `searchHistoryData(params)`               | `POST /history/search`       | `PaginatedResponse<HistoryDataItem>`     | mock 复用 `getHistoryData` |
| `getHistoryDataBatch(ids)`                | `POST /history/batch`        | `HistoryDataBatch` (`items`, `notFound`) |                            |
| `deleteHistoryDataItem(id)`               | `DELETE /history/{id}`       | `void`                                   |                            |
| `batchDeleteHistoryData(ids)`             | `POST /history/batch-delete` | `void`                                   |                            |
| `markAsRead(id)` / `batchMarkAsRead(ids)` | `PATCH`                      | `void`                                   |                            |
| `getHistoryStats()`                       | `GET /history/stats`         | `{ total; byType; recentCount }`         |                            |
| `exportHistoryData(params?)`              | `POST /history/export`       | `{ downloadUrl; expiresIn }`             | mock 返回临时 URL          |

> **遗留重复：** `src/modules/workspace/services/` 下仍保留早期版本的 project/session/statistics 服务，需要在后续阶段统一移除或代理到新路径。

## 2. 核心数据模型快照（`src/types/api.ts`）

- `Project`：包含 `id`、`userId`、`name`、`description?`、`status ('active'|'archived')`、`sessionCount?`、`metadata?` 等。
- `Session`：`id`、`projectId?`、`title`、`toolType`、`modelVersion`、`status`、`createdAt/updatedAt`。
- `SessionDetail`：在 `Session` 基础上附带 `inputs`、`outputs`、`chatMessages`、`attachments` 等扩展字段。
- `ProjectDetail`/`ProjectActivity`/`ProjectFile`/`PatentSearchResult`：支撑管理中心的四大面板。
- `HistoryDataItem`：历史记录统一结构（`type`、`tags`、`read` 标识）。
- 请求参数类型：`ListProjectsParams`、`ListSessionsParams`、`ProjectActivitiesParams`、`ProjectFilesParams`、`HistorySearchParams` 等，均支持分页与筛选字段。

## 3. 前端触点映射

| 模块/Hook                        | 依赖服务                             | 作用                          | 现状评估                                 |
| -------------------------------- | ------------------------------------ | ----------------------------- | ---------------------------------------- |
| `useProjects.ts`                 | `projectService`                     | 项目列表、创建/更新/归档      | 仅返回数据，UI 仍大量使用 mock store     |
| `useProjectDetail.ts`            | `statisticsService`                  | 项目详情页数据源              | 仅在 hooks 中消费，UI 未完全接入         |
| `ProjectDataSection.tsx`         | `useProjectPageState` → mock 数据    | 展示项目的历史/文件/数据/专利 | 需替换为服务端数据                       |
| `useSessions.ts`                 | `sessionService`                     | 会话列表 CRUD                 | 尚未与左侧栏/历史面板打通                |
| `useWorkspaceSidebar.ts`         | `useSessionManagement`（mock store） | 左侧栏项目 & 会话列表         | 需要切换至 services                      |
| `useWorkspaceContentSections.ts` | `sessionService`                     | 生成流程创建会话              | 已初步接入 createSession，但缺少其他动作 |
| `HistoryDataDialog.tsx`          | `historyService`                     | 历史记录选择                  | 已引入服务端分页，仍缺批量操作           |
| `NotificationCenter.tsx` & hooks | `cmsService`                         | 通知中心                      | 需在后续步骤扩展                         |

> 其他：`ProjectManagementCenter.tsx`、`ProjectManagementDashboard` 等模块仍依赖 mock 快照，需要在项目/统计完成后同步改造。

## 4. 发现的关键差距

1. **服务重复引用**：`src/modules/workspace/services/*` 与 `src/api/services/*` 并存，部分组件仍 import 旧路径，需统一。
2. **状态存储分散**：Zustand 的 `useMockWorkspaceData`、`useWorkspaceStore` 等仍持有 mock 数据，迁移后需与真实服务统一刷新策略。
3. **导出能力缺口**：`sessionService.exportSession` / `batchExportSessions`、`statisticsService.exportProjectData` 真实接口未接 mock，需要在改造时增加回退方案。
4. **接口字段不完整**：部分类型（如 `Project.metadata`）使用 `Record<string, unknown>`，后续对接 CMS 字段时需明确 schema。
5. **历史数据批量操作**：UI 尚未实现标记已读/批量导出，需要根据 `HistoryDataBatch`、`markAsRead` 等接口补齐。

---

> 下一步（Phase 2）：基于以上梳理，重构项目/会话 UI 流程，将数据来源统一到服务层，并消除旧 mock store 的依赖。
