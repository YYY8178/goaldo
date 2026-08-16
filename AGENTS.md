# GoalDo 协作规则

开始开发前依次读取：

1. `docs/PROJECT_CONTEXT.md`
2. `docs/DECISIONS.md`
3. `docs/ACTIVE_TASK.md`
4. `docs/HANDOFF.md`
5. `git status --short --branch`

## 项目边界

- 本仓库是 GoalDo 的公开、自部署代码基线，不等同于官方托管服务的生产配置或数据。
- `YYY8178/goaldo-private` 是独立的闭源正式产品与托管版本；两个仓库不是自动同步的公开/私密镜像。
- 目标是把模糊目标变成结构化、可执行、可检查、可迭代的项目地图；不得退化成泛化聊天或静态教程。
- 公开仓库不得包含托管用户数据、数据库、真实域名配置、管理员身份、Cloudflare 标识、密钥或生产策略。
- 变更必须遵守 AGPL-3.0-or-later、`SECURITY.md`、`CONTRIBUTING.md` 和商标说明。

## 开发与接棒

- 一个任务一个主写 Agent，使用短分支和 Draft PR，不直接推送 `main`。
- 先确认 `docs/ACTIVE_TASK.md` 的目标与验收标准；没有明确下一阶段决定时，不自行扩展产品范围。
- 交棒前更新 `docs/ACTIVE_TASK.md` 和 `docs/HANDOFF.md`，运行适用构建/测试，显式暂存任务文件并推送原任务分支。
- 不从 `goaldo-private` 或其他本地工作区整体复制代码；每次移植必须单独审查功能范围、许可证、隐私、配置和测试。

## 未经维护者明确批准禁止

- 合并 `main` 或创建发布；
- 部署官方托管服务；
- 迁移、导入或修改任何生产数据库与访问策略；
- 提交 `.env`、密钥、真实用户数据或官方托管配置。
- 把闭源功能或运营策略复制到本公开仓库。
