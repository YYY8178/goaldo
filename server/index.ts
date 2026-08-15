import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const app = express();
const port = Number(process.env.PORT || 8787);
const model = process.env.OPENAI_MODEL || 'gpt-5.6-sol';
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const devAdmin = {
  id: 'dev-admin',
  email: 'admin@example.com',
  role: 'admin' as const,
  status: 'active' as const,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
const devProjects = new Map<string, unknown>();
const devInvites: Array<{ id: string; code_prefix: string; label: string; max_uses: number; used_count: number; expires_at: string | null; status: 'active' | 'revoked'; created_at: string }> = [];
const devApiConnections: Array<{ id: string; mode: 'self' | 'managed'; provider: 'openai-compatible' | 'custom'; preset_id: string; label: string; base_url: string; model: string; key_hint: string; status: 'active' | 'revoked'; created_at: string; updated_at: string }> = [];
const devApiRequests: Array<{ id: string; user_id: string; email: string; purpose: string; expected_usage: string; status: 'pending' | 'approved' | 'rejected'; admin_note: string; created_at: string; updated_at: string }> = [];
const devApiRequestCount = new Map<string, { day: string; count: number }>();

const briefSchema = z.object({
  goal: z.string().min(3),
  type: z.enum(['website', 'app', 'content', 'ecommerce', 'hardware', 'product', 'startup', 'research', 'agent']),
  purpose: z.string().default(''),
  experience: z.string().default(''),
  timeline: z.string().default(''),
  budget: z.string().default(''),
  constraints: z.string().default(''),
});

const stageSchema = z.object({
  id: z.string(),
  number: z.string(),
  title: z.string(),
  summary: z.string(),
  color: z.string(),
  modules: z.array(z.string()),
});

const aiTaskSchema = z.object({
  id: z.string(),
  stageId: z.string(),
  module: z.string(),
  title: z.string(),
  summary: z.string(),
  why: z.string(),
  duration: z.string(),
  dependencies: z.array(z.string()),
  knowledge: z.array(z.string()),
  steps: z.array(z.string()),
  resources: z.array(z.object({
    title: z.string(),
    type: z.enum(['guide', 'video', 'tool']),
  })),
  deliverable: z.string(),
  acceptanceCriteria: z.array(z.string()),
});

const aiProjectSchema = z.object({
  name: z.string(),
  description: z.string(),
  emoji: z.string(),
  risk: z.string(),
  stages: z.array(stageSchema).min(4).max(7),
  tasks: z.array(aiTaskSchema).min(8).max(18),
});

type Brief = z.infer<typeof briefSchema>;
type AIProject = z.infer<typeof aiProjectSchema>;

const systemPrompt = `
Role: 你是通用 AI 项目推进系统的项目主管与架构师。

Goal: 根据用户项目简报，生成一份可以被软件直接执行和渲染的项目地图。它不是教程目录，而是一组有依赖、有交付物、有验收标准的行动节点。

Success criteria:
- 先用专业模板的稳定骨架，再按用户目标、经验、预算和周期个性化。
- stages 保持 4–7 个，tasks 保持 8–18 个；每个 task 只产生一个可验证结果。
- dependencies 只能引用已出现的 task id，形成有向无环图；第一项可以无依赖。
- 当前先做最小版本，不要把商业远景、锦上添花功能塞进核心路径。
- steps 使用具体动词；deliverable 必须能上传或检查；acceptanceCriteria 必须可判断真伪。
- 给出真实的首要风险，不要使用空泛的“时间不足”。
- 所有用户可见文案使用简体中文，id 使用简短英文或拼音。

Output: 严格遵循给定结构，不添加结构外说明。
`.trim();

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ai: Boolean(openai), model: openai ? model : 'local-template-engine' });
});

app.get('/api/auth/me', (_req, res) => {
  res.json({ authenticated: true, user: devAdmin, needsInvite: false, isAdmin: true, development: true });
});

app.post('/api/auth/redeem', (_req, res) => {
  res.json({ user: devAdmin, needsInvite: false, development: true });
});

app.get('/api/projects', (_req, res) => {
  res.json({ projects: Array.from(devProjects.values()) });
});

app.put('/api/projects/:id', (req, res) => {
  devProjects.set(req.params.id, { ...req.body, id: req.params.id });
  res.json({ ok: true, updatedAt: new Date().toISOString() });
});

