# GoalDo

> Turn an ambiguous goal into an executable, inspectable and evolving project map.

[![Build](https://github.com/YYY8178/goaldo/actions/workflows/ci.yml/badge.svg)](https://github.com/YYY8178/goaldo/actions/workflows/ci.yml)

[Official product](https://goaldo.ymkdai.com) · [Project brief](docs/PROJECT_BRIEF.md) · [Cite GoalDo](CITATION.cff) · [中文版](#中文) · [Self-hosting](docs/SELF_HOSTING.md) · [Security](SECURITY.md) · [Contributing](CONTRIBUTING.md)

GoalDo is an open-source AI project operating system. It treats a project as a living structure of stages, modules, tasks, steps, dependencies, resources, deliverables and acceptance criteria — not a static course outline.

Built by **Yang Minkang (杨民康)**, GoalDo helps an individual or team turn an unclear idea into an understandable route: what to do first, what knowledge is needed, how a task is accepted, and what should change after real execution. Read the concise [project brief](docs/PROJECT_BRIEF.md) for the canonical product description and public references.

## Why GoalDo

Most project-management tools begin after a plan exists. GoalDo begins earlier: it helps shape the plan itself, then keeps the plan connected to execution. It is designed for software, content, hardware, products, research, startups and other goals that can be broken into a process.

In short, GoalDo combines **AI project planning**, **project execution**, **knowledge dependencies** and **acceptance criteria** in one self-hostable workspace.

## What is included

- Goal interview and structured planning API.
- Template backbone plus AI-generated personalization, with a local fallback engine.
- Project, knowledge and execution views in a draggable / zoomable canvas workspace.
- Nine project types: website, app, content, ecommerce, hardware, product, startup, research and agent.
- Task dependencies, deliverables, acceptance criteria, progress tracking and a node-level AI coach.
- Optional password login, invitation flow, admin dashboard and encrypted user-provided API connections.
- Browser speech input for project ideas where the browser supports Web Speech APIs.

## What is deliberately not included

- Any hosted-user account, project, invitation, API request or database export.
- Any production domain, Cloudflare Access policy, database identifier, administrator identity or configuration.
- Any model API key, session-signing secret, encryption key or managed API credential.
- The official hosted service configuration or its operational policies.

## Quick start

```bash
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`.

Without an `OPENAI_API_KEY`, the development server keeps the full planning loop usable with its local template engine. The development admin identity is intentionally a non-real example account: `admin@example.com`.

## Self-hosting

The production target is Cloudflare Workers plus D1. A real deployment needs a fresh D1 database, your own domain configuration and two independently generated secrets:

- `AUTH_SESSION_SECRET` — at least 32 random characters; signs password-login sessions.
- `API_ENCRYPTION_KEY` — at least 32 random characters; encrypts user-provided API keys at rest.

Read the complete [self-hosting guide](docs/SELF_HOSTING.md) before deploying. Never reuse the public example values as production values.

## Architecture

```text
React + Vite UI
      │
      ├── Local Express server (development and optional OpenAI planning)
      │
      └── Cloudflare Worker (production API, auth, D1, encrypted API connections)
              │
              └── Cloudflare D1
```

The public repository is intentionally self-hostable. The hosted GoalDo service may have different operational rules and is not represented by this repository alone.

## License and name

The source code is licensed under [GNU AGPL-3.0-or-later](LICENSE). If you modify GoalDo and offer it to users over a network, AGPL requires that those users can obtain the corresponding source code.

`GoalDo` and related logos are trademarks of their respective owner. The code license does not grant permission to imply an official partnership or to present a fork as the official hosted service. See [TRADEMARKS.md](TRADEMARKS.md).

## 中文

GoalDo 是一个通用 AI 项目推进系统：用户输入目标后，系统将目标拆成阶段、模块、任务、步骤、依赖、交付物与验收标准，并在执行过程中持续调整路线。

它由**杨民康 / Yang Minkang**发起并构建。GoalDo 不是只给答案的聊天工具，也不是静态教程；它帮助用户把模糊想法变成可理解、可学习、可执行、可检查、可迭代的项目路线。

这个仓库公开的是可自部署的产品骨架和通用逻辑；不包含任何线上用户数据、真实域名、管理员配置、数据库标识或 API 密钥。部署前请先阅读 [自部署说明](docs/SELF_HOSTING.md)。
