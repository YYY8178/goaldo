import { createRemoteJWKSet, jwtVerify } from 'jose';

interface AssetBinding {
  fetch(request: Request): Promise<Response>;
}

interface D1Result {
  meta: { changes?: number };
}

interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}

interface D1Binding {
  prepare(query: string): D1Statement;
  batch<T = D1Result>(statements: D1Statement[]): Promise<T[]>;
}

interface Env {
  ASSETS: AssetBinding;
  DB: D1Binding;
  TEAM_DOMAIN?: string;
  POLICY_AUD?: string;
  ADMIN_POLICY_AUD?: string;
  ADMIN_EMAIL?: string;
  ADMIN_HOSTNAME?: string;
  API_ENCRYPTION_KEY?: string;
  AUTH_SESSION_SECRET?: string;
  MANAGED_API_BASE_URL?: string;
  MANAGED_API_KEY?: string;
  MANAGED_API_MODEL?: string;
}

interface ProjectBrief {
  goal?: string;
  type?: 'website' | 'app' | 'content' | 'ecommerce' | 'hardware' | 'product' | 'startup' | 'research' | 'agent';
  constraints?: string;
}

interface Identity {
  sub: string;
  email: string;
}

interface UserRow {
  id: string;
  email: string;
  role: 'member' | 'admin';
  status: 'pending' | 'active' | 'suspended';
  admin_note: string;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
  password_hash?: string | null;
  password_salt?: string | null;
  password_iterations?: number;
  last_password_login_at?: string | null;
}

interface InviteRow {
  id: string;
  code_prefix: string;
  label: string;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  status: 'active' | 'revoked';
  created_at: string;
}

interface ApiConnectionRow {
  id: string;
  owner_id: string;
  mode: 'self' | 'managed';
  provider: 'openai-compatible' | 'custom';
  preset_id: 'openai' | 'anthropic' | 'deepseek' | 'gemini' | 'qwen' | 'kimi' | 'glm' | 'custom';
  label: string;
  base_url: string;
  model: string;
  api_key_ciphertext: string;
  api_key_hint: string;
  status: 'active' | 'revoked';
  created_at: string;
  updated_at: string;
}

interface ApiRequestRow {
  id: string;
  user_id: string;
  email?: string;
  purpose: string;
  expected_usage: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string;
  created_at: string;
  updated_at: string;
}

const colors = ['#ef7b45', '#9b6df5', '#4787f3', '#26a98a', '#e8a02f'];
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

const presets = {
  website: {
    emoji: '⌘',
    stages: ['需求与范围', '原型与验证', '开发实现', '测试与部署', '用户验证'],
    tasks: ['定义目标用户', '划定 MVP 范围', '绘制核心流程', '制作可点击原型', '确定技术架构', '实现核心数据链路', '完成关键页面', '执行端到端测试', '部署可用版本', '完成首轮用户验证'],
  },
  content: {
    emoji: '🎬',
    stages: ['账号定位', '内容系统', '生产流程', '发布增长', '数据迭代'],
    tasks: ['定义目标用户', '建立对标样本', '确定内容支柱', '建立首批选题库', '完成脚本模板', '跑通拍摄流程', '建立剪辑模板', '发布首轮内容', '记录关键数据', '完成首轮复盘'],
  },
  product: {
    emoji: '◇',
    stages: ['需求验证', '产品定义', '设计与打样', '成本与供应链', '销售验证'],
    tasks: ['识别用户痛点', '分析竞品缺口', '编写产品定义', '验证关键结构', '制作第一版样机', '执行用户测试', '核算完整成本', '验证供应商方案', '制作销售材料', '完成首轮销售验证'],
  },
  app: {
    emoji: '▣', stages: ['用户与场景', '体验与原型', '技术架构', '开发与测试', '发布与迭代'],
    tasks: ['定义核心用户', '确定首版使用场景', '绘制关键用户流程', '完成可点击原型', '确定客户端与后端架构', '实现核心功能闭环', '完成真机测试', '修复关键体验问题', '提交测试版本', '收集首轮反馈'],
  },
  ecommerce: {
    emoji: '◇', stages: ['市场与选品', '供应链与成本', '店铺与内容', '流量与履约', '数据与复购'],
    tasks: ['确定目标人群', '建立选品标准', '筛选首批商品', '核算完整成本', '确认供应商与交期', '完成店铺基础装修', '制作商品内容', '跑通下单履约流程', '记录首轮经营数据', '根据数据调整商品'],
  },
  hardware: {
    emoji: '⌁', stages: ['需求与指标', '器件与通信', '采集与控制', '联调与可靠性', '部署与维护'],
    tasks: ['定义设备使用场景', '确定关键性能指标', '选择主控与传感器', '确认供电与通信协议', '完成单模块读取', '打通控制与数据链路', '完成多模块联调', '执行连续稳定性测试', '整理接线与部署文档', '制定故障排查流程'],
  },
  startup: {
    emoji: '↗', stages: ['问题与用户', '方案与差异', '最小验证', '获客与转化', '复盘与决策'],
    tasks: ['描述真实用户痛点', '访谈目标用户', '拆解替代方案', '写出价值主张', '制作最小可行方案', '获得首批真实试用', '设计获客路径', '记录转化与反馈', '判断是否有人愿意付费', '做出继续或调整决策'],
  },
  research: {
    emoji: '⌕', stages: ['问题定义', '方法与样本', '资料采集', '分析与验证', '结论与表达'],
    tasks: ['明确研究问题', '定义需要验证的假设', '选择研究方法', '设计样本与提纲', '完成首轮资料采集', '整理原始记录', '编码并归纳关键发现', '寻找反例与偏差', '形成研究结论', '制作可复查报告'],
  },
  agent: {
    emoji: '✦', stages: ['任务与边界', '提示词与知识', '工具与工作流', '评测与安全', '上线与迭代'],
    tasks: ['定义 Agent 要完成的任务', '写出输入与输出边界', '建立提示词初版', '整理知识与上下文', '接入必要工具', '跑通一条完整工作流', '建立评测样例集', '测试幻觉与越权风险', '配置日志与失败回退', '根据评测结果迭代'],
  },
};

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { ...securityHeaders(), 'Cache-Control': 'no-store' } });
}

function securityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Permissions-Policy': 'camera=(), microphone=(self), geolocation=()',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  };
}

function withSecurityHeaders(response: Response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(securityHeaders())) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '未知错误';
}

function sameOrigin(request: Request) {
  const origin = request.headers.get('Origin');
  return !origin || origin === new URL(request.url).origin;
}

function currentWindowKey() {
  return new Date().toISOString().slice(0, 10);
}

async function enforceDailyLimit(env: Env, scope: string, subjectId: string, limit: number) {
  const windowKey = currentWindowKey();
  const now = new Date().toISOString();
  await env.DB.prepare('INSERT OR IGNORE INTO usage_counters (scope, subject_id, window_key, count, updated_at) VALUES (?, ?, ?, 0, ?)')
    .bind(scope, subjectId, windowKey, now).run();
  const result = await env.DB.prepare('UPDATE usage_counters SET count = count + 1, updated_at = ? WHERE scope = ? AND subject_id = ? AND window_key = ? AND count < ?')
    .bind(now, scope, subjectId, windowKey, limit).run();
  if (!result.meta.changes) {
    throw new Response(JSON.stringify({ error: `今日${scope === 'api-request' ? '申请托管 API' : '相关操作'}次数已达到上限（${limit} 次）`, limit, window: windowKey }), { status: 429, headers: { ...securityHeaders(), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }
}

function normalizeCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function base64UrlEncode(value: string | Uint8Array) {
  const encoded = typeof value === 'string' ? btoa(value) : bytesToBase64(value);
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  return atob(padded);
}

function authSessionSecret(env: Env) {
  const secret = env.AUTH_SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) throw new Error('AUTH_SESSION_SECRET 必须配置为至少 32 位的随机字符串');
  return secret;
}

async function hmacSession(payload: string, env: Env) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(authSessionSecret(env)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)));
}