app.get('/api/admin/invites', (_req, res) => res.json({ invites: devInvites }));
app.post('/api/admin/invites', (req, res) => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const body = Array.from(crypto.getRandomValues(new Uint8Array(12)), (byte) => alphabet[byte % alphabet.length]).join('');
  const code = `GOAL-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8)}`;
  const invite = {
    id: crypto.randomUUID(), code_prefix: code.slice(0, 9), label: String(req.body?.label || ''), max_uses: Number(req.body?.maxUses || 1), used_count: 0,
    expires_at: req.body?.expiresAt || null, status: 'active' as const, created_at: new Date().toISOString(),
  };
  devInvites.unshift(invite);
  res.status(201).json({ invite, code });
});
app.patch('/api/admin/invites/:id', (req, res) => {
  const invite = devInvites.find((item) => item.id === req.params.id);
  if (invite) invite.status = 'revoked';
  res.json({ ok: true });
});
app.get('/api/admin/users', (_req, res) => res.json({ users: [devAdmin] }));
app.patch('/api/admin/users/:id', (_req, res) => res.json({ ok: true }));

app.get('/api/admin/managed-api', (_req, res) => {
  const connection = devApiConnections.find((item) => item.status === 'active') || null;
  res.json({ connection, encryption: { algorithm: 'AES-256-GCM', keyConfigured: true } });
});
app.post('/api/admin/managed-api', (req, res) => {
  const baseUrl = String(req.body?.baseUrl || '').trim().replace(/\/+$/, '');
  const modelName = String(req.body?.model || '').trim();
  const apiKey = String(req.body?.apiKey || '').trim();
  if (!/^https:\/\//i.test(baseUrl)) return res.status(400).json({ error: 'Base URL 必须使用 HTTPS' });
  if (!modelName) return res.status(400).json({ error: '请填写模型名称' });
  const existing = devApiConnections.find((item) => item.status === 'active');
  if (!apiKey && !existing) return res.status(400).json({ error: '首次保存托管 API 请填写 API Key' });
  const now = new Date().toISOString();
  const connection = { id: existing?.id || crypto.randomUUID(), mode: 'self' as const, provider: 'openai-compatible' as const, preset_id: String(req.body?.presetId || 'custom'), label: String(req.body?.label || 'GoalDo 托管 API').trim(), base_url: baseUrl, model: modelName, key_hint: apiKey ? `${apiKey.slice(0, 3)}••••${apiKey.slice(-4)}` : existing?.key_hint || '••••••••', status: 'active' as const, created_at: existing?.created_at || now, updated_at: now };
  if (existing) Object.assign(existing, connection); else devApiConnections.unshift(connection);
  res.json({ connection, encryption: { algorithm: 'AES-256-GCM', keyConfigured: true } });
});
app.delete('/api/admin/managed-api', (_req, res) => { devApiConnections.forEach((item) => { item.status = 'revoked'; }); res.json({ ok: true }); });
app.post('/api/admin/managed-api/test', (_req, res) => res.json({ ok: true, message: '本地开发环境连接测试通过（生产环境会实际调用服务）' }));

app.get('/api/api-access', (_req, res) => res.json({ connections: devApiConnections, request: devApiRequests[0] || null }));
app.post('/api/api-connections', (req, res) => {
  const baseUrl = String(req.body?.baseUrl || '').trim().replace(/\/+$/, '');
  const modelName = String(req.body?.model || '').trim();
  const apiKey = String(req.body?.apiKey || '').trim();
  if (!/^https:\/\//i.test(baseUrl)) return res.status(400).json({ error: 'Base URL 必须使用 HTTPS' });
  if (!modelName) return res.status(400).json({ error: '请填写模型名称' });
  const existing = devApiConnections.find((item) => item.status === 'active');
  if (!apiKey && !existing) return res.status(400).json({ error: '首次保存请填写 API Key' });
  const now = new Date().toISOString();
  const connection = {
    id: existing?.id || crypto.randomUUID(), mode: 'self' as const, provider: req.body?.provider === 'custom' ? 'custom' as const : 'openai-compatible' as const, preset_id: String(req.body?.presetId || 'custom'),
    label: String(req.body?.label || '我的 AI API').trim(), base_url: baseUrl, model: modelName, key_hint: apiKey ? `${apiKey.slice(0, 3)}••••${apiKey.slice(-4)}` : existing?.key_hint || '••••••••', status: 'active' as const,
    created_at: existing?.created_at || now, updated_at: now,
  };
  if (existing) Object.assign(existing, connection); else devApiConnections.unshift(connection);
  res.json({ connection });
});
app.delete('/api/api-connections/:id', (req, res) => {
  const connection = devApiConnections.find((item) => item.id === req.params.id);
  if (connection) connection.status = 'revoked';
  res.json({ ok: true });
});
app.post('/api/api-connections/test', (_req, res) => res.json({ ok: true, message: '本地开发环境连接测试通过（生产环境会实际调用服务）' }));
app.post('/api/api-access/requests', (req, res) => {
  const purpose = String(req.body?.purpose || '').trim();
  if (purpose.length < 8) return res.status(400).json({ error: '请至少填写 8 个字说明使用目的' });
  const now = new Date().toISOString();
  const day = now.slice(0, 10);
  const counter = devApiRequestCount.get(devAdmin.id) || { day, count: 0 };
  if (counter.day !== day) { counter.day = day; counter.count = 0; }
  if (counter.count >= 3) return res.status(429).json({ error: '今日申请托管 API 次数已达到上限（3 次）', limit: 3, window: day });
  counter.count += 1; devApiRequestCount.set(devAdmin.id, counter);
  const existing = devApiRequests.find((item) => item.status === 'pending');
  const request = existing || { id: crypto.randomUUID(), user_id: devAdmin.id, email: devAdmin.email, purpose: '', expected_usage: '', status: 'pending' as const, admin_note: '', created_at: now, updated_at: now };
  Object.assign(request, { purpose, expected_usage: String(req.body?.expectedUsage || '').trim(), updated_at: now });
  if (!existing) devApiRequests.unshift(request);
  res.status(existing ? 200 : 201).json({ request });
});
app.get('/api/admin/api-requests', (_req, res) => res.json({ requests: devApiRequests }));
app.patch('/api/admin/api-requests/:id', (req, res) => {
  const request = devApiRequests.find((item) => item.id === req.params.id);
  if (request && (req.body?.status === 'approved' || req.body?.status === 'rejected')) {
    request.status = req.body.status;
    request.updated_at = new Date().toISOString();
  }
  res.json({ ok: true });
});

app.post('/api/projects/plan', async (req, res) => {
  const parsed = briefSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: '项目简报不完整', details: parsed.error.flatten() });
    return;
  }

  try {
    const plan = openai ? await generateWithAI(parsed.data) : makeTemplateProject(parsed.data);
    res.json({ project: normalizeProject(plan, parsed.data), engine: openai ? 'openai' : 'template' });
  } catch (error) {
    console.error('AI planning failed, falling back to template engine:', error);
    res.json({ project: normalizeProject(makeTemplateProject(parsed.data), parsed.data), engine: 'template-fallback' });
  }
});