async function createSession(userId: string, env: Env) {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
  const payload = `${userId}.${expiresAt}`;
  const signature = base64UrlEncode(await hmacSession(payload, env));
  return `${base64UrlEncode(payload)}.${signature}`;
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left[index] ^ right[index];
  return result === 0;
}

async function sessionUser(request: Request, env: Env): Promise<UserRow | null> {
  const raw = request.headers.get('Cookie')?.match(/(?:^|;\s*)goaldo_session=([^;]+)/)?.[1];
  if (!raw) return null;
  try {
    const [encodedPayload, signature] = raw.split('.');
    if (!encodedPayload || !signature) return null;
    const payload = base64UrlDecode(encodedPayload);
    const [userId, expiry] = payload.split('.');
    const expected = await hmacSession(payload, env);
    if (!timingSafeEqual(expected, Uint8Array.from(base64UrlDecode(signature), (char) => char.charCodeAt(0))) || !userId || Number(expiry) < Math.floor(Date.now() / 1000)) return null;
    return await env.DB.prepare('SELECT id, email, role, status, admin_note, last_seen_at, created_at, updated_at, password_hash, password_salt, password_iterations, last_password_login_at FROM users WHERE id = ? LIMIT 1').bind(userId).first<UserRow>();
  } catch {
    return null;
  }
}