app.post('/api/ai/chat', async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  const node = req.body?.node as { title?: string; summary?: string; steps?: string[]; deliverable?: string; acceptanceCriteria?: string[] } | undefined;
  if (!message) {
    res.status(400).json({ error: '请输入问题' });
    return;
  }

  if (!openai) {
    res.json({ reply: localCoachReply(message, node) });
    return;
  }

  try {
    const response = await openai.responses.create({
      model,
      reasoning: { effort: 'low' },
      instructions: `你是节点级项目教练。只围绕当前节点给简洁、可执行的帮助。先判断用户是在求方案、排错还是提交审核；回答要引用当前节点的交付物与完成标准。不要假装看过用户未上传的文件。`,
      input: `当前节点：${node?.title || '未命名'}\n目标：${node?.summary || ''}\n执行步骤：${(node?.steps || []).join('；')}\n交付物：${node?.deliverable || ''}\n完成标准：${(node?.acceptanceCriteria || []).join('；')}\n\n用户：${message}`,
    });
    res.json({ reply: response.output_text || localCoachReply(message, node) });
  } catch (error) {
    console.error('AI chat failed:', error);
    res.json({ reply: localCoachReply(message, node), engine: 'template-fallback' });
  }
});

async function generateWithAI(brief: Brief): Promise<AIProject> {
  if (!openai) return makeTemplateProject(brief);
  const response = await openai.responses.parse({
    model,
    reasoning: { effort: 'medium' },
    instructions: systemPrompt,
    input: `项目类型：${brief.type}\n项目目标：${brief.goal}\n最终用途：${brief.purpose || '未说明'}\n用户经验：${brief.experience || '未说明'}\n预期周期：${brief.timeline || '未说明'}\n预算：${brief.budget || '未说明'}\n限制与偏好：${brief.constraints || '无'}`,
    text: { format: zodTextFormat(aiProjectSchema, 'project_map') },
  });
  if (!response.output_parsed) throw new Error('Model returned no structured project');
  return response.output_parsed;
}

function normalizeProject(plan: AIProject, brief: Brief) {
  const validTaskIds = new Set(plan.tasks.map((task) => task.id));
  const stageIds = new Set(plan.stages.map((stage) => stage.id));
  const tasks = plan.tasks.map((task, index) => ({
    ...task,
    stageId: stageIds.has(task.stageId) ? task.stageId : plan.stages[0].id,
    moduleId: `${stageIds.has(task.stageId) ? task.stageId : plan.stages[0].id}:${task.module}`,
    dependencies: task.dependencies.filter((id) => validTaskIds.has(id) && plan.tasks.findIndex((item) => item.id === id) < index),
    status: index === 0 ? 'in-progress' : 'locked',
    x: 80 + (index % 5) * 280,
    y: 80 + Math.floor(index / 5) * 260,
  }));
  return {
    id: `project-${Date.now().toString(36)}`,
    name: plan.name,
    description: plan.description,
    type: brief.type,
    emoji: plan.emoji,
    updatedAt: '刚刚创建',
    risk: plan.risk,
    stages: plan.stages,
    modules: plan.stages.flatMap((stage) => stage.modules.map((title) => ({ id: `${stage.id}:${title}`, stageId: stage.id, title, summary: `${stage.title}阶段的${title}工作模块` }))),
    tasks,
  };
}