function sessionCookie(value: string, maxAge = 60 * 60 * 24 * 30) {
  return `goaldo_session=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function authResponse(data: unknown, cookie?: string, status = 200) {
  const headers = new Headers({ ...securityHeaders(), 'Cache-Control': 'no-store', 'Content-Type': 'application/json' });
  if (cookie) headers.set('Set-Cookie', cookie);
  return new Response(JSON.stringify(data), { status, headers });
}

async function passwordDigest(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256);
  return new Uint8Array(bits);
}

async function hashPassword(password: string) {
  // Cloudflare Workers WebCrypto caps PBKDF2 at 100,000 iterations.
  const iterations = 100000;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const digest = await passwordDigest(password, salt, iterations);
  return { hash: base64UrlEncode(digest), salt: bytesToBase64(salt), iterations };
}

async function verifyPassword(password: string, hash: string, salt: string, iterations: number) {
  const digest = await passwordDigest(password, base64ToBytes(salt), Math.min(iterations || 100000, 100000));
  return timingSafeEqual(digest, Uint8Array.from(base64UrlDecode(hash), (char) => char.charCodeAt(0)));
}

function passwordInput(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function emailInput(value: unknown) {
  return passwordInput(value).trim().toLowerCase().slice(0, 320);
}

async function apiEncryptionKey(env: Env) {
  const secret = env.API_ENCRYPTION_KEY?.trim();
  if (!secret || secret.length < 32) throw new Error('API_ENCRYPTION_KEY 必须配置为至少 32 位的随机字符串');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encryptApiKey(value: string, env: Env) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await apiEncryptionKey(env), new TextEncoder().encode(value));
  return `${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(encrypted))}`;
}

async function decryptApiKey(value: string, env: Env) {
  const [ivPart, payloadPart] = value.split('.');
  if (!ivPart || !payloadPart) throw new Error('API 密钥格式无效');
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(ivPart) }, await apiEncryptionKey(env), base64ToBytes(payloadPart));
  return new TextDecoder().decode(decrypted);
}

function apiKeyHint(value: string) {
  const clean = value.trim();
  if (clean.length <= 8) return '••••••••';
  return `${clean.slice(0, 3)}••••${clean.slice(-4)}`;
}

function apiConnectionPublic(row: ApiConnectionRow) {
  return {
    id: row.id, mode: row.mode, provider: row.provider, preset_id: row.preset_id, label: row.label, base_url: row.base_url,
    model: row.model, key_hint: row.api_key_hint, status: row.status, created_at: row.created_at, updated_at: row.updated_at,
  };
}

function makeInviteCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const body = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
  return `GOAL-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8)}`;
}

function adminEmail(env: Env) {
  const email = env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error('ADMIN_EMAIL 尚未配置');
  return email;
}

function isAdminHostname(request: Request, env: Env) {
  const hostname = env.ADMIN_HOSTNAME?.trim().toLowerCase();
  return Boolean(hostname && new URL(request.url).hostname.toLowerCase() === hostname);
}

async function getIdentity(request: Request, env: Env): Promise<Identity> {
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) throw new Response(JSON.stringify({ error: '请先完成邮箱验证码登录' }), { status: 401, headers: { ...securityHeaders(), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  const audience = isAdminHostname(request, env) ? env.ADMIN_POLICY_AUD : env.POLICY_AUD;
  if (!env.TEAM_DOMAIN || !audience) throw new Error('Cloudflare Access 尚未完成配置');

  const teamDomain = env.TEAM_DOMAIN.replace(/\/+$/, '');
  let jwks = jwksCache.get(teamDomain);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));
    jwksCache.set(teamDomain, jwks);
  }
  const { payload } = await jwtVerify(token, jwks, { issuer: teamDomain, audience });
  if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') throw new Error('登录凭证中缺少邮箱身份');
  return { sub: payload.sub, email: payload.email.toLowerCase() };
}

async function ensureUser(request: Request, env: Env): Promise<UserRow> {
  if (!isAdminHostname(request, env)) {
    const local = await sessionUser(request, env);
    if (local) {
      if (local.status !== 'suspended') await env.DB.prepare('UPDATE users SET last_seen_at = ?, updated_at = ? WHERE id = ?').bind(new Date().toISOString(), new Date().toISOString(), local.id).run();
      return local;
    }
  }
  const identity = await getIdentity(request, env);
  const now = new Date().toISOString();
  const isAdmin = identity.email === adminEmail(env);
  const existing = await env.DB.prepare('SELECT id, email, role, status, admin_note, last_seen_at, created_at, updated_at, password_hash, password_salt, password_iterations, last_password_login_at FROM users WHERE access_sub = ? OR email = ? LIMIT 1')
    .bind(identity.sub, identity.email).first<UserRow>();

  if (!existing) {
    const user: UserRow = {
      id: crypto.randomUUID(),
      email: identity.email,
      role: isAdmin ? 'admin' : 'member',
      status: isAdmin ? 'active' : 'pending',
      admin_note: '',
      last_seen_at: now,
      created_at: now,
      updated_at: now,
    };
    await env.DB.prepare('INSERT INTO users (id, access_sub, email, role, status, admin_note, last_seen_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(user.id, identity.sub, user.email, user.role, user.status, '', now, now, now).run();
    return user;
  }

  const role = isAdmin ? 'admin' : existing.role;
  const status = isAdmin ? 'active' : existing.status;
  await env.DB.prepare('UPDATE users SET access_sub = ?, email = ?, role = ?, status = ?, last_seen_at = ?, updated_at = ? WHERE id = ?')
    .bind(identity.sub, identity.email, role, status, now, now, existing.id).run();
  return { ...existing, email: identity.email, role, status, last_seen_at: now, updated_at: now };
}

async function activeInvite(env: Env, user: UserRow, rawCode: string) {
  const code = normalizeCode(rawCode);
  if (code.length < 16) return { ok: false, error: '请输入完整邀请码' } as const;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recent = await env.DB.prepare('SELECT COUNT(*) AS count FROM invite_attempts WHERE user_id = ? AND attempted_at > ? AND success = 0').bind(user.id, oneHourAgo).first<{ count: number }>();
  if (Number(recent?.count || 0) >= 10) return { ok: false, error: '尝试次数过多，请一小时后再试' } as const;
  const now = new Date().toISOString();
  const invite = await env.DB.prepare(`SELECT id, code_prefix, label, max_uses, used_count, expires_at, status, created_at FROM invite_codes WHERE code_hash = ? AND status = 'active' AND used_count < max_uses AND (expires_at IS NULL OR expires_at > ?) LIMIT 1`).bind(await sha256(code), now).first<InviteRow>();
  if (!invite) {
    await env.DB.prepare('INSERT INTO invite_attempts (id, user_id, attempted_at, success) VALUES (?, ?, ?, 0)').bind(crypto.randomUUID(), user.id, now).run();
    return { ok: false, error: '邀请码无效、已用完或已过期' } as const;
  }
  const results = await env.DB.batch<D1Result>([
    env.DB.prepare(`INSERT INTO invite_redemptions (invite_id, user_id, redeemed_at) SELECT id, ?, ? FROM invite_codes WHERE id = ? AND status = 'active' AND used_count < max_uses AND (expires_at IS NULL OR expires_at > ?) ON CONFLICT DO NOTHING`).bind(user.id, now, invite.id, now),
    env.DB.prepare('UPDATE invite_codes SET used_count = (SELECT COUNT(*) FROM invite_redemptions WHERE invite_id = ?) WHERE id = ?').bind(invite.id, invite.id),
    env.DB.prepare(`UPDATE users SET status = 'active', invited_by = (SELECT created_by FROM invite_codes WHERE id = ?), updated_at = ? WHERE id = ? AND EXISTS (SELECT 1 FROM invite_redemptions WHERE invite_id = ? AND user_id = ?)`).bind(invite.id, now, user.id, invite.id, user.id),
  ]);
  const success = Boolean(results[0]?.meta?.changes);
  await env.DB.prepare('INSERT INTO invite_attempts (id, user_id, attempted_at, success) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), user.id, now, success ? 1 : 0).run();
  return success ? { ok: true, user: { ...user, status: 'active', updated_at: now } as UserRow } as const : { ok: false, error: '邀请码刚刚已被用完，请向管理员获取新邀请码' } as const;
}

async function requireActive(request: Request, env: Env) {
  const user = await ensureUser(request, env);
  if (user.status === 'suspended') throw new Response(JSON.stringify({ error: '该账号已被停用，请联系管理员' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  if (user.status !== 'active') throw new Response(JSON.stringify({ error: '需要有效邀请码', needsInvite: true }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  return user;
}

async function requireAdmin(request: Request, env: Env) {
  const user = await requireActive(request, env);
  if (user.role !== 'admin') throw new Response(JSON.stringify({ error: '仅管理员可以执行此操作' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  return user;
}

async function redeemInvite(request: Request, env: Env, user: UserRow) {
  if (!sameOrigin(request)) return json({ error: '请求来源无效' }, 403);
  if (user.status === 'active') return json({ user, needsInvite: false });
  const body = await request.json<{ code?: string }>();
  const result = await activeInvite(env, user, body.code || '');
  if (!result.ok) return json({ error: result.error }, result.error.includes('次数') ? 429 : 400);
  return json({ user: result.user, needsInvite: false });
}

function makeWelcomeProject() {
  const stages = [
    { id: 'welcome', number: '01', title: '认识 GoalDo', summary: '先理解系统如何陪你推进项目', color: '#ef7b45', modules: ['产品说明', '数据与隐私'] },
    { id: 'create', number: '02', title: '创建项目', summary: '把模糊目标变成可执行路线', color: '#9b6df5', modules: ['目标输入', 'AI 访谈'] },
    { id: 'execute', number: '03', title: '推进与提交', summary: '按节点执行，并用真实结果解锁下一步', color: '#4787f3', modules: ['节点执行', '结果审核'] },
    { id: 'rules', number: '04', title: '使用规则', summary: '了解管理员可见范围与内容安全边界', color: '#26a98a', modules: ['隐私规则', '账号规则'] },
    { id: 'start', number: '05', title: '开始行动', summary: '创建属于你的第一个真实项目', color: '#e8a02f', modules: ['首个项目'] },
  ];
  const definitions = [
    ['w1', 'welcome', '产品说明', 'GoalDo 能帮你做什么', 'GoalDo 会把目标拆成阶段、任务、步骤、交付物和完成标准。', 'GoalDo 是项目推进系统，不是只生成一段答案的聊天工具。你需要用真实行动和交付物推进节点。', ['项目地图', '任务依赖', '完成标准'], ['浏览项目、知识和执行三种视图', '点击节点查看目标、步骤与标准', '理解“提交结果后再解锁下一步”'], '能够说清 GoalDo 与普通聊天机器人的区别。'],
    ['w2', 'welcome', '数据与隐私', '了解数据如何保存', '每个账号拥有独立项目空间，普通用户不能访问其他人的数据。', '项目保存在与你的登录邮箱绑定的独立云端空间。管理员为了服务支持、安全和审核可以查看账号、项目内容与状态。', ['账号隔离', '管理员权限', '敏感信息保护'], ['确认当前登录邮箱', '了解管理员可见范围', '不要上传密码、证件、银行卡等敏感信息'], '理解普通用户彼此隔离，同时管理员具有管理可见权限。'],
    ['w3', 'create', '目标输入', '写出一个可推进的目标', '描述你真正想完成的结果，而不是只写一个宽泛主题。', '清楚的目标能让 AI 选择更合适的模板、阶段和任务粒度。', ['目标结果', '目标用户', '时间边界'], ['写出想完成的结果', '补充服务对象或使用场景', '写明时间、预算或其他限制'], '目标至少包含结果、对象和一项限制条件。'],
    ['w4', 'create', 'AI 访谈', '完成项目背景访谈', '回答经验、周期、预算、限制和最终用途。', 'AI 会根据这些答案调整路线深度，避免给新手一条无法执行的专家路线。', ['范围控制', '能力匹配', '约束条件'], ['如实填写当前经验', '给出第一个可用结果的时间', '说明预算与必须遵守的限制'], '访谈答案足以决定首版范围和推进节奏。'],
    ['w5', 'execute', '节点执行', '一次只推进一个关键节点', '聚焦当前解锁任务，按步骤完成最小可行结果。', '项目失败常常不是因为没有知识，而是同时做太多事情、没有形成可检查的结果。', ['最小执行', '单变量测试', '过程记录'], ['阅读为什么做和前置知识', '按执行步骤完成最小尝试', '记录原始结果和异常'], '产生一个可复查的真实结果，而不只是“看完了”。'],
    ['w6', 'execute', '结果审核', '用交付物证明任务完成', '上传截图、代码、文档或测试数据，并对照标准自检。', '只有可复查的证据才能让 AI 和你判断下一步是否应该解锁或调整。', ['交付物', '验收标准', '复盘'], ['准备节点要求的交付物', '逐条核对完成标准', '记录失败项和下一步修正'], '交付物、标准和异常记录三者齐全。'],
    ['w7', 'rules', '隐私规则', '确认管理员可见范围', '管理员可以查看注册信息、项目内容、进度、状态和管理备注。', '这是邀请制测试期提供支持、处理滥用和改进产品所必需的管理能力。', ['管理可见性', '最少敏感数据', '服务支持'], ['只提交推进项目所必需的信息', '敏感信息先脱敏再上传', '需要删除或更正数据时联系管理员'], '已了解并接受测试期的数据管理规则。'],
    ['w8', 'rules', '账号规则', '安全使用账号与邀请码', '邀请码只发给你信任的人，不共享验证码，不上传违法或侵权内容。', '清晰的账号边界能保护所有用户和项目数据。', ['邀请码', '账号安全', '内容责任'], ['不要转发邮箱验证码', '不要公开发布私人邀请码', '发现账号异常时立即退出并联系管理员'], '能够遵守邀请、登录和内容安全规则。'],
    ['w9', 'start', '首个项目', '创建你的第一个项目', '点击“创建新项目”，让 AI 根据你的真实目标生成路线。', '规则只有进入真实项目后才有价值。现在把一个想法转成第一条可执行路径。', ['项目简报', '模板骨架', '第一节点'], ['点击创建新项目', '完成目标与背景访谈', '检查路线后进入第一个节点'], '成功创建一个属于自己的项目并进入首个任务。'],
  ] as const;
  const tasks = definitions.map((item, index) => ({
    id: item[0], stageId: item[1], moduleId: `${item[1]}:${item[2]}`, module: item[2], title: item[3], summary: item[4], why: item[5],
    status: index === 0 ? 'in-progress' : index < 8 ? 'todo' : 'locked', duration: index < 2 ? '5 分钟' : '10 分钟', dependencies: index === 0 ? [] : [definitions[index - 1][0]],
    knowledge: [...item[6]], steps: [...item[7]], resources: [{ title: 'GoalDo 使用说明', type: 'guide' }, { title: '项目执行与隐私规则', type: 'tool' }],
    deliverable: item[8], acceptanceCriteria: [item[8], '已经阅读并理解本节点说明', '如有疑问，已在 AI 助手中提出'],
    x: 80 + (index % 5) * 280, y: 90 + Math.floor(index / 5) * 260,
  }));
  return {
    id: 'goaldo-guide', name: 'GoalDo 使用说明与规则', description: '用 9 个节点了解项目如何创建、推进、审核，以及数据与账号规则。', type: 'website', emoji: '🧭',
    updatedAt: '新手必读', risk: '请勿在项目中上传密码、验证码、身份证件、银行卡等敏感信息。', stages,
    modules: stages.flatMap((stage) => stage.modules.map((title) => ({ id: `${stage.id}:${title}`, stageId: stage.id, title, summary: stage.summary }))), tasks,
  };
}

async function ensureWelcomeProject(env: Env, user: UserRow) {
  const existing = await env.DB.prepare("SELECT id FROM projects WHERE owner_id = ? AND json_extract(data, '$.id') = 'goaldo-guide' LIMIT 1")
    .bind(user.id).first<{ id: string }>();
  if (existing) return;
  const project = makeWelcomeProject();
  const now = new Date().toISOString();
  await env.DB.prepare('INSERT OR IGNORE INTO projects (id, owner_id, data, admin_note, admin_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(`${user.id}:${project.id}`, user.id, JSON.stringify(project), '', 'active', now, now).run();
}

async function listProjects(env: Env, user: UserRow) {
  await ensureWelcomeProject(env, user);
  const rows = await env.DB.prepare('SELECT id, data, updated_at FROM projects WHERE owner_id = ? ORDER BY updated_at DESC')
    .bind(user.id).all<{ id: string; data: string; updated_at: string }>();
  return rows.results.flatMap((row) => {
    try { return [JSON.parse(row.data)]; } catch { return []; }
  });
}

async function saveProject(request: Request, env: Env, user: UserRow, id: string) {
  if (!sameOrigin(request)) return json({ error: '请求来源无效' }, 403);
  const project = await request.json<Record<string, unknown>>();
  if (!project || typeof project !== 'object' || !Array.isArray(project.tasks) || !Array.isArray(project.stages)) return json({ error: '项目数据格式无效' }, 400);
  const now = new Date().toISOString();
  const projectId = id.slice(0, 120);
  const storageId = `${user.id}:${projectId}`;
  const payload = JSON.stringify({ ...project, id: projectId });
  await env.DB.prepare(`INSERT INTO projects (id, owner_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at WHERE owner_id = excluded.owner_id`)
    .bind(storageId, user.id, payload, now, now).run();
  return json({ ok: true, updatedAt: now });
}

function makeProject(brief: ProjectBrief) {
  const type = brief.type && brief.type in presets ? brief.type : 'website';
  const preset = presets[type];
  const goal = (brief.goal || '我的新项目').trim();
  const name = goal.replace(/[，。,.].*$/, '').slice(0, 20) || '我的新项目';
  const stages = preset.stages.map((title, index) => ({
    id: `stage-${index + 1}`, number: `0${index + 1}`, title, summary: `完成${title}阶段的关键验证`, color: colors[index], modules: [title],
  }));
  const modules = stages.map((stage) => ({ id: `${stage.id}:${stage.title}`, stageId: stage.id, title: stage.title, summary: `${stage.title}工作模块` }));
  const tasks = preset.tasks.map((title, index) => {
    const stage = stages[Math.floor(index / 2)];
    return {
      id: `task-${index + 1}`, stageId: stage.id, moduleId: `${stage.id}:${stage.title}`, module: stage.title, title,
      summary: `围绕“${name}”产出可检查的阶段结果`, why: '用真实交付物推进项目，避免停留在想法和信息收集。',
      status: index === 0 ? 'in-progress' : 'locked', duration: index < 2 ? '1–2 小时' : '1–2 天', dependencies: index === 0 ? [] : [`task-${index}`],
      knowledge: ['关键概念', '判断方法', '常见风险'], steps: ['确认本节点的输入与限制', '完成最小可行执行', '记录结果与异常', '对照完成标准自检'],
      resources: [{ title: `${title}执行指南`, type: 'guide' }, { title: '结果记录模板', type: 'tool' }],
      deliverable: `一份可复查的“${title}”结果，包含过程、结论与证据。`, acceptanceCriteria: ['结果可被他人理解和复查', '关键假设至少有一项真实证据', '异常、风险和下一步已经记录'],
      x: 80 + (index % 5) * 280, y: 80 + Math.floor(index / 5) * 260,
    };
  });
  return { id: `project-${crypto.randomUUID()}`, name, description: goal, type, emoji: preset.emoji, updatedAt: '刚刚创建', risk: brief.constraints ? `需要在“${brief.constraints.slice(0, 38)}”的限制下控制首版范围` : '路线将在首个真实执行结果后继续校准', stages, modules, tasks };
}

function coachReply(message: string, node?: { title?: string; deliverable?: string; acceptanceCriteria?: string[] }) {
  const standards = node?.acceptanceCriteria?.slice(0, 2).join('、') || '结果可复现、过程有记录';
  if (/审核|完成|达标|检查/.test(message)) return `我会按“${standards}”审核。请上传截图、数据或文档，并说明哪里符合标准、哪里仍有异常。`;
  if (/报错|卡住|失败|异常|不行/.test(message)) return `先做最小排查：记录原始报错，确认最近一次成功状态，再做一个只改变单个变量的测试。把结果发回来，我会继续帮你判断「${node?.title || '当前节点'}」的下一步。`;
  return `围绕「${node?.title || '当前节点'}」，先产出最小交付物：${node?.deliverable || '一份可检查的真实结果'}。把当前方案或数据发来，我会帮你收敛到下一项动作。`;
}

async function chatWithConnection(connection: ApiConnectionRow, message: string, node: { title?: string; summary?: string; steps?: string[]; deliverable?: string; acceptanceCriteria?: string[] }, env: Env) {
  const apiKey = await decryptApiKey(connection.api_key_ciphertext, env);
  const base = connection.base_url.replace(/\/+$/, '');
  if (connection.preset_id === 'anthropic') {
    const endpoint = /\/messages$/i.test(base) ? base : `${base}/v1/messages`;
    const response = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: connection.model, max_tokens: 900, system: '你是 GoalDo 的节点级项目教练。只围绕当前节点给简洁、可执行的帮助，不要假装看过用户未上传的文件。', messages: [{ role: 'user', content: `当前节点：${node.title || '未命名'}\n目标：${node.summary || ''}\n执行步骤：${(node.steps || []).join('；')}\n交付物：${node.deliverable || ''}\n完成标准：${(node.acceptanceCriteria || []).join('；')}\n\n用户：${message}` }] }),
    });
    if (!response.ok) throw new Error(`API 返回 ${response.status}`);
    const payload = await response.json<{ content?: Array<{ type?: string; text?: string }> }>();
    const reply = payload.content?.find((item) => item.type === 'text')?.text?.trim();
    if (!reply) throw new Error('API 没有返回可读内容');
    return reply;
  }
  const endpoint = /\/chat\/completions$/i.test(base) ? base : `${base}/chat/completions`;
  const response = await fetch(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: connection.model, temperature: 0.4, messages: [
      { role: 'system', content: '你是 GoalDo 的节点级项目教练。只围绕当前节点给简洁、可执行的帮助，不要假装看过用户未上传的文件。' },
      { role: 'user', content: `当前节点：${node.title || '未命名'}\n目标：${node.summary || ''}\n执行步骤：${(node.steps || []).join('；')}\n交付物：${node.deliverable || ''}\n完成标准：${(node.acceptanceCriteria || []).join('；')}\n\n用户：${message}` },
    ] }),
  });
  if (!response.ok) throw new Error(`API 返回 ${response.status}`);
  const payload = await response.json<{ choices?: Array<{ message?: { content?: string } }> }>();
  const reply = payload.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error('API 没有返回可读内容');
  return reply;
}

async function probeConnection(baseUrl: string, model: string, apiKey: string, presetId = 'custom') {
  const base = baseUrl.replace(/\/+$/, '');
  if (presetId === 'anthropic') {
    const endpoint = /\/messages$/i.test(base) ? base : `${base}/v1/messages`;
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model, max_tokens: 5, messages: [{ role: 'user', content: 'Reply with OK.' }] }) });
    if (!response.ok) return { ok: false, message: `服务返回 HTTP ${response.status}，请检查 Base URL、模型和 Key` };
    return { ok: true, message: 'Claude 连接成功，服务已返回响应' };
  }
  const endpoint = /\/chat\/completions$/i.test(base) ? base : `${base}/chat/completions`;
  const response = await fetch(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, max_tokens: 5, messages: [{ role: 'user', content: 'Reply with OK.' }] }),
  });
  if (!response.ok) return { ok: false, message: `服务返回 HTTP ${response.status}，请检查 Base URL、模型和 Key` };
  return { ok: true, message: '连接成功，服务已返回响应' };
}

async function managedConnection(env: Env) {
  if (!env.MANAGED_API_BASE_URL || !env.MANAGED_API_KEY || !env.MANAGED_API_MODEL) return null;
  return {
    id: 'managed-api', owner_id: '', mode: 'managed' as const, provider: 'openai-compatible' as const, preset_id: 'custom' as const,
    label: 'GoalDo 托管 API', base_url: env.MANAGED_API_BASE_URL, model: env.MANAGED_API_MODEL,
    api_key_ciphertext: await encryptApiKey(env.MANAGED_API_KEY, env), api_key_hint: '管理员托管', status: 'active' as const,
    created_at: '', updated_at: '',
  } satisfies ApiConnectionRow;
}

function publicAuth(user: UserRow) {
  return { authenticated: true, user: { id: user.id, email: user.email, role: user.role, status: user.status, admin_note: user.admin_note, last_seen_at: user.last_seen_at, created_at: user.created_at, updated_at: user.updated_at }, needsInvite: user.status === 'pending', isAdmin: user.role === 'admin' };
}

async function registerWithPassword(request: Request, env: Env) {
  if (!sameOrigin(request)) return json({ error: '请求来源无效' }, 403);
  const body = await request.json<{ email?: string; password?: string; passwordConfirm?: string; inviteCode?: string }>();
  const email = emailInput(body.email);
  const password = passwordInput(body.password);
  const passwordConfirm = passwordInput(body.passwordConfirm);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: '请输入有效邮箱地址' }, 400);
  if (password.length < 8) return json({ error: '密码至少需要 8 位' }, 400);
  if (password.length > 200) return json({ error: '密码长度不能超过 200 位' }, 400);
  if (password !== passwordConfirm) return json({ error: '两次输入的密码不一致' }, 400);
  const isAdmin = email === adminEmail(env);
  const now = new Date().toISOString();
  let user = await env.DB.prepare('SELECT id, email, role, status, admin_note, last_seen_at, created_at, updated_at, password_hash, password_salt, password_iterations, last_password_login_at FROM users WHERE email = ? LIMIT 1').bind(email).first<UserRow>();
  if (user?.status === 'suspended') return json({ error: '该账号已被停用，请联系管理员' }, 403);
  if (user?.password_hash) return json({ error: '该邮箱已经注册，请直接登录' }, 409);
  if (!user) {
    const id = crypto.randomUUID();
    user = { id, email, role: isAdmin ? 'admin' : 'member', status: isAdmin ? 'active' : 'pending', admin_note: '', last_seen_at: now, created_at: now, updated_at: now, password_hash: null, password_salt: null, password_iterations: 100000, last_password_login_at: null };
    await env.DB.prepare('INSERT INTO users (id, access_sub, email, role, status, admin_note, last_seen_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(id, `local:${id}`, email, user.role, user.status, '', now, now, now).run();
  }
  const passwordRecord = await hashPassword(password);
  await env.DB.prepare('UPDATE users SET password_hash = ?, password_salt = ?, password_iterations = ?, updated_at = ? WHERE id = ?').bind(passwordRecord.hash, passwordRecord.salt, passwordRecord.iterations, now, user.id).run();
  user = { ...user, password_hash: passwordRecord.hash, password_salt: passwordRecord.salt, password_iterations: passwordRecord.iterations, updated_at: now };
  if (!isAdmin && user.status !== 'active') {
    const invite = await activeInvite(env, user, body.inviteCode || '');
    if (!invite.ok) return json({ error: invite.error }, invite.error.includes('次数') ? 429 : 400);
    user = invite.user;
  } else if (isAdmin) {
    await env.DB.prepare("UPDATE users SET role = 'admin', status = 'active', updated_at = ? WHERE id = ?").bind(now, user.id).run();
    user = { ...user, role: 'admin', status: 'active' };
  }
  const session = await createSession(user.id, env);
  return authResponse(publicAuth(user), sessionCookie(session), 201);
}

async function loginWithPassword(request: Request, env: Env) {
  if (!sameOrigin(request)) return json({ error: '请求来源无效' }, 403);
  const body = await request.json<{ email?: string; password?: string }>();
  const email = emailInput(body.email);
  const password = passwordInput(body.password);
  if (!email || !password) return json({ error: '请输入邮箱和密码' }, 400);
  const user = await env.DB.prepare('SELECT id, email, role, status, admin_note, last_seen_at, created_at, updated_at, password_hash, password_salt, password_iterations, last_password_login_at FROM users WHERE email = ? LIMIT 1').bind(email).first<UserRow>();
  if (!user?.password_hash || !user.password_salt) return json({ error: '账号尚未设置密码，请先注册' }, 401);
  if (user.status === 'suspended') return json({ error: '该账号已被停用，请联系管理员' }, 403);
  if (!(await verifyPassword(password, user.password_hash, user.password_salt, user.password_iterations || 100000))) return json({ error: '邮箱或密码不正确' }, 401);
  if (user.status !== 'active') return json({ error: '账号还未激活，请使用有效邀请码完成注册' , needsInvite: true }, 403);
  const now = new Date().toISOString();
  await env.DB.prepare('UPDATE users SET last_seen_at = ?, last_password_login_at = ?, updated_at = ? WHERE id = ?').bind(now, now, now, user.id).run();
  const session = await createSession(user.id, env);
  return authResponse(publicAuth({ ...user, last_seen_at: now, last_password_login_at: now }), sessionCookie(session));
}

async function handleApi(request: Request, env: Env, url: URL) {
  if (url.pathname === '/api/health') return json({ ok: true, auth: 'cloudflare-access', storage: 'd1', ai: false });

  if (url.pathname === '/api/auth/register' && request.method === 'POST') return registerWithPassword(request, env);
  if (url.pathname === '/api/auth/login' && request.method === 'POST') return loginWithPassword(request, env);
  if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
    if (!sameOrigin(request)) return json({ error: '请求来源无效' }, 403);
    return authResponse({ ok: true }, sessionCookie('', 0));
  }
  if (url.pathname === '/api/auth/me' && request.method === 'GET') {
    if (isAdminHostname(request, env)) {
      const admin = await ensureUser(request, env);
      return json(publicAuth(admin));
    }
    const local = await sessionUser(request, env);
    if (local) return json(publicAuth(local));
    // Keep Cloudflare Access identity usable when the self-hosted instance enables it.
    if (request.headers.get('Cf-Access-Jwt-Assertion')) {
      const legacy = await ensureUser(request, env);
      return json(publicAuth(legacy));
    }
    return json({ authenticated: false, user: null, needsInvite: false, isAdmin: false });
  }

  const user = await ensureUser(request, env);
  if (url.pathname === '/api/auth/redeem' && request.method === 'POST') return redeemInvite(request, env, user);

  if (url.pathname === '/api/admin/api-requests' && request.method === 'GET') {
    await requireAdmin(request, env);
    const requests = await env.DB.prepare(`SELECT r.id, r.user_id, u.email, r.purpose, r.expected_usage, r.status, r.admin_note, r.created_at, r.updated_at
      FROM api_access_requests r JOIN users u ON u.id = r.user_id ORDER BY CASE r.status WHEN 'pending' THEN 0 ELSE 1 END, r.created_at DESC`).all<ApiRequestRow>();
    return json({ requests: requests.results });
  }

  const apiRequestMatch = url.pathname.match(/^\/api\/admin\/api-requests\/([^/]+)$/);
  if (apiRequestMatch && request.method === 'PATCH') {
    await requireAdmin(request, env);
    if (!sameOrigin(request)) return json({ error: '请求来源无效' }, 403);
    const body = await request.json<{ status?: string; adminNote?: string }>();
    if (body.status !== 'approved' && body.status !== 'rejected') return json({ error: '申请状态无效' }, 400);
    const now = new Date().toISOString();
    await env.DB.prepare('UPDATE api_access_requests SET status = ?, admin_note = COALESCE(?, admin_note), updated_at = ? WHERE id = ?')
      .bind(body.status, body.adminNote?.trim().slice(0, 1000) || null, now, apiRequestMatch[1]).run();
    return json({ ok: true, updatedAt: now });
  }

  if (url.pathname === '/api/admin/managed-api' && request.method === 'GET') {
    const admin = await requireAdmin(request, env);
    const connection = await env.DB.prepare("SELECT id, owner_id, mode, provider, preset_id, label, base_url, model, api_key_ciphertext, api_key_hint, status, created_at, updated_at FROM api_connections WHERE owner_id = ? AND mode = 'self' ORDER BY updated_at DESC LIMIT 1").bind(admin.id).first<ApiConnectionRow>();
    return json({ connection: connection ? apiConnectionPublic(connection) : null, encryption: { algorithm: 'AES-256-GCM', keyConfigured: Boolean(env.API_ENCRYPTION_KEY) } });
  }

  if (url.pathname === '/api/admin/managed-api' && request.method === 'POST') {
    const admin = await requireAdmin(request, env);
    if (!sameOrigin(request)) return json({ error: '请求来源无效' }, 403);
    const body = await request.json<{ provider?: string; presetId?: string; label?: string; baseUrl?: string; model?: string; apiKey?: string }>();
    const provider = body.provider === 'custom' ? 'custom' : 'openai-compatible';
    const presetId = ['openai', 'anthropic', 'deepseek', 'gemini', 'qwen', 'kimi', 'glm', 'custom'].includes(body.presetId || '') ? body.presetId : 'custom';
    const label = (body.label || 'GoalDo 托管 API').trim().slice(0, 80);
    const baseUrl = (body.baseUrl || '').trim().replace(/\/+$/, '').slice(0, 500);
    const model = (body.model || '').trim().slice(0, 120);
    const apiKey = (body.apiKey || '').trim();
    if (!/^https:\/\//i.test(baseUrl)) return json({ error: 'Base URL 必须使用 HTTPS' }, 400);
    if (!model) return json({ error: '请填写模型名称' }, 400);
    const existing = await env.DB.prepare("SELECT id, api_key_ciphertext, api_key_hint, created_at FROM api_connections WHERE owner_id = ? AND mode = 'self' ORDER BY updated_at DESC LIMIT 1").bind(admin.id).first<Pick<ApiConnectionRow, 'id' | 'api_key_ciphertext' | 'api_key_hint' | 'created_at'>>();
    if (!apiKey && !existing) return json({ error: '首次保存托管 API 请填写 API Key' }, 400);
    const now = new Date().toISOString();
    const id = existing?.id || crypto.randomUUID();
    const encrypted = apiKey ? await encryptApiKey(apiKey, env) : existing?.api_key_ciphertext || '';
    const hint = apiKey ? apiKeyHint(apiKey) : existing?.api_key_hint || '';
    if (existing) {
      await env.DB.prepare("UPDATE api_connections SET provider = ?, preset_id = ?, label = ?, base_url = ?, model = ?, api_key_ciphertext = ?, api_key_hint = ?, status = 'active', updated_at = ? WHERE id = ? AND owner_id = ?")
        .bind(provider, presetId, label, baseUrl, model, encrypted, hint, now, id, admin.id).run();
    } else {
      await env.DB.prepare("INSERT INTO api_connections (id, owner_id, mode, provider, preset_id, label, base_url, model, api_key_ciphertext, api_key_hint, status, created_at, updated_at) VALUES (?, ?, 'self', ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)")
        .bind(id, admin.id, provider, presetId, label, baseUrl, model, encrypted, hint, now, now).run();
    }
    const connection = await env.DB.prepare('SELECT id, owner_id, mode, provider, preset_id, label, base_url, model, api_key_ciphertext, api_key_hint, status, created_at, updated_at FROM api_connections WHERE id = ?').bind(id).first<ApiConnectionRow>();
    return json({ connection: connection ? apiConnectionPublic(connection) : null, encryption: { algorithm: 'AES-256-GCM', keyConfigured: Boolean(env.API_ENCRYPTION_KEY) } });
  }

  if (url.pathname === '/api/admin/managed-api/test' && request.method === 'POST') {
    const admin = await requireAdmin(request, env);
    if (!sameOrigin(request)) return json({ error: '请求来源无效' }, 403);
    const body = await request.json<{ presetId?: string; baseUrl?: string; model?: string; apiKey?: string }>();
    const existing = await env.DB.prepare("SELECT api_key_ciphertext FROM api_connections WHERE owner_id = ? AND mode = 'self' AND status = 'active' ORDER BY updated_at DESC LIMIT 1").bind(admin.id).first<{ api_key_ciphertext: string }>();
    const key = (body.apiKey || '').trim() || (existing ? await decryptApiKey(existing.api_key_ciphertext, env) : '');
    if (!/^https:\/\//i.test((body.baseUrl || '').trim()) || !body.model?.trim() || !key) return json({ error: '请先填写完整的 Base URL、模型和 API Key' }, 400);
    try { return json(await probeConnection(body.baseUrl.trim(), body.model.trim(), key, body.presetId)); }
    catch (error) { return json({ ok: false, message: error instanceof Error ? error.message : '连接失败，请检查服务地址' }, 502); }
  }

  if (url.pathname === '/api/admin/managed-api' && request.method === 'DELETE') {
    const admin = await requireAdmin(request, env);
    if (!sameOrigin(request)) return json({ error: '请求来源无效' }, 403);
    await env.DB.prepare("UPDATE api_connections SET status = 'revoked', updated_at = ? WHERE owner_id = ? AND mode = 'self'").bind(new Date().toISOString(), admin.id).run();
    return json({ ok: true });
  }

  if (url.pathname === '/api/admin/invites' && request.method === 'GET') {
    await requireAdmin(request, env);
    const invites = await env.DB.prepare('SELECT id, code_prefix, label, max_uses, used_count, expires_at, status, created_at FROM invite_codes ORDER BY created_at DESC').all<InviteRow>();
    return json({ invites: invites.results });
  }
  if (url.pathname === '/api/admin/invites' && request.method === 'POST') {
    const admin = await requireAdmin(request, env);
    if (!sameOrigin(request)) return json({ error: '请求来源无效' }, 403);
    const body = await request.json<{ label?: string; maxUses?: number; expiresAt?: string | null }>();
    const maxUses = Math.min(1000, Math.max(1, Number(body.maxUses) || 1));
    const expiresAt = body.expiresAt ? new Date(body.expiresAt).toISOString() : null;
    if (expiresAt && expiresAt <= new Date().toISOString()) return json({ error: '有效期必须晚于当前时间' }, 400);
    const code = makeInviteCode();
    const normalized = normalizeCode(code);
    const invite = { id: crypto.randomUUID(), code_prefix: code.slice(0, 9), label: (body.label || '').trim().slice(0, 80), max_uses: maxUses, used_count: 0, expires_at: expiresAt, status: 'active' as const, created_at: new Date().toISOString() };
    await env.DB.prepare('INSERT INTO invite_codes (id, code_hash, code_prefix, label, max_uses, expires_at, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(invite.id, await sha256(normalized), invite.code_prefix, invite.label, invite.max_uses, invite.expires_at, invite.status, admin.id, invite.created_at).run();
    return json({ invite, code }, 201);
  }

  const inviteMatch = url.pathname.match(/^\/api\/admin\/invites\/([^/]+)$/);
  if (inviteMatch && request.method === 'PATCH') {
    await requireAdmin(request, env);
    if (!sameOrigin(request)) return json({ error: '请求来源无效' }, 403);
    const body = await request.json<{ status?: string }>();
    if (body.status !== 'revoked') return json({ error: '只支持撤销邀请码' }, 400);
    await env.DB.prepare("UPDATE invite_codes SET status = 'revoked' WHERE id = ?").bind(inviteMatch[1]).run();
    return json({ ok: true });
  }

  if (url.pathname === '/api/admin/users' && request.method === 'GET') {
    await requireAdmin(request, env);
    const users = await env.DB.prepare(`SELECT u.id, u.email, u.role, u.status, u.admin_note, u.last_seen_at, u.created_at, u.updated_at,
      COUNT(p.id) AS project_count
      FROM users u LEFT JOIN projects p ON p.owner_id = u.id
      GROUP BY u.id ORDER BY u.created_at DESC`).all<UserRow & { project_count: number }>();
    return json({ users: users.results });
  }

  const userMatch = url.pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (userMatch && request.method === 'PATCH') {
    const admin = await requireAdmin(request, env);
    if (!sameOrigin(request)) return json({ error: '请求来源无效' }, 403);
    const body = await request.json<{ status?: string; adminNote?: string }>();
    const now = new Date().toISOString();
    if (body.status !== undefined) {
      if (body.status !== 'active' && body.status !== 'suspended') return json({ error: '账号状态无效' }, 400);
      if (userMatch[1] === admin.id && body.status === 'suspended') return json({ error: '不能停用自己的管理员账号' }, 400);
      await env.DB.prepare("UPDATE users SET status = ?, updated_at = ? WHERE id = ? AND role != 'admin'").bind(body.status, now, userMatch[1]).run();
    }
    if (body.adminNote !== undefined) {
      await env.DB.prepare('UPDATE users SET admin_note = ?, updated_at = ? WHERE id = ?').bind(body.adminNote.trim().slice(0, 2000), now, userMatch[1]).run();
    }
    return json({ ok: true });
  }

  if (url.pathname === '/api/admin/overview' && request.method === 'GET') {
    await requireAdmin(request, env);
    const [users, projects, invites] = await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) AS total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) AS suspended
        FROM users`).first<Record<string, number>>(),
      env.DB.prepare(`SELECT COUNT(*) AS total,
        SUM(CASE WHEN admin_status = 'active' THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN admin_status = 'flagged' THEN 1 ELSE 0 END) AS flagged
        FROM projects`).first<Record<string, number>>(),
      env.DB.prepare(`SELECT COUNT(*) AS total,
        SUM(CASE WHEN status = 'active' AND used_count < max_uses AND (expires_at IS NULL OR expires_at > ?) THEN 1 ELSE 0 END) AS active
        FROM invite_codes`).bind(new Date().toISOString()).first<Record<string, number>>(),
    ]);
    return json({ users, projects, invites });
  }

  if (url.pathname === '/api/admin/projects' && request.method === 'GET') {
    await requireAdmin(request, env);
    const rows = await env.DB.prepare(`SELECT p.id AS storage_id, p.owner_id, u.email AS owner_email, p.data,
      p.admin_note, p.admin_status, p.created_at, p.updated_at
      FROM projects p JOIN users u ON u.id = p.owner_id ORDER BY p.updated_at DESC`)
      .all<{ storage_id: string; owner_id: string; owner_email: string; data: string; admin_note: string; admin_status: string; created_at: string; updated_at: string }>();
    const projects = rows.results.flatMap((row) => {
      try {
        const data = JSON.parse(row.data) as { id?: string; name?: string; description?: string; type?: string; emoji?: string; stages?: unknown[]; tasks?: Array<{ status?: string }> };
        const totalTasks = data.tasks?.length || 0;
        const doneTasks = data.tasks?.filter((task) => task.status === 'done').length || 0;
        return [{ ...row, data, project_id: data.id || '', name: data.name || '未命名项目', description: data.description || '', type: data.type || 'website', emoji: data.emoji || '◇', stage_count: data.stages?.length || 0, task_count: totalTasks, progress: totalTasks ? Math.round(doneTasks / totalTasks * 100) : 0 }];
      } catch { return []; }
    });
    return json({ projects });
  }

  const adminProjectMatch = url.pathname.match(/^\/api\/admin\/projects\/([^/]+)$/);
  if (adminProjectMatch && request.method === 'PATCH') {
    await requireAdmin(request, env);
    if (!sameOrigin(request)) return json({ error: '请求来源无效' }, 403);
    const body = await request.json<{ adminNote?: string; status?: string }>();
    const storageId = decodeURIComponent(adminProjectMatch[1]);
    const now = new Date().toISOString();
    if (body.status !== undefined) {
      if (!['active', 'flagged', 'archived'].includes(body.status)) return json({ error: '项目管理状态无效' }, 400);
      await env.DB.prepare('UPDATE projects SET admin_status = ?, updated_at = ? WHERE id = ?').bind(body.status, now, storageId).run();
    }
    if (body.adminNote !== undefined) {
      await env.DB.prepare('UPDATE projects SET admin_note = ?, updated_at = ? WHERE id = ?').bind(body.adminNote.trim().slice(0, 4000), now, storageId).run();
    }
    return json({ ok: true, updatedAt: now });
  }

  const activeUser = await requireActive(request, env);
  if (url.pathname === '/api/api-access' && request.method === 'GET') {
    const [connectionRows, requestRow] = await Promise.all([
      env.DB.prepare('SELECT id, owner_id, mode, provider, preset_id, label, base_url, model, api_key_ciphertext, api_key_hint, status, created_at, updated_at FROM api_connections WHERE owner_id = ? ORDER BY updated_at DESC').bind(activeUser.id).all<ApiConnectionRow>(),
      env.DB.prepare('SELECT id, user_id, purpose, expected_usage, status, admin_note, created_at, updated_at FROM api_access_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').bind(activeUser.id).first<ApiRequestRow>(),
    ]);
    return json({ connections: connectionRows.results.map(apiConnectionPublic), request: requestRow });
  }

  if (url.pathname === '/api/api-connections' && request.method === 'POST') {
    if (!sameOrigin(request)) return json({ error: '请求来源无效' }, 403);
    const body = await request.json<{ provider?: string; presetId?: string; label?: string; baseUrl?: string; model?: string; apiKey?: string }>();
    const provider = body.provider === 'custom' ? 'custom' : 'openai-compatible';
    const presetId = ['openai', 'anthropic', 'deepseek', 'gemini', 'qwen', 'kimi', 'glm', 'custom'].includes(body.presetId || '') ? body.presetId : 'custom';
    const label = (body.label || '我的 AI API').trim().slice(0, 80);
    const baseUrl = (body.baseUrl || '').trim().replace(/\/+$/, '').slice(0, 500);
    const model = (body.model || '').trim().slice(0, 120);
    const apiKey = (body.apiKey || '').trim();
    if (!/^https:\/\//i.test(baseUrl)) return json({ error: 'Base URL 必须使用 HTTPS' }, 400);
    if (!model) return json({ error: '请填写模型名称' }, 400);
    const existing = await env.DB.prepare("SELECT id, api_key_ciphertext, api_key_hint FROM api_connections WHERE owner_id = ? AND mode = 'self' AND status = 'active' ORDER BY updated_at DESC LIMIT 1").bind(activeUser.id).first<Pick<ApiConnectionRow, 'id' | 'api_key_ciphertext' | 'api_key_hint'>>();
    if (!apiKey && !existing) return json({ error: '首次保存请填写 API Key' }, 400);
    const now = new Date().toISOString();
    const id = existing?.id || crypto.randomUUID();
    const encrypted = apiKey ? await encryptApiKey(apiKey, env) : existing?.api_key_ciphertext || '';
    const hint = apiKey ? apiKeyHint(apiKey) : existing?.api_key_hint || '';
    if (existing) {
      await env.DB.prepare('UPDATE api_connections SET provider = ?, preset_id = ?, label = ?, base_url = ?, model = ?, api_key_ciphertext = ?, api_key_hint = ?, status = \'active\', updated_at = ? WHERE id = ? AND owner_id = ?')
        .bind(provider, presetId, label, baseUrl, model, encrypted, hint, now, id, activeUser.id).run();
    } else {
      await env.DB.prepare('INSERT INTO api_connections (id, owner_id, mode, provider, preset_id, label, base_url, model, api_key_ciphertext, api_key_hint, status, created_at, updated_at) VALUES (?, ?, \'self\', ?, ?, ?, ?, ?, ?, ?, \'active\', ?, ?)')
        .bind(id, activeUser.id, provider, presetId, label, baseUrl, model, encrypted, hint, now, now).run();
    }
    const connection = await env.DB.prepare('SELECT id, owner_id, mode, provider, preset_id, label, base_url, model, api_key_ciphertext, api_key_hint, status, created_at, updated_at FROM api_connections WHERE id = ?').bind(id).first<ApiConnectionRow>();
    return json({ connection: connection ? apiConnectionPublic(connection) : null });
  }

  if (url.pathname === '/api/api-connections/test' && request.method === 'POST') {
    if (!sameOrigin(request)) return json({ error: '请求来源无效' }, 403);
    const body = await request.json<{ presetId?: string; baseUrl?: string; model?: string; apiKey?: string }>();
    const existing = await env.DB.prepare("SELECT api_key_ciphertext FROM api_connections WHERE owner_id = ? AND mode = 'self' AND status = 'active' ORDER BY updated_at DESC LIMIT 1").bind(activeUser.id).first<{ api_key_ciphertext: string }>();
    const key = (body.apiKey || '').trim() || (existing ? await decryptApiKey(existing.api_key_ciphertext, env) : '');
    if (!/^https:\/\//i.test((body.baseUrl || '').trim()) || !body.model?.trim() || !key) return json({ error: '请先填写完整的 Base URL、模型和 API Key' }, 400);
    try { return json(await probeConnection(body.baseUrl.trim(), body.model.trim(), key, body.presetId)); }
    catch (error) { return json({ ok: false, message: error instanceof Error ? error.message : '连接失败，请检查服务地址' }, 502); }
  }

  const apiConnectionMatch = url.pathname.match(/^\/api\/api-connections\/([^/]+)$/);
  if (apiConnectionMatch && request.method === 'DELETE') {
    if (!sameOrigin(request)) return json({ error: '请求来源无效' }, 403);
    await env.DB.prepare("UPDATE api_connections SET status = 'revoked', updated_at = ? WHERE id = ? AND owner_id = ?").bind(new Date().toISOString(), apiConnectionMatch[1], activeUser.id).run();
    return json({ ok: true });
  }

  if (url.pathname === '/api/api-access/requests' && request.method === 'POST') {
    if (!sameOrigin(request)) return json({ error: '请求来源无效' }, 403);
    const body = await request.json<{ purpose?: string; expectedUsage?: string }>();
    const purpose = (body.purpose || '').trim().slice(0, 2000);
    const expectedUsage = (body.expectedUsage || '').trim().slice(0, 500);
    if (purpose.length < 8) return json({ error: '请至少填写 8 个字说明使用目的' }, 400);
    await enforceDailyLimit(env, 'api-request', activeUser.id, 3);
    const now = new Date().toISOString();
    const existing = await env.DB.prepare("SELECT id FROM api_access_requests WHERE user_id = ? AND status = 'pending' LIMIT 1").bind(activeUser.id).first<{ id: string }>();
    const id = existing?.id || crypto.randomUUID();
    if (existing) {
      await env.DB.prepare('UPDATE api_access_requests SET purpose = ?, expected_usage = ?, updated_at = ? WHERE id = ?').bind(purpose, expectedUsage, now, id).run();
    } else {
      await env.DB.prepare("INSERT INTO api_access_requests (id, user_id, purpose, expected_usage, status, admin_note, created_at, updated_at) VALUES (?, ?, ?, ?, 'pending', '', ?, ?)").bind(id, activeUser.id, purpose, expectedUsage, now, now).run();
    }
    const requestRow = await env.DB.prepare('SELECT id, user_id, purpose, expected_usage, status, admin_note, created_at, updated_at FROM api_access_requests WHERE id = ?').bind(id).first<ApiRequestRow>();
    return json({ request: requestRow }, existing ? 200 : 201);
  }

  if (url.pathname === '/api/projects' && request.method === 'GET') return json({ projects: await listProjects(env, activeUser) });

  const projectMatch = url.pathname.match(/^\/api\/projects\/([^/]+)$/);
  if (projectMatch && request.method === 'PUT') return saveProject(request, env, activeUser, decodeURIComponent(projectMatch[1]));

  if (url.pathname === '/api/projects/plan' && request.method === 'POST') {
    if (!sameOrigin(request)) return json({ error: '请求来源无效' }, 403);
    const brief = await request.json<ProjectBrief>();
    if (!brief.goal?.trim()) return json({ error: '请输入项目目标' }, 400);
    const project = makeProject(brief);
    const now = new Date().toISOString();
    await env.DB.prepare('INSERT INTO projects (id, owner_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .bind(`${activeUser.id}:${project.id}`, activeUser.id, JSON.stringify(project), now, now).run();
    return json({ project, engine: 'template' });
  }
  if (url.pathname === '/api/ai/chat' && request.method === 'POST') {
    if (!sameOrigin(request)) return json({ error: '请求来源无效' }, 403);
    const body = await request.json<{ message?: string; node?: { title?: string; deliverable?: string; acceptanceCriteria?: string[] } }>();
    if (!body.message?.trim()) return json({ error: '请输入问题' }, 400);
    const selfConnection = await env.DB.prepare("SELECT id, owner_id, mode, provider, preset_id, label, base_url, model, api_key_ciphertext, api_key_hint, status, created_at, updated_at FROM api_connections WHERE owner_id = ? AND mode = 'self' AND status = 'active' ORDER BY updated_at DESC LIMIT 1").bind(activeUser.id).first<ApiConnectionRow>();
    const managedRequest = await env.DB.prepare("SELECT id FROM api_access_requests WHERE user_id = ? AND status = 'approved' ORDER BY updated_at DESC LIMIT 1").bind(activeUser.id).first<{ id: string }>();
    const adminConnection = managedRequest ? await env.DB.prepare("SELECT c.id, c.owner_id, c.mode, c.provider, c.preset_id, c.label, c.base_url, c.model, c.api_key_ciphertext, c.api_key_hint, c.status, c.created_at, c.updated_at FROM api_connections c JOIN users u ON u.id = c.owner_id WHERE lower(u.email) = lower(?) AND c.mode = 'self' AND c.status = 'active' ORDER BY c.updated_at DESC LIMIT 1").bind(adminEmail(env)).first<ApiConnectionRow>() : null;
    const connection = selfConnection || adminConnection || (managedRequest ? await managedConnection(env) : null);
    if (connection) {
      try { return json({ reply: await chatWithConnection(connection, body.message, body.node || {}, env), engine: connection.mode === 'managed' ? 'managed-api' : 'self-api' }); }
      catch (error) { console.error('Configured API failed, falling back to GoalDo coach:', error); }
    }
    return json({ reply: coachReply(body.message, body.node), engine: 'local-fallback' });
  }
  return json({ error: '接口不存在' }, 404);
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env, url);
      } catch (error) {
        if (error instanceof Response) return error;
        console.error('API error:', error);
        return json({ error: '服务暂时不可用', detail: errorMessage(error) }, 500);
      }
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || request.method !== 'GET') return withSecurityHeaders(response);
    const acceptsHtml = request.headers.get('Accept')?.includes('text/html');
    return acceptsHtml ? withSecurityHeaders(await env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request))) : withSecurityHeaders(response);
  },
};