function makeTemplateProject(brief: Brief): AIProject {
  const presets = {
    website: {
      emoji: '⌘',
      stages: [
        ['scope', '需求与范围', '定义用户、场景和 MVP 边界'],
        ['prototype', '原型与验证', '先验证体验，再进入技术实现'],
        ['build', '开发实现', '完成前端、后端和数据闭环'],
        ['quality', '测试与部署', '确保系统稳定并可被访问'],
        ['growth', '用户验证', '让真实用户使用并推动迭代'],
      ],
      tasks: [
        ['定义目标用户', '写出一个具体用户和高频场景'], ['划定 MVP 范围', '确定首版必须做与明确不做的功能'],
        ['绘制核心流程', '完成从进入到获得结果的用户流程'], ['制作可点击原型', '用低成本原型验证关键交互'],
        ['确定技术架构', '基于预算与经验选择前后端方案'], ['实现核心数据链路', '打通输入、处理、存储和展示'],
        ['完成关键页面', '实现首版核心使用界面'], ['执行端到端测试', '覆盖主流程与常见失败状态'],
        ['部署可用版本', '提供稳定访问地址并配置监控'], ['完成首轮用户验证', '收集真实使用记录并更新路线'],
      ],
    },
    content: {
      emoji: '🎬',
      stages: [
        ['position', '账号定位', '明确用户、价值和差异化表达'], ['content', '内容系统', '建立可持续的选题与脚本机制'],
        ['production', '生产流程', '形成稳定拍摄与剪辑工作流'], ['publish', '发布增长', '用稳定发布获得可分析的数据'],
        ['iterate', '数据迭代', '依据真实反馈优化内容结构'],
      ],
      tasks: [
        ['定义目标用户', '锁定一个具体人群和核心问题'], ['建立对标样本', '拆解 10 个同类优质账号'],
        ['确定内容支柱', '定义 3 个长期可持续的主题'], ['建立首批选题库', '产出 30 个可拍摄选题'],
        ['完成脚本模板', '形成开头、主体和行动指引结构'], ['跑通拍摄流程', '用最少设备完成一条样片'],
        ['建立剪辑模板', '固定字幕、节奏和封面规范'], ['发布首轮内容', '按计划发布 5 条内容'],
        ['记录关键数据', '统一记录完播、互动与转化'], ['完成首轮复盘', '保留有效模式并调整下一批选题'],
      ],
    },
    product: {
      emoji: '◇',
      stages: [
        ['discovery', '需求验证', '确认问题真实且值得解决'], ['definition', '产品定义', '把需求转成明确的产品约束'],
        ['prototype', '设计与打样', '用样机验证功能与使用体验'], ['supply', '成本与供应链', '验证可生产性和真实成本'],
        ['market', '销售验证', '用订单或强意向验证市场'],
      ],
      tasks: [
        ['识别用户痛点', '访谈目标用户并收集真实案例'], ['分析竞品缺口', '从差评和替代方案中寻找机会'],
        ['编写产品定义', '明确功能、尺寸、材料与目标成本'], ['验证关键结构', '对最高风险结构做独立实验'],
        ['制作第一版样机', '完成可演示核心价值的原型'], ['执行用户测试', '观察用户实际操作并记录问题'],
        ['核算完整成本', '包含物料、加工、包装与履约'], ['验证供应商方案', '确认起订量、交期与质量标准'],
        ['制作销售材料', '用真实样机表达价值和差异'], ['完成首轮销售验证', '获得付费订单或明确拒绝原因'],
      ],
    },
  } as const;

  const preset = presets[brief.type as keyof typeof presets] || {
    emoji: '✦',
    stages: [
      ['scope', '目标与范围', '明确目标用户、核心问题与首版边界'],
      ['plan', '方案与计划', '选择可行方案并排出执行顺序'],
      ['build', '最小执行', '完成第一条可以验证的闭环'],
      ['validate', '测试与复盘', '用真实结果检查假设并修正方向'],
      ['iterate', '迭代与扩展', '沉淀方法，准备下一轮行动'],
    ],
    tasks: [
      ['明确目标用户', '写出一个具体用户和高频场景'], ['划定首版边界', '确定第一版必须做与明确不做的内容'],
      ['比较可行方案', '列出关键取舍并选择当前最合适的一条'], ['制定执行计划', '把目标拆成可在一周内完成的动作'],
      ['完成最小闭环', '产出可以被真实使用或检查的第一个结果'], ['收集真实反馈', '记录用户、数据或测试中的问题'],
      ['修正关键假设', '根据证据调整方案与优先级'], ['建立验收标准', '让结果可以被复查和判断'],
      ['完成首轮复盘', '保留有效做法并记录风险'], ['规划下一轮行动', '明确下一阶段目标、动作与负责人'],
    ],
  };
  const colors = ['#ef7b45', '#9b6df5', '#4787f3', '#26a98a', '#e8a02f'];
  const stages = preset.stages.map(([id, title, summary], index) => ({ id, number: `0${index + 1}`, title, summary, color: colors[index], modules: [title] }));
  const tasks = preset.tasks.map(([title, summary], index) => {
    const stage = stages[Math.floor(index / 2)];
    return {
      id: `task-${index + 1}`,
      stageId: stage.id,
      module: stage.title,
      title,
      summary,
      why: `这是“${brief.goal.slice(0, 32)}”进入下一阶段前必须完成的关键验证。`,
      duration: index < 2 ? '1–2 小时' : '1–2 天',
      dependencies: index === 0 ? [] : [`task-${index}`],
      knowledge: ['关键概念', '判断方法', '常见风险'],
      steps: ['确认本节点的输入与限制', '完成最小可行执行', '记录结果与异常', '对照完成标准自检'],
      resources: [{ title: `${title}执行指南`, type: 'guide' as const }, { title: '结果记录模板', type: 'tool' as const }],
      deliverable: `一份可复查的“${title}”结果，包含过程、结论与证据。`,
      acceptanceCriteria: ['结果可被他人理解和复查', '关键假设至少有一项真实证据', '异常、风险和下一步已经记录'],
    };
  });
  return {
    name: brief.goal.replace(/[，。,.].*$/, '').slice(0, 20) || '我的新项目',
    description: brief.goal,
    emoji: preset.emoji,
    risk: brief.constraints ? `需要在“${brief.constraints.slice(0, 38)}”的限制下控制首版范围` : '尚未产生第一份真实执行数据，路线需要在首个节点后再次校准',
    stages,
    tasks,
  };
}

function localCoachReply(message: string, node?: { title?: string; deliverable?: string; acceptanceCriteria?: string[] }) {
  const standards = node?.acceptanceCriteria?.slice(0, 2).join('、') || '结果可复现、过程有记录';
  if (/审核|完成|达标|检查/.test(message)) {
    return `我会按“${standards}”来审核。现在还缺少你的实际结果或证据，请上传截图、数据或文档，并说明哪里符合标准、哪里仍有异常。`;
  }
  if (/报错|卡住|失败|异常|不行/.test(message)) {
    return `先不要扩大改动范围。请按这三步排查：\n1. 记录原始报错或异常值；\n2. 确认最近一次成功状态与之后唯一的变化；\n3. 做一个只改变单个变量的最小测试。\n\n把结果发回来，我再针对「${node?.title || '当前节点'}」判断下一步。`;
  }
  return `围绕「${node?.title || '当前节点'}」，建议先产出最小交付物：${node?.deliverable || '一份可检查的真实结果'}。你可以把当前方案、数据或限制发来，我会直接帮你收敛到下一项动作。`;
}

app.listen(port, () => {
  console.log(`Pathway API listening on http://localhost:${port} (${openai ? model : 'local template engine'})`);
});
