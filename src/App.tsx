import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  Box,
  Check,
  CheckCircle2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock3,
  Copy,
  Database,
  Eye,
  FileText,
  FolderKanban,
  Focus,
  Gauge,
  Grid2X2,
  HelpCircle,
  Home,
  Layers3,
  Languages,
  Lightbulb,
  Link2,
  ListChecks,
  LoaderCircle,
  Lock,
  LogOut,
  MessageCircle,
  Mic,
  MicOff,
  Minus,
  MoreHorizontal,
  Network,
  Paperclip,
  Play,
  Plus,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Target,
  Ticket,
  UploadCloud,
  Users,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { apiProviderPresets, defaultBrief, interviewQuestions, templateOptions } from './data';
import type { ApiAccessRequest, ApiConnection, ApiPresetId, ChatMessage, Project, ProjectBrief, ProjectType, Stage, TaskNode, ViewMode } from './types';

const uid = () => Math.random().toString(36).slice(2, 10);

type AccountStatus = 'pending' | 'active' | 'suspended';
type AccountRole = 'member' | 'admin';
type AccountUser = { id: string; email: string; role: AccountRole; status: AccountStatus; admin_note?: string; last_seen_at?: string | null; project_count?: number; created_at: string; updated_at: string };
type AuthState = { authenticated: true; user: AccountUser; needsInvite: boolean; isAdmin: boolean };
type UnauthenticatedState = { authenticated: false; user: null; needsInvite: false; isAdmin: false };
type InviteRecord = { id: string; code_prefix: string; label: string; max_uses: number; used_count: number; expires_at: string | null; status: 'active' | 'revoked'; created_at: string };
type AdminProject = { storage_id: string; owner_id: string; owner_email: string; project_id: string; name: string; description: string; type: string; emoji: string; stage_count: number; task_count: number; progress: number; admin_note: string; admin_status: 'active' | 'flagged' | 'archived'; created_at: string; updated_at: string; data: Project };
type AdminOverview = { users: { total: number; active: number; pending: number; suspended: number }; projects: { total: number; active: number; flagged: number }; invites: { total: number; active: number } };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || '请求失败，请稍后再试');
  return data;
}

const statusLabel: Record<TaskNode['status'], string> = {
  locked: '待解锁',
  todo: '待开始',
  'in-progress': '进行中',
  review: '待审核',
  done: '已完成',
};

const projectTypeLabels: Record<ProjectType, string> = {
  website: '网站项目',
  app: 'App 项目',
  content: '内容项目',
  ecommerce: '电商项目',
  hardware: '硬件项目',
  product: '实体产品',
  startup: '创业验证',
  research: '调研项目',
  agent: 'AI Agent',
};

type SpeechRecognitionResultLike = { 0: { transcript: string }; isFinal: boolean };
type SpeechRecognitionEventLike = { results: ArrayLike<SpeechRecognitionResultLike> };
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function Brand() {
  return (
    <div className="brand" aria-label="GoalDo">
      <span className="brand-mark"><Network size={18} strokeWidth={2.3} /></span>
      <span>GoalDo</span>
    </div>
  );
}

function AuthLoading() {
  return (
    <main className="auth-screen auth-loading">
      <div className="auth-orbit"><Network size={27} /><i /><i /></div>
      <p>正在进入你的项目空间</p>
    </main>
  );
}

function AuthProblem({ message }: { message: string }) {
  return (
    <main className="auth-screen">
      <section className="auth-card problem-card">
        <span className="auth-icon"><ShieldCheck size={25} /></span>
        <p className="eyebrow">GOALDO ACCESS</p>
        <h1>暂时无法进入</h1>
        <p>{message}</p>
        <div className="auth-card-actions">
          <button className="primary" onClick={() => window.location.reload()}>重新尝试</button>
          <a className="secondary" href="/cdn-cgi/access/logout">更换邮箱</a>
        </div>
      </section>
    </main>
  );
}

function PasswordAuthScreen({ onAuthenticated }: { onAuthenticated: (auth: AuthState) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const zh = language === 'zh';

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const result = await api<AuthState>(mode === 'login' ? '/api/auth/login' : '/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, passwordConfirm, inviteCode }),
      });
      onAuthenticated(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : (zh ? '登录失败，请稍后再试' : 'Unable to continue.'));
    } finally { setBusy(false); }
  }

  return (
    <main className="auth-screen password-auth-screen">
      <div className="auth-noise" />
      <section className="password-auth-shell">
        <div className="password-auth-story">
          <div className="auth-story-top"><Brand /><button className="language-toggle" onClick={() => setLanguage((value) => value === 'zh' ? 'en' : 'zh')}><Languages size={14} />{zh ? 'EN' : '中文'}</button></div>
          <p className="eyebrow">GOALDO · AI PROJECT OPERATOR</p>
          <h1>{zh ? <>把一个想法，<em>推进成真实进展。</em></> : <>Turn an idea into <em>real progress.</em></>}</h1>
          <p className="story-lead">{zh ? 'GoalDo 不是只给答案的聊天工具。它会把你的目标拆成项目地图、阶段、任务和验收标准，陪你一步一步把事情做完。' : 'GoalDo turns a vague goal into a project map, executable tasks and checkable outcomes — then stays with you as the work moves forward.'}</p>
          <div className="story-points"><span><strong>01</strong>{zh ? '看清路线' : 'See the route'}</span><span><strong>02</strong>{zh ? '完成节点' : 'Complete nodes'}</span><span><strong>03</strong>{zh ? '复盘迭代' : 'Learn and iterate'}</span></div>
          <p className="story-rule">{zh ? '邀请制实验 · 项目数据按账号隔离 · 管理员仅为支持与安全审核查看' : 'Invite-only experiment · project data is account-isolated · admin access is for support and safety review'}</p>
        </div>
        <div className="password-auth-card">
          <div className="password-auth-card-head"><span className="auth-icon"><Lock size={22} /></span><span className="auth-card-tag">{mode === 'login' ? (zh ? '欢迎回来' : 'WELCOME BACK') : (zh ? '邀请制测试' : 'PRIVATE BETA')}</span></div>
          <h2>{mode === 'login' ? (zh ? '进入你的项目空间' : 'Enter your project space') : (zh ? '创建你的项目空间' : 'Create your project space')}</h2>
          <p className="password-auth-intro">{mode === 'login' ? (zh ? '使用邮箱和密码继续推进。' : 'Use your email and password to continue.') : (zh ? '注册后输入管理员发放的邀请码即可开始。' : 'Register, then enter the invite code from your administrator.')}</p>
          <form className="password-auth-form" onSubmit={submit}>
            <label><span>{zh ? '邮箱' : 'Email'}</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></label>
            <label><span>{zh ? '密码' : 'Password'}</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={zh ? '至少 8 位' : 'At least 8 characters'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required /></label>
            {mode === 'register' && <>
              <label><span>{zh ? '确认密码' : 'Confirm password'}</span><input type="password" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} autoComplete="new-password" required /></label>
              <label><span>{zh ? '邀请码' : 'Invite code'} <small>{zh ? '管理员邮箱可留空' : 'Optional for admin email'}</small></span><input value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} placeholder="GOAL-XXXX-XXXX-XXXX" autoComplete="one-time-code" /></label>
            </>}
            {error && <p className="auth-form-error">{error}</p>}
            <button className="primary password-submit" disabled={busy}>{busy ? <><LoaderCircle className="spin" size={16} />{zh ? '处理中…' : 'Working…'}</> : <>{mode === 'login' ? (zh ? '登录 GoalDo' : 'Sign in to GoalDo') : (zh ? '创建账号' : 'Create account')} <ArrowRight size={16} /></>}</button>
          </form>
          <div className="password-auth-switch">{mode === 'login' ? (zh ? '还没有账号？' : 'New to GoalDo?') : (zh ? '已有账号？' : 'Already have an account?')} <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? (zh ? '使用邀请码注册' : 'Register with invite') : (zh ? '返回登录' : 'Back to sign in')}</button></div>
          <p className="password-auth-notice"><ShieldCheck size={14} />{zh ? '密码只以加盐哈希保存，管理员无法看到你的原始密码。请勿提交验证码、证件或银行卡信息。' : 'Passwords are stored as salted hashes. Admins cannot see the original password. Do not submit codes, IDs or payment data.'}</p>
        </div>
      </section>
    </main>
  );
}

function InviteGate({ user, onActivated }: { user: AccountUser; onActivated: (user: AccountUser) => void }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');
  const copy = language === 'zh' ? {
    badge: '邀请制测试', eyebrow: '最后一步', title: '邮箱已验证。', accent: '现在创建你的个人空间。',
    intro: '输入管理员发给你的邀请码。账号和项目将与你的邮箱绑定，普通用户之间的数据彼此隔离。',
    email: '已验证邮箱', code: '邀请码', submit: '进入个人项目空间', checking: '正在验证',
    privacy: '数据与隐私说明', notice: '测试期间，管理员可查看注册信息、项目内容、进度和状态，用于服务支持、安全审核与产品改进。请勿上传密码、验证码、身份证、银行卡等敏感信息。',
    security: '登录由 Cloudflare 邮箱验证码保护', switchAccount: '更换邮箱',
  } : {
    badge: 'PRIVATE BETA', eyebrow: 'ONE LAST STEP', title: 'Email verified.', accent: 'Create your private project space.',
    intro: 'Enter the invite code from the administrator. Your account and projects are isolated from other members and bound to this email.',
    email: 'Verified email', code: 'Invite code', submit: 'Enter my project space', checking: 'Verifying',
    privacy: 'Data & privacy notice', notice: 'During beta, administrators may view registration data, project content, progress and status for support, safety and product improvement. Do not upload passwords, verification codes, identity documents or payment data.',
    security: 'Email verification is protected by Cloudflare', switchAccount: 'Switch email',
  };

  async function redeem(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api<{ user: AccountUser }>('/api/auth/redeem', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }),
      });
      onActivated(result.user);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '邀请码验证失败');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-screen invite-screen">
      <div className="auth-noise" />
      <section className="auth-card invite-card">
        <div className="invite-brand"><Brand /><div className="invite-brand-actions"><button className="language-toggle" onClick={() => setLanguage((value) => value === 'zh' ? 'en' : 'zh')}><Languages size={14} />{language === 'zh' ? 'EN' : '中文'}</button><span>{copy.badge}</span></div></div>
        <div className="invite-copy">
          <span className="auth-icon"><Ticket size={25} /></span>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}<br /><em>{copy.accent}</em></h1>
          <p>{copy.intro}</p>
          <div className="privacy-notice"><Eye size={17} /><div><strong>{copy.privacy}</strong><p>{copy.notice}</p></div></div>
        </div>
        <form className="invite-form" onSubmit={redeem}>
          <label><span>{copy.email}</span><strong>{user.email}</strong></label>
          <label><span>{copy.code}</span><input autoFocus value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="GOAL-XXXX-XXXX-XXXX" autoComplete="one-time-code" /></label>
          {error && <p className="auth-form-error">{error}</p>}
          <button className="primary" disabled={busy || code.trim().length < 8}>{busy ? <><LoaderCircle className="spin" size={17} />{copy.checking}</> : <>{copy.submit} <ArrowRight size={17} /></>}</button>
        </form>
        <div className="invite-foot"><ShieldCheck size={14} />{copy.security} · <a href="/cdn-cgi/access/logout">{copy.switchAccount}</a></div>
      </section>
    </main>
  );
}

function AccountActions({ user, onAdmin, compact = false }: { user: AccountUser; onAdmin: () => void; compact?: boolean }) {
  const initials = user.email.slice(0, 2).toUpperCase();
  return (
    <div className={`account-actions ${compact ? 'compact' : ''}`}>
      {user.role === 'admin' && <button className="ghost compact admin-entry" onClick={onAdmin}><ShieldCheck size={15} />管理后台</button>}
      {!compact && <span className="account-email">{user.email}</span>}
      <a className="icon-button logout-button" href="/cdn-cgi/access/logout" title="退出登录"><LogOut size={16} /></a>
      <div className="avatar" title={user.email}>{initials}</div>
    </div>
  );
}

function AdminPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'invites' | 'users'>('invites');
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [users, setUsers] = useState<AccountUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [label, setLabel] = useState('朋友体验');
  const [maxUses, setMaxUses] = useState(1);
  const [days, setDays] = useState(7);
  const [createdCode, setCreatedCode] = useState('');

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const [inviteData, userData] = await Promise.all([
        api<{ invites: InviteRecord[] }>('/api/admin/invites'),
        api<{ users: AccountUser[] }>('/api/admin/users'),
      ]);
      setInvites(inviteData.invites);
      setUsers(userData.users);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function createInvite(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    try {
      const expiresAt = days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null;
      const result = await api<{ invite: InviteRecord; code: string }>('/api/admin/invites', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label, maxUses, expiresAt }),
      });
      setCreatedCode(result.code);
      setInvites((current) => [result.invite, ...current]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '生成失败');
    }
  }

  async function revokeInvite(id: string) {
    await api(`/api/admin/invites/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'revoked' }) });
    setInvites((current) => current.map((invite) => invite.id === id ? { ...invite, status: 'revoked' } : invite));
  }

  async function changeUserStatus(id: string, status: 'active' | 'suspended') {
    await api(`/api/admin/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    setUsers((current) => current.map((user) => user.id === id ? { ...user, status } : user));
  }

  return (
    <div className="modal-backdrop admin-backdrop" role="dialog" aria-modal="true">
      <section className="admin-panel">
        <header className="admin-head">
          <div><p className="eyebrow">GOALDO CONTROL ROOM</p><h1>邀请与用户管理</h1></div>
          <button className="icon-button" onClick={onClose}><X size={18} /></button>
        </header>
        <nav className="admin-tabs">
          <button className={tab === 'invites' ? 'active' : ''} onClick={() => setTab('invites')}><Ticket size={16} />邀请码</button>
          <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}><Users size={16} />用户 <span>{users.length}</span></button>
        </nav>
        {error && <div className="admin-error">{error}</div>}
        <div className="admin-body">
          {tab === 'invites' ? (
            <>
              <form className="invite-builder" onSubmit={createInvite}>
                <div><p className="eyebrow">NEW INVITATION</p><h2>生成一个邀请码</h2><p>设置这枚邀请码能被使用几次，以及多久后失效。</p></div>
                <label><span>备注</span><input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="例如：发给老张" /></label>
                <label><span>使用次数</span><input type="number" min="1" max="1000" value={maxUses} onChange={(event) => setMaxUses(Number(event.target.value))} /></label>
                <label><span>有效天数</span><input type="number" min="0" max="365" value={days} onChange={(event) => setDays(Number(event.target.value))} /><small>填 0 表示长期有效</small></label>
                <button className="primary"><Sparkles size={16} />生成邀请码</button>
              </form>
              {createdCode && (
                <div className="created-invite">
                  <div><small>刚刚生成 · 请复制保存，系统不会再次显示完整号码</small><strong>{createdCode}</strong></div>
                  <button className="secondary" onClick={() => navigator.clipboard.writeText(createdCode)}><Copy size={15} />复制</button>
                </div>
              )}
              <div className="admin-list-head"><h2>已生成的邀请码</h2><span>{invites.filter((item) => item.status === 'active').length} 个有效</span></div>
              <div className="admin-list">
                {loading ? <div className="admin-empty"><LoaderCircle className="spin" />正在读取</div> : invites.length === 0 ? <div className="admin-empty">还没有邀请码</div> : invites.map((invite) => (
                  <article className="invite-row" key={invite.id}>
                    <div className="record-mark"><Ticket size={17} /></div>
                    <div><strong>{invite.label || '未命名邀请'}</strong><small>{invite.code_prefix}••••••••</small></div>
                    <div className="usage"><strong>{invite.used_count} / {invite.max_uses}</strong><small>已使用</small></div>
                    <div className="expiry"><CalendarDays size={14} /><span>{invite.expires_at ? new Date(invite.expires_at).toLocaleDateString('zh-CN') : '长期有效'}</span></div>
                    <span className={`status-pill ${invite.status}`}>{invite.status === 'active' ? '有效' : '已撤销'}</span>
                    <button className="row-action" disabled={invite.status === 'revoked'} onClick={() => revokeInvite(invite.id)}>撤销</button>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="admin-list-head"><h2>用户账号</h2><span>{users.filter((item) => item.status === 'active').length} 个可用</span></div>
              <div className="admin-list">
                {loading ? <div className="admin-empty"><LoaderCircle className="spin" />正在读取</div> : users.map((account) => (
                  <article className="user-row" key={account.id}>
                    <div className="avatar">{account.email.slice(0, 2).toUpperCase()}</div>
                    <div><strong>{account.email}</strong><small>{new Date(account.created_at).toLocaleString('zh-CN')}</small></div>
                    <span className={`role-pill ${account.role}`}>{account.role === 'admin' ? '管理员' : '成员'}</span>
                    <span className={`status-pill ${account.status}`}>{account.status === 'active' ? '正常' : account.status === 'pending' ? '待邀请' : '已停用'}</span>
                    {account.role !== 'admin' && <button className="row-action" onClick={() => changeUserStatus(account.id, account.status === 'suspended' ? 'active' : 'suspended')}>{account.status === 'suspended' ? '启用' : '停用'}</button>}
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function ApiAccessPanel({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<'self' | 'managed'>('self');
  const [connections, setConnections] = useState<ApiConnection[]>([]);
  const [request, setRequest] = useState<ApiAccessRequest | null>(null);
  const [presetId, setPresetId] = useState<ApiPresetId>('openai');
  const [provider, setProvider] = useState<'openai-compatible' | 'custom'>('openai-compatible');
  const [label, setLabel] = useState('我的 AI API');
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1');
  const [model, setModel] = useState('gpt-4o-mini');
  const [apiKey, setApiKey] = useState('');
  const [purpose, setPurpose] = useState('');
  const [expectedUsage, setExpectedUsage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api<{ connections: ApiConnection[]; request: ApiAccessRequest | null }>('/api/api-access')
      .then((data) => {
        setConnections(data.connections); setRequest(data.request);
        const current = data.connections.find((item) => item.status === 'active');
        if (current) { setPresetId(current.preset_id || 'custom'); setProvider(current.provider); setLabel(current.label); setBaseUrl(current.base_url); setModel(current.model); }
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'API 状态加载失败'))
      .finally(() => setLoading(false));
  }, []);

  function choosePreset(id: ApiPresetId) {
    const preset = apiProviderPresets.find((item) => item.id === id) || apiProviderPresets[apiProviderPresets.length - 1];
    setPresetId(preset.id); setProvider(preset.protocol === 'anthropic' ? 'openai-compatible' : preset.id === 'custom' ? 'custom' : 'openai-compatible');
    if (preset.id !== 'custom') { setBaseUrl(preset.baseUrl); setModel(preset.model); setLabel(`${preset.name} API`); }
  }

  async function saveSelfApi(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const data = await api<{ connection: ApiConnection }>('/api/api-connections', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'self', provider, presetId, label, baseUrl, model, apiKey }),
      });
      setConnections((current) => [data.connection, ...current.filter((item) => item.id !== data.connection.id)]);
      setApiKey(''); setNotice('API 配置已安全保存，可以在节点对话中使用');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'API 配置保存失败'); }
    finally { setBusy(false); }
  }

  async function testSelfApi() {
    setTesting(true); setError(''); setNotice('');
    try {
      const result = await api<{ ok: boolean; message: string }>('/api/api-connections/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ presetId, baseUrl, model, apiKey }) });
      setNotice(result.message);
    } catch (reason) { setError(reason instanceof Error ? reason.message : '连接测试失败'); }
    finally { setTesting(false); }
  }

  async function applyManagedApi(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const data = await api<{ request: ApiAccessRequest }>('/api/api-access/requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose, expectedUsage }),
      });
      setRequest(data.request); setNotice('申请已提交，管理员审核后会在这里显示结果');
    } catch (reason) { setError(reason instanceof Error ? reason.message : '申请提交失败'); }
    finally { setBusy(false); }
  }

  async function revokeConnection(id: string) {
    setError('');
    try {
      await api(`/api/api-connections/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setConnections((current) => current.map((item) => item.id === id ? { ...item, status: 'revoked' as const } : item));
      setNotice('这条 API 配置已停用');
    } catch (reason) { setError(reason instanceof Error ? reason.message : '停用失败'); }
  }

  return (
    <div className="modal-backdrop api-backdrop" role="dialog" aria-modal="true">
      <section className="api-panel">
        <header className="api-panel-head"><div><p className="eyebrow">GOALDO / API ACCESS</p><h1>接入你的 API</h1><p>你可以连接自己的服务，也可以申请使用 GoalDo 提供的 API。</p></div><button className="icon-button" onClick={onClose}><X size={18} /></button></header>
        <div className="api-mode-tabs"><button className={mode === 'self' ? 'active' : ''} onClick={() => setMode('self')}><Settings2 size={16} /><span>自行接入</span><small>使用自己的密钥</small></button><button className={mode === 'managed' ? 'active' : ''} onClick={() => setMode('managed')}><ShieldCheck size={16} /><span>申请 GoalDo API</span><small>需要管理员审核</small></button></div>
        {error && <div className="api-message error"><AlertTriangle size={15} />{error}</div>}
        {notice && <div className="api-message success"><CheckCircle2 size={15} />{notice}</div>}
        {loading ? <div className="api-loading"><LoaderCircle className="spin" size={21} />正在读取 API 配置</div> : mode === 'self' ? (
          <div className="api-content">
            <form className="api-form" onSubmit={saveSelfApi}>
              <div className="api-form-intro"><span className="api-icon"><Link2 size={19} /></span><div><strong>连接兼容 OpenAI 格式的服务</strong><p>密钥会在服务器端加密保存，只显示尾号；不会写进项目内容或发送给其他用户。</p></div></div>
              <div className="provider-picker"><div className="provider-picker-head"><span>选择服务商</span><small>选好后自动填写接口和默认模型</small></div><div className="provider-grid">{apiProviderPresets.map((preset) => <button type="button" key={preset.id} className={presetId === preset.id ? 'active' : ''} onClick={() => choosePreset(preset.id)}><strong>{preset.shortName}</strong><small>{preset.description}</small></button>)}</div></div>
              <div className="api-form-grid"><label><span>配置名称</span><input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="例如：我的 OpenAI" /></label><label><span>模型名称</span><input value={model} onChange={(event) => setModel(event.target.value)} placeholder="例如：gpt-4o-mini" /></label><label className="full"><span>Base URL {presetId !== 'custom' && <small className="field-hint">已按服务商预填，可修改</small>}</span><input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://api.example.com/v1" /></label><label className="full"><span>API Key</span><input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={`${apiProviderPresets.find((item) => item.id === presetId)?.keyPlaceholder || '填写 API Key'}（只在保存时提交）`} autoComplete="new-password" /></label></div>
              <div className="api-security-note"><Lock size={15} /><span>安全提醒：不要把 API Key 写进节点、截图、上传文件或发给其他人。GoalDo 只会在服务端按需调用。</span></div>
              <div className="api-form-actions"><button type="button" className="secondary" disabled={testing || !baseUrl.trim() || !model.trim() || (!apiKey.trim() && !connections.some((item) => item.status === 'active'))} onClick={() => void testSelfApi()}>{testing ? <><LoaderCircle className="spin" size={15} />测试中</> : <><Activity size={15} />测试连接</>}</button><button className="primary" disabled={busy || !baseUrl.trim() || !model.trim() || (apiKey.trim().length < 8 && !connections.some((item) => item.status === 'active'))}>{busy ? <><LoaderCircle className="spin" size={16} />保存中</> : <>保存并启用 <ArrowRight size={16} /></>}</button></div>
            </form>
            <div className="api-existing"><div className="api-section-title"><h2>已有配置</h2><span>{connections.length} 条</span></div>{connections.length ? connections.map((item) => <article className="api-connection-row" key={item.id}><span className="api-connection-mark"><Zap size={16} /></span><div><strong>{item.label}</strong><small>{item.model} · {item.base_url}</small><small>{item.key_hint ? `密钥 ${item.key_hint}` : '托管权限'}</small></div><span className={`status-pill ${item.status}`}>{item.status === 'active' ? '已启用' : '已停用'}</span><button className="row-action" onClick={() => void revokeConnection(item.id)} disabled={item.status === 'revoked'}>{item.status === 'active' ? '停用' : '已停用'}</button></article>) : <div className="api-empty"><Link2 size={17} />还没有 API 配置</div>}</div>
          </div>
        ) : (
          <div className="api-content">
            <form className="api-form" onSubmit={applyManagedApi}><div className="api-form-intro"><span className="api-icon managed"><ShieldCheck size={19} /></span><div><strong>申请使用 GoalDo API</strong><p>适合暂时没有 API、想先体验项目推进能力的用户。审核通过后，系统会为你的账号开放托管额度。</p></div></div><div className="api-form-grid"><label className="full"><span>你准备如何使用？</span><textarea value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder="例如：用于农业物联网项目的节点拆解和复盘…" /></label><label className="full"><span>预计用量或周期</span><input value={expectedUsage} onChange={(event) => setExpectedUsage(event.target.value)} placeholder="例如：每天 20 次，先试用 14 天" /></label></div><button className="primary" disabled={busy || purpose.trim().length < 8}>{busy ? <><LoaderCircle className="spin" size={16} />提交中</> : <>提交申请 <ArrowRight size={16} /></>}</button></form><div className="managed-rules"><div><strong>审核规则</strong><span>1</span><p>仅用于 GoalDo 项目推进相关场景</p></div><div><strong>用量控制</strong><span>2</span><p>管理员会根据项目和用量分配额度</p></div><div><strong>隐私边界</strong><span>3</span><p>不要提交密码、证件或其他敏感信息</p></div></div>{request && <div className="request-status"><div><small>最近一次申请</small><strong>{request.status === 'pending' ? '等待管理员审核' : request.status === 'approved' ? '申请已通过' : '申请未通过'}</strong></div><span className={`status-pill ${request.status === 'approved' ? 'active' : request.status === 'pending' ? 'pending' : 'revoked'}`}>{request.status === 'pending' ? '审核中' : request.status === 'approved' ? '已通过' : '已拒绝'}</span>{request.admin_note && <p>管理员备注：{request.admin_note}</p>}</div>}
          </div>
        )}
        <footer className="api-panel-foot"><Lock size={13} />API 配置仅与你的账号绑定，管理员可看到申请状态，但不会看到你的自定义 API Key。</footer>
      </section>
    </div>
  );
}

function AdminDashboard({ user }: { user: AccountUser }) {
  const [tab, setTab] = useState<'overview' | 'users' | 'projects' | 'invites' | 'api'>('overview');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AccountUser[]>([]);
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [apiRequests, setApiRequests] = useState<ApiAccessRequest[]>([]);
  const [managedApi, setManagedApi] = useState<ApiConnection | null>(null);
  const [managedEncryption, setManagedEncryption] = useState<{ algorithm: string; keyConfigured: boolean }>({ algorithm: 'AES-256-GCM', keyConfigured: false });
  const [managedPresetId, setManagedPresetId] = useState<ApiPresetId>('openai');
  const [managedLabel, setManagedLabel] = useState('GoalDo 托管 API');
  const [managedBaseUrl, setManagedBaseUrl] = useState('');
  const [managedModel, setManagedModel] = useState('');
  const [managedKey, setManagedKey] = useState('');
  const [managedSaving, setManagedSaving] = useState(false);
  const [managedTesting, setManagedTesting] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<AccountUser | null>(null);
  const [selectedProject, setSelectedProject] = useState<AdminProject | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [label, setLabel] = useState('朋友体验');
  const [maxUses, setMaxUses] = useState(1);
  const [days, setDays] = useState(7);
  const [createdCode, setCreatedCode] = useState('');
  const [toast, setToast] = useState('');

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const [overviewData, userData, projectData, inviteData, apiRequestData, managedApiData] = await Promise.all([
        api<AdminOverview>('/api/admin/overview'),
        api<{ users: AccountUser[] }>('/api/admin/users'),
        api<{ projects: AdminProject[] }>('/api/admin/projects'),
        api<{ invites: InviteRecord[] }>('/api/admin/invites'),
        api<{ requests: ApiAccessRequest[] }>('/api/admin/api-requests'),
        api<{ connection: ApiConnection | null; encryption: { algorithm: string; keyConfigured: boolean } }>('/api/admin/managed-api'),
      ]);
      setOverview(overviewData);
      setUsers(userData.users);
      setProjects(projectData.projects);
      setInvites(inviteData.invites);
      setApiRequests(apiRequestData.requests);
      setManagedApi(managedApiData.connection);
      setManagedEncryption(managedApiData.encryption);
      if (managedApiData.connection) {
        setManagedPresetId(managedApiData.connection.preset_id || 'custom');
        setManagedLabel(managedApiData.connection.label);
        setManagedBaseUrl(managedApiData.connection.base_url);
        setManagedModel(managedApiData.connection.model);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '管理数据加载失败');
    } finally { setLoading(false); }
  }

  useEffect(() => { void refresh(); }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filteredUsers = useMemo(() => users.filter((item) => item.email.toLowerCase().includes(query.toLowerCase())), [users, query]);
  const filteredProjects = useMemo(() => projects.filter((item) => `${item.name} ${item.owner_email}`.toLowerCase().includes(query.toLowerCase())), [projects, query]);

  function openUser(account: AccountUser) {
    setSelectedUser(account);
    setSelectedProject(null);
    setNote(account.admin_note || '');
  }

  function openProject(project: AdminProject) {
    setSelectedProject(project);
    setSelectedUser(null);
    setNote(project.admin_note || '');
  }

  async function saveUserNote() {
    if (!selectedUser) return;
    await api(`/api/admin/users/${selectedUser.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminNote: note }) });
    setUsers((current) => current.map((item) => item.id === selectedUser.id ? { ...item, admin_note: note } : item));
    setSelectedUser({ ...selectedUser, admin_note: note });
    setToast('用户备注已保存，仅管理员可见');
  }

  async function changeUserStatus(account: AccountUser) {
    const status = account.status === 'suspended' ? 'active' : 'suspended';
    await api(`/api/admin/users/${account.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    setUsers((current) => current.map((item) => item.id === account.id ? { ...item, status } : item));
    if (selectedUser?.id === account.id) setSelectedUser({ ...selectedUser, status });
    setToast(status === 'active' ? '账号已启用' : '账号已停用');
  }

  async function saveProjectNote() {
    if (!selectedProject) return;
    await api(`/api/admin/projects/${encodeURIComponent(selectedProject.storage_id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminNote: note }) });
    setProjects((current) => current.map((item) => item.storage_id === selectedProject.storage_id ? { ...item, admin_note: note } : item));
    setSelectedProject({ ...selectedProject, admin_note: note });
    setToast('项目备注已保存，仅管理员可见');
  }

  async function changeProjectStatus(status: AdminProject['admin_status']) {
    if (!selectedProject) return;
    await api(`/api/admin/projects/${encodeURIComponent(selectedProject.storage_id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    setProjects((current) => current.map((item) => item.storage_id === selectedProject.storage_id ? { ...item, admin_status: status } : item));
    setSelectedProject({ ...selectedProject, admin_status: status });
    setToast('项目管理状态已更新');
  }

  async function createInvite(event: React.FormEvent) {
    event.preventDefault();
    const expiresAt = days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null;
    try {
      const result = await api<{ invite: InviteRecord; code: string }>('/api/admin/invites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label, maxUses, expiresAt }) });
      setInvites((current) => [result.invite, ...current]);
      setCreatedCode(result.code);
      setToast('邀请码已生成');
    } catch (reason) { setError(reason instanceof Error ? reason.message : '邀请码生成失败'); }
  }

  async function revokeInvite(id: string) {
    await api(`/api/admin/invites/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'revoked' }) });
    setInvites((current) => current.map((item) => item.id === id ? { ...item, status: 'revoked' } : item));
    setToast('邀请码已撤销');
  }

  async function updateApiRequest(item: ApiAccessRequest, status: 'approved' | 'rejected') {
    try {
      await api(`/api/admin/api-requests/${encodeURIComponent(item.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      setApiRequests((current) => current.map((request) => request.id === item.id ? { ...request, status, updated_at: new Date().toISOString() } : request));
      setToast(status === 'approved' ? 'API 申请已通过' : 'API 申请已拒绝');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'API 申请处理失败'); }
  }

  async function saveManagedApi(event: React.FormEvent) {
    event.preventDefault();
    setManagedSaving(true); setError('');
    try {
      const data = await api<{ connection: ApiConnection; encryption: { algorithm: string; keyConfigured: boolean } }>('/api/admin/managed-api', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: managedPresetId === 'custom' ? 'custom' : 'openai-compatible', presetId: managedPresetId, label: managedLabel, baseUrl: managedBaseUrl, model: managedModel, apiKey: managedKey }),
      });
      setManagedApi(data.connection); setManagedEncryption(data.encryption); setManagedKey(''); setToast('托管 API 已保存并启用');
    } catch (reason) { setError(reason instanceof Error ? reason.message : '托管 API 保存失败'); }
    finally { setManagedSaving(false); }
  }

  function chooseManagedPreset(id: ApiPresetId) {
    const preset = apiProviderPresets.find((item) => item.id === id) || apiProviderPresets[0];
    setManagedPresetId(preset.id);
    if (preset.id !== 'custom') { setManagedBaseUrl(preset.baseUrl); setManagedModel(preset.model); setManagedLabel(`GoalDo · ${preset.name}`); }
  }

  async function disableManagedApi() {
    try { await api('/api/admin/managed-api', { method: 'DELETE' }); setManagedApi((current) => current ? { ...current, status: 'revoked' } : null); setToast('托管 API 已停用'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '托管 API 停用失败'); }
  }

  async function testManagedApi() {
    setManagedTesting(true); setError('');
    try {
      const result = await api<{ ok: boolean; message: string }>('/api/admin/managed-api/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ presetId: managedPresetId, baseUrl: managedBaseUrl, model: managedModel, apiKey: managedKey }) });
      setToast(result.message);
    } catch (reason) { setError(reason instanceof Error ? reason.message : '托管 API 测试失败'); }
    finally { setManagedTesting(false); }
  }

  const activeUsers = Number(overview?.users.active || 0);
  const totalUsers = Number(overview?.users.total || 0);
  const totalProjects = Number(overview?.projects.total || 0);
  const activeInvites = Number(overview?.invites.active || 0);

  return (
    <div className="admin-console">
      <aside className="admin-rail">
        <div className="admin-rail-brand"><Brand /><span>CONTROL ROOM</span></div>
        <nav>
          <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}><BarChart3 size={18} /><span>总览</span></button>
          <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}><Users size={18} /><span>注册用户</span><b>{users.length}</b></button>
          <button className={tab === 'projects' ? 'active' : ''} onClick={() => setTab('projects')}><FolderKanban size={18} /><span>全部项目</span><b>{projects.length}</b></button>
          <button className={tab === 'invites' ? 'active' : ''} onClick={() => setTab('invites')}><Ticket size={18} /><span>邀请码</span><b>{invites.filter((item) => item.status === 'active').length}</b></button>
          <button className={tab === 'api' ? 'active' : ''} onClick={() => setTab('api')}><Link2 size={18} /><span>API 申请</span><b>{apiRequests.filter((item) => item.status === 'pending').length}</b></button>
        </nav>
        <div className="admin-rail-foot">
          <a href="/"><ArrowLeft size={15} />返回 GoalDo</a>
          <a href="/cdn-cgi/access/logout"><LogOut size={15} />退出管理员</a>
          <small>{user.email}</small>
        </div>
      </aside>
      <main className="admin-console-main">
        <header className="admin-console-head">
          <div><p className="eyebrow">GOALDO / ADMIN</p><h1>{tab === 'overview' ? '数据总览' : tab === 'users' ? '注册用户' : tab === 'projects' ? '项目数据库' : tab === 'api' ? 'API 申请' : '邀请码管理'}</h1></div>
          <div className="admin-head-actions">
            {(tab === 'users' || tab === 'projects') && <label className="admin-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索邮箱或项目" /></label>}
            <button className="icon-button" onClick={() => void refresh()} title="刷新"><Activity size={17} /></button>
            <div className="avatar">{user.email.slice(0, 2)}</div>
          </div>
        </header>
        {error && <div className="admin-error">{error}</div>}
        <div className="admin-console-body">
          {loading ? <div className="admin-loading"><LoaderCircle className="spin" size={25} />正在读取数据库</div> : tab === 'overview' ? (
            <>
              <section className="metric-grid">
                <article><span><Users size={19} /></span><small>注册用户</small><strong>{totalUsers}</strong><p>{activeUsers} 个正常账号</p></article>
                <article><span><FolderKanban size={19} /></span><small>用户项目</small><strong>{totalProjects}</strong><p>{Number(overview?.projects.flagged || 0)} 个需关注</p></article>
                <article><span><Ticket size={19} /></span><small>有效邀请码</small><strong>{activeInvites}</strong><p>累计 {Number(overview?.invites.total || 0)} 个</p></article>
                <article><span><Database size={19} /></span><small>数据隔离</small><strong>按账号</strong><p>管理员跨账号可见</p></article>
              </section>
              <section className="admin-overview-grid">
                <div className="console-card"><div className="console-card-head"><div><small>RECENT USERS</small><h2>最近注册</h2></div><button onClick={() => setTab('users')}>查看全部</button></div>{users.slice(0, 6).map((account) => <button className="overview-row" key={account.id} onClick={() => { setTab('users'); openUser(account); }}><div className="avatar">{account.email.slice(0, 2)}</div><div><strong>{account.email}</strong><small>{new Date(account.created_at).toLocaleString('zh-CN')}</small></div><span className={`status-pill ${account.status}`}>{account.status === 'active' ? '正常' : account.status === 'pending' ? '待邀请' : '已停用'}</span></button>)}</div>
                <div className="console-card"><div className="console-card-head"><div><small>RECENT PROJECTS</small><h2>最近项目</h2></div><button onClick={() => setTab('projects')}>查看全部</button></div>{projects.slice(0, 6).map((project) => <button className="overview-row" key={project.storage_id} onClick={() => { setTab('projects'); openProject(project); }}><span className="project-list-emoji">{project.emoji}</span><div><strong>{project.name}</strong><small>{project.owner_email}</small></div><b>{project.progress}%</b></button>)}</div>
              </section>
            </>
          ) : tab === 'users' ? (
            <section className={`admin-data-layout ${selectedUser ? 'has-detail' : ''}`}>
              <div className="data-table-card"><div className="data-table-head"><span>邮箱</span><span>项目</span><span>注册时间</span><span>最近活动</span><span>状态</span></div>{filteredUsers.map((account) => <button className={`data-table-row user-data-row ${selectedUser?.id === account.id ? 'selected' : ''}`} key={account.id} onClick={() => openUser(account)}><div><div className="avatar">{account.email.slice(0, 2)}</div><span><strong>{account.email}</strong><small>{account.role === 'admin' ? '管理员' : '普通成员'}</small></span></div><b>{account.project_count || 0}</b><span>{new Date(account.created_at).toLocaleDateString('zh-CN')}</span><span>{account.last_seen_at ? new Date(account.last_seen_at).toLocaleString('zh-CN') : '—'}</span><i className={`status-pill ${account.status}`}>{account.status === 'active' ? '正常' : account.status === 'pending' ? '待邀请' : '已停用'}</i></button>)}</div>
              {selectedUser && <aside className="admin-detail-card"><div className="detail-card-head"><div className="avatar large">{selectedUser.email.slice(0, 2)}</div><div><small>USER PROFILE</small><h2>{selectedUser.email}</h2></div><button className="icon-button small" onClick={() => setSelectedUser(null)}><X size={16} /></button></div><dl><div><dt>账号角色</dt><dd>{selectedUser.role === 'admin' ? '管理员' : '普通成员'}</dd></div><div><dt>项目数量</dt><dd>{selectedUser.project_count || 0}</dd></div><div><dt>注册时间</dt><dd>{new Date(selectedUser.created_at).toLocaleString('zh-CN')}</dd></div><div><dt>最近活动</dt><dd>{selectedUser.last_seen_at ? new Date(selectedUser.last_seen_at).toLocaleString('zh-CN') : '暂无'}</dd></div></dl><label className="admin-note-field"><span><StickyNote size={15} />管理员备注</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="记录来源、沟通情况或需要跟进的问题…" /><small>仅管理员可见，普通用户看不到这段备注。</small></label><button className="primary" onClick={() => void saveUserNote()}>保存备注</button>{selectedUser.role !== 'admin' && <button className="secondary danger-soft" onClick={() => void changeUserStatus(selectedUser)}>{selectedUser.status === 'suspended' ? '重新启用账号' : '停用这个账号'}</button>}</aside>}
            </section>
          ) : tab === 'projects' ? (
            <section className={`admin-data-layout ${selectedProject ? 'has-detail' : ''}`}>
              <div className="project-admin-grid">{filteredProjects.map((project) => <button className={`admin-project-card ${selectedProject?.storage_id === project.storage_id ? 'selected' : ''}`} key={project.storage_id} onClick={() => openProject(project)}><div className="admin-project-top"><span>{project.emoji}</span><i className={`project-admin-status ${project.admin_status}`}>{project.admin_status === 'active' ? '正常' : project.admin_status === 'flagged' ? '需关注' : '已归档'}</i></div><h3>{project.name}</h3><p>{project.description}</p><small>{project.owner_email}</small><div className="progress-row"><div className="progress"><i style={{ width: `${project.progress}%` }} /></div><b>{project.progress}%</b></div><footer><span>{project.stage_count} 阶段 · {project.task_count} 节点</span><span>{new Date(project.updated_at).toLocaleDateString('zh-CN')}</span></footer></button>)}</div>
              {selectedProject && <aside className="admin-detail-card project-detail"><div className="detail-card-head"><span className="project-list-emoji large">{selectedProject.emoji}</span><div><small>PROJECT RECORD</small><h2>{selectedProject.name}</h2></div><button className="icon-button small" onClick={() => setSelectedProject(null)}><X size={16} /></button></div><p className="project-owner"><Users size={14} />{selectedProject.owner_email}</p><dl><div><dt>项目类型</dt><dd>{selectedProject.type}</dd></div><div><dt>总体进度</dt><dd>{selectedProject.progress}%</dd></div><div><dt>结构</dt><dd>{selectedProject.stage_count} 阶段 / {selectedProject.task_count} 节点</dd></div><div><dt>更新时间</dt><dd>{new Date(selectedProject.updated_at).toLocaleString('zh-CN')}</dd></div></dl><label className="admin-note-field"><span><StickyNote size={15} />项目备注</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="记录项目风险、支持进度或审核结论…" /><small>这段管理备注不会显示给项目所有者。</small></label><button className="primary" onClick={() => void saveProjectNote()}>保存项目备注</button><div className="project-status-actions"><button className={selectedProject.admin_status === 'active' ? 'active' : ''} onClick={() => void changeProjectStatus('active')}>正常</button><button className={selectedProject.admin_status === 'flagged' ? 'active flagged' : ''} onClick={() => void changeProjectStatus('flagged')}>需关注</button><button className={selectedProject.admin_status === 'archived' ? 'active' : ''} onClick={() => void changeProjectStatus('archived')}>归档</button></div></aside>}
            </section>
          ) : tab === 'api' ? (
            <section className="api-admin-list"><div className="api-managed-config"><div className="api-admin-intro"><div><p className="eyebrow">MANAGED API CONFIG</p><h2>先配置你的托管 API</h2><p>选择服务商后，Base URL 和默认模型会自动填写。通常只需要再填 API Key。</p></div><span className={`api-config-state ${managedApi?.status === 'active' ? 'ready' : 'empty'}`}>{managedApi?.status === 'active' ? '已启用' : '尚未配置'}</span></div><form className="api-managed-form" onSubmit={saveManagedApi}><div className="provider-picker admin-provider-picker"><div className="provider-picker-head"><span>选择托管服务商</span><small>支持常用模型服务，也可切换到自定义接口</small></div><div className="provider-grid">{apiProviderPresets.map((preset) => <button type="button" key={preset.id} className={managedPresetId === preset.id ? 'active' : ''} onClick={() => chooseManagedPreset(preset.id)}><strong>{preset.shortName}</strong><small>{preset.description}</small></button>)}</div></div><label><span>配置名称</span><input value={managedLabel} onChange={(event) => setManagedLabel(event.target.value)} /></label><label><span>模型名称</span><input value={managedModel} onChange={(event) => setManagedModel(event.target.value)} placeholder="例如：gpt-4o-mini" /></label><label className="full"><span>Base URL {managedPresetId !== 'custom' && <small>已按服务商预填，可修改</small>}</span><input value={managedBaseUrl} onChange={(event) => setManagedBaseUrl(event.target.value)} placeholder="https://api.example.com/v1" /></label><label className="full"><span>API Key {managedApi?.key_hint && <small>当前 {managedApi.key_hint}</small>}</span><input type="password" value={managedKey} onChange={(event) => setManagedKey(event.target.value)} placeholder={managedApi ? '留空则保留现有 Key' : '填写你的 API Key'} autoComplete="new-password" /></label><div className="api-encryption-badge"><Lock size={15} /><div><strong>{managedEncryption.algorithm}</strong><small>{managedEncryption.keyConfigured ? '服务器加密密钥已配置' : '请配置服务器加密密钥'}</small></div></div><div className="api-managed-actions"><button type="button" className="secondary" disabled={managedTesting || !managedBaseUrl.trim() || !managedModel.trim() || (!managedKey.trim() && !managedApi)} onClick={() => void testManagedApi()}>{managedTesting ? <><LoaderCircle className="spin" size={15} />测试中</> : <><Activity size={15} />测试连接</>}</button><button className="primary" disabled={managedSaving || !managedBaseUrl.trim() || !managedModel.trim() || (!managedKey.trim() && !managedApi)}>{managedSaving ? <><LoaderCircle className="spin" size={15} />保存中</> : <><ShieldCheck size={15} />保存托管 API</>}</button>{managedApi?.status === 'active' && <button type="button" className="secondary danger-soft" onClick={() => void disableManagedApi()}>停用托管 API</button>}</div></form></div><div className="api-admin-intro api-review-head"><div><p className="eyebrow">ACCESS REQUESTS</p><h2>审核用户的 API 使用申请</h2><p>通过后，用户账号会获得托管 API 的访问资格；每日申请次数由系统限制为 3 次。</p></div><span className="api-admin-count">{apiRequests.filter((item) => item.status === 'pending').length} 待审核</span></div>{apiRequests.length ? <div className="api-request-list">{apiRequests.map((item) => <article className={`api-request-card ${item.status}`} key={item.id}><div className="api-request-top"><div className="avatar">{(item.email || '用户').slice(0, 2)}</div><div><strong>{item.email || item.user_id}</strong><small>{new Date(item.created_at).toLocaleString('zh-CN')}</small></div><span className={`status-pill ${item.status === 'approved' ? 'active' : item.status === 'pending' ? 'pending' : 'revoked'}`}>{item.status === 'pending' ? '待审核' : item.status === 'approved' ? '已通过' : '已拒绝'}</span></div><div className="api-request-body"><div><small>使用目的</small><p>{item.purpose}</p></div><div><small>预计用量</small><p>{item.expected_usage || '未填写'}</p></div></div>{item.status === 'pending' && <div className="api-request-actions"><button className="secondary danger-soft" onClick={() => void updateApiRequest(item, 'rejected')}>拒绝申请</button><button className="primary" onClick={() => void updateApiRequest(item, 'approved')}><Check size={15} />通过申请</button></div>}</article>)}</div> : <div className="api-empty admin-api-empty"><ShieldCheck size={18} />暂时没有 API 使用申请</div>}</section>
          ) : (
            <>
              <form className="invite-builder console-invite-builder" onSubmit={createInvite}><div><p className="eyebrow">NEW INVITATION</p><h2>生成邀请码</h2><p>设置使用次数和有效期，然后发给朋友。</p></div><label><span>备注</span><input value={label} onChange={(event) => setLabel(event.target.value)} /></label><label><span>使用次数</span><input type="number" min="1" max="1000" value={maxUses} onChange={(event) => setMaxUses(Number(event.target.value))} /></label><label><span>有效天数</span><input type="number" min="0" max="365" value={days} onChange={(event) => setDays(Number(event.target.value))} /></label><button className="primary"><Sparkles size={16} />生成邀请码</button></form>
              {createdCode && <div className="created-invite"><div><small>完整邀请码只显示这一次，请立即复制</small><strong>{createdCode}</strong></div><button className="secondary" onClick={() => navigator.clipboard.writeText(createdCode)}><Copy size={15} />复制</button></div>}
              <div className="admin-list-head"><h2>全部邀请码</h2><span>{invites.filter((item) => item.status === 'active').length} 个有效</span></div><div className="admin-list">{invites.map((invite) => <article className="invite-row" key={invite.id}><div className="record-mark"><Ticket size={17} /></div><div><strong>{invite.label || '未命名邀请'}</strong><small>{invite.code_prefix}••••••••</small></div><div className="usage"><strong>{invite.used_count} / {invite.max_uses}</strong><small>已使用</small></div><div className="expiry"><CalendarDays size={14} /><span>{invite.expires_at ? new Date(invite.expires_at).toLocaleDateString('zh-CN') : '长期有效'}</span></div><span className={`status-pill ${invite.status}`}>{invite.status === 'active' ? '有效' : '已撤销'}</span><button className="row-action" disabled={invite.status === 'revoked'} onClick={() => void revokeInvite(invite.id)}>撤销</button></article>)}</div>
            </>
          )}
        </div>
      </main>
      {toast && <div className="toast"><CheckCircle2 size={17} />{toast}</div>}
    </div>
  );
}

function App() {
  const [auth, setAuth] = useState<AuthState | UnauthenticatedState | null>(null);
  const [authError, setAuthError] = useState('');
  const configuredAdminHost = import.meta.env.VITE_ADMIN_HOSTNAME?.trim().toLowerCase();
  const adminHost = configuredAdminHost
    ? window.location.hostname.toLowerCase() === configuredAdminHost
    : window.location.pathname.startsWith('/admin');

  useEffect(() => {
    api<AuthState | UnauthenticatedState>('/api/auth/me')
      .then(setAuth)
      .catch((error: Error) => setAuthError(error.message));
  }, []);

  if (authError) return <AuthProblem message={authError} />;
  if (!auth) return <AuthLoading />;
  if (!auth.authenticated) return <PasswordAuthScreen onAuthenticated={setAuth} />;
  if (auth.user.status === 'suspended') return <AuthProblem message="这个账号已被管理员停用，请联系 GoalDo 管理员。" />;
  if (adminHost) {
    if (!auth.isAdmin || auth.user.role !== 'admin') return <AuthProblem message="这个地址仅限 GoalDo 管理员访问。" />;
    return <AdminDashboard user={auth.user} />;
  }
  if (auth.needsInvite || auth.user.status === 'pending') {
    return <InviteGate user={auth.user} onActivated={(user) => setAuth({ ...auth, user, needsInvite: false })} />;
  }

  return <ProductApp user={auth.user} onAdmin={() => window.location.assign(import.meta.env.VITE_ADMIN_URL || '/admin')} />;
}

function ProductApp({ user, onAdmin }: { user: AccountUser; onAdmin: () => void }) {
  const [screen, setScreen] = useState<'projects' | 'workspace'>('projects');
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [view, setView] = useState<ViewMode>('project');
  const [createOpen, setCreateOpen] = useState(false);
  const [apiOpen, setApiOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [cloudReady, setCloudReady] = useState(false);
  const project = projects.find((item) => item.id === activeProjectId) ?? projects[0] ?? null;

  useEffect(() => {
    let active = true;
    api<{ projects: Project[] }>('/api/projects')
      .then(({ projects: cloudProjects }) => {
        if (!active) return;
        setProjects(cloudProjects);
        setActiveProjectId(cloudProjects[0]?.id ?? '');
        setSelectedId(cloudProjects[0]?.tasks[0]?.id ?? '');
        if (active) setCloudReady(true);
      })
      .catch((error: Error) => { setToast(`云端同步失败：${error.message}`); setCloudReady(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!cloudReady || !project) return;
    const timer = window.setTimeout(() => {
      api(`/api/projects/${encodeURIComponent(project.id)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(project),
      }).catch((error: Error) => setToast(`保存失败：${error.message}`));
    }, 650);
    return () => window.clearTimeout(timer);
  }, [cloudReady, project]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const selected = project?.tasks.find((item) => item.id === selectedId) ?? project?.tasks[0];

  function updateProject(next: Project) {
    setProjects((current) => current.map((item) => item.id === next.id ? next : item));
  }

  function completeTask(id: string) {
    if (!project) return;
    setProjects((currentProjects) => currentProjects.map((current) => {
      if (current.id !== project.id) return current;
      const nextTasks = current.tasks.map((item) => {
        if (item.id === id) return { ...item, status: 'done' as const };
        if (item.dependencies.includes(id) && item.dependencies.every((dep) => dep === id || current.tasks.find((t) => t.id === dep)?.status === 'done')) {
          return { ...item, status: 'in-progress' as const };
        }
        return item;
      });
      return { ...current, tasks: nextTasks, updatedAt: '刚刚更新' };
    }));
    setToast('节点已完成，AI 已解锁并更新下一步');
  }

  function createProject(next: Project) {
    setProjects((current) => [next, ...current.filter((item) => item.id !== next.id)]);
    setActiveProjectId(next.id);
    setSelectedId(next.tasks[0]?.id ?? '');
    setScreen('workspace');
    setCreateOpen(false);
    setToast('项目地图已生成，可以从第一个节点开始');
  }

  function openProject(id: string) {
    const next = projects.find((item) => item.id === id);
    if (!next) return;
    setActiveProjectId(id);
    setSelectedId(next.tasks.find((task) => task.status === 'in-progress')?.id ?? next.tasks[0]?.id ?? '');
    setScreen('workspace');
  }

  if (!cloudReady) return <AuthLoading />;

  return (
    <div className="app-shell">
      {screen === 'projects' ? (
        <ProjectSpace
          projects={projects}
          user={user}
          onAdmin={onAdmin}
          onOpen={openProject}
          onCreate={() => setCreateOpen(true)}
          onApi={() => setApiOpen(true)}
        />
      ) : project && selected ? (
        <Workspace
          project={project}
          selected={selected}
          selectedId={selectedId}
          view={view}
          onSelect={setSelectedId}
          onView={setView}
          onProjects={() => setScreen('projects')}
          onCreate={() => setCreateOpen(true)}
          onComplete={completeTask}
          onProjectChange={updateProject}
          user={user}
          onAdmin={onAdmin}
        />
      ) : <ProjectSpace projects={projects} user={user} onAdmin={onAdmin} onOpen={openProject} onCreate={() => setCreateOpen(true)} onApi={() => setApiOpen(true)} />}
      {createOpen && <CreateProjectModal onClose={() => setCreateOpen(false)} onCreate={createProject} />}
      {apiOpen && <ApiAccessPanel onClose={() => setApiOpen(false)} />}
      {toast && <div className="toast"><CheckCircle2 size={17} />{toast}</div>}
    </div>
  );
}

function ProjectSpace({ projects, user, onAdmin, onOpen, onCreate, onApi }: { projects: Project[]; user: AccountUser; onAdmin: () => void; onOpen: (id: string) => void; onCreate: () => void; onApi: () => void }) {
  const primaryProject = projects[0];
  const todayTask = primaryProject?.tasks.find((task) => task.status === 'in-progress') ?? primaryProject?.tasks.find((task) => task.status === 'todo') ?? primaryProject?.tasks[0];
  const today = new Date();
  return (
    <div className="project-space">
      <header className="space-header">
        <Brand />
        <div className="space-header-actions"><button className="ghost api-entry" onClick={onApi}><Link2 size={15} />API 接入</button><AccountActions user={user} onAdmin={onAdmin} /></div>
      </header>
      <main className="space-main">
        <div className="space-intro">
          <div>
            <p className="eyebrow">PROJECT SPACE</p>
            <h1>把目标变成<br /><em>正在发生的进展。</em></h1>
            <p>不止告诉你怎么做，而是陪你把每一个关键节点真正做完。</p>
          </div>
          <button className="primary large" onClick={onCreate}><Sparkles size={17} />创建新项目</button>
        </div>
        {primaryProject && todayTask && <div className="today-strip">
          <div className="today-date"><span>{String(today.getDate()).padStart(2, '0')}</span><small>{today.toLocaleDateString('zh-CN', { month: 'long', weekday: 'short' })}</small></div>
          <div><p>今天最重要的一步</p><strong>{todayTask.title}</strong></div>
          <button onClick={() => onOpen(primaryProject.id)}>进入任务 <ArrowRight size={16} /></button>
        </div>}
        <section className={`projects-section ${projects.length ? '' : 'empty-projects'}`}>
          <div className="section-title"><h2>我的项目</h2><span>{projects.length ? `${projects.length} 个项目` : '还没有项目'}</span></div>
          <div className="project-grid">
            {projects.map((item, index) => {
              const cardProgress = getProgress(item);
              const currentTask = item.tasks.find((task) => task.status === 'in-progress') ?? item.tasks.find((task) => task.status === 'todo') ?? item.tasks[0];
              const accent = ['#f5c7b2', '#cbe9c5', '#d8d1f4', '#c9def5', '#ead8b8'][index % 5];
              return (
                <button className="project-card" key={item.id} onClick={() => onOpen(item.id)}>
                  <div className="card-art" style={{ background: accent }}>
                    <span>{item.emoji}</span><MoreHorizontal size={18} />
                    <div className="art-grid" />
                  </div>
                  <div className="card-body">
                    <div className="card-meta"><span>{item.id === 'goaldo-guide' ? '新手说明' : projectTypeLabels[item.type] || '项目'}</span><small>{item.updatedAt}</small></div>
                    <h3>{item.name}</h3>
                    <p>{currentTask ? `${currentTask.module} · ${currentTask.title}` : item.description}</p>
                    <div className="progress-row"><div className="progress"><i style={{ width: `${cardProgress}%` }} /></div><b>{cardProgress}%</b></div>
                    <div className="card-today"><Zap size={14} fill="currentColor" /><span>{currentTask?.title || '打开项目查看路线'}</span><ChevronRight size={15} /></div>
                  </div>
                </button>
              );
            })}
            <button className="new-project-card" onClick={onCreate}>
              <span><Plus size={22} /></span><strong>开始一个新目标</strong><small>AI 会先与你聊一聊，再生成路线</small>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

function Workspace({ project, selected, selectedId, view, onSelect, onView, onProjects, onCreate, onComplete, onProjectChange, user, onAdmin }: {
  project: Project;
  selected: TaskNode;
  selectedId: string;
  view: ViewMode;
  onSelect: (id: string) => void;
  onView: (view: ViewMode) => void;
  onProjects: () => void;
  onCreate: () => void;
  onComplete: (id: string) => void;
  onProjectChange: (project: Project) => void;
  user: AccountUser;
  onAdmin: () => void;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 640);
  const [detailOpen, setDetailOpen] = useState(true);
  const progress = getProgress(project);
  const activeStageId = selected.stageId;

  return (
    <div className="workspace-shell">
      <header className="workspace-header">
        <div className="header-left"><Brand /><span className="header-divider" /><button className="project-switch" onClick={onProjects}><span>{project.emoji}</span>{project.name}<ChevronDown size={14} /></button></div>
        <div className="workspace-progress"><span>总体进度</span><div className="progress"><i style={{ width: `${progress}%` }} /></div><b>{progress}%</b></div>
        <div className="top-actions"><button className="ghost compact" onClick={onCreate}><Plus size={15} />新项目</button><AccountActions user={user} onAdmin={onAdmin} compact /></div>
      </header>
      <div className={`workspace-body ${sidebarOpen ? '' : 'sidebar-closed'} ${detailOpen ? '' : 'detail-closed'}`}>
        <aside className="project-sidebar">
          <div className="sidebar-top">
            <button className="back-link" onClick={onProjects}><ArrowLeft size={15} />项目空间</button>
            <button className="icon-button small" onClick={() => setSidebarOpen(false)}><ArrowLeft size={15} /></button>
          </div>
          <div className="project-summary">
            <span className="project-emoji">{project.emoji}</span>
            <div><small>当前项目</small><h2>{project.name}</h2></div>
          </div>
          <div className="sidebar-label"><span>项目路线</span><button><MoreHorizontal size={16} /></button></div>
          <nav className="stage-nav">
            {project.stages.map((stage) => {
              const stageTasks = project.tasks.filter((item) => item.stageId === stage.id);
              const done = stageTasks.filter((item) => item.status === 'done').length;
              const isActive = stage.id === activeStageId;
              return (
                <button key={stage.id} className={isActive ? 'active' : ''} onClick={() => onSelect(stageTasks[0]?.id ?? selectedId)}>
                  <span className="stage-number">{stage.number}</span>
                  <span className="stage-copy"><strong>{stage.title}</strong><small>{done}/{stageTasks.length} 个节点</small></span>
                  {done === stageTasks.length && done > 0 ? <CheckCircle2 size={16} /> : isActive ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              );
            })}
          </nav>
          <div className="sidebar-spacer" />
          <div className="ai-status-card"><span><Sparkles size={17} /></span><div><strong>路线持续优化中</strong><p>AI 会根据你的结果调整后续节点</p></div></div>
        </aside>
        {!sidebarOpen && <button className="panel-reopen left" onClick={() => setSidebarOpen(true)}><ChevronRight size={17} /></button>}
        <main className="canvas-area">
          <div className="canvas-header">
            <div>
              <p className="eyebrow">LIVE PROJECT MAP</p>
              <h1>{project.name}</h1>
            </div>
            <div className="view-switcher">
              <button className={view === 'project' ? 'active' : ''} onClick={() => onView('project')}><Network size={15} />项目</button>
              <button className={view === 'knowledge' ? 'active' : ''} onClick={() => onView('knowledge')}><BookOpen size={15} />知识</button>
              <button className={view === 'execution' ? 'active' : ''} onClick={() => onView('execution')}><ListChecks size={15} />执行</button>
            </div>
          </div>
          <div className="risk-banner"><AlertTriangle size={16} /><span><strong>当前风险：</strong>{project.risk}</span><button onClick={() => onSelect('t4')}>查看节点</button></div>
          <ProjectCanvas project={project} selected={selected} selectedId={selectedId} view={view} onSelect={onSelect} />
        </main>
        {!detailOpen && <button className="panel-reopen right" onClick={() => setDetailOpen(true)}><ChevronLeftIcon /></button>}
        <DetailPanel
          project={project}
          node={selected}
          onClose={() => setDetailOpen(false)}
          onComplete={onComplete}
          onProjectChange={onProjectChange}
        />
      </div>
    </div>
  );
}

function ChevronLeftIcon() { return <ChevronRight size={17} style={{ transform: 'rotate(180deg)' }} />; }

function ProjectCanvas({ project, selected, selectedId, view, onSelect }: { project: Project; selected: TaskNode; selectedId: string; view: ViewMode; onSelect: (id: string) => void }) {
  const [zoom, setZoom] = useState(0.72);
  const [offset, setOffset] = useState({ x: -410, y: 32 });
  const [dragging, setDragging] = useState(false);
  const pointerStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const stageMap = useMemo(() => Object.fromEntries(project.stages.map((stage) => [stage.id, stage])), [project.stages]);

  useEffect(() => {
    setOffset({ x: 250 - selected.x * zoom, y: 90 - selected.y * zoom });
  }, [selectedId]);

  if (view === 'knowledge') return <KnowledgeView node={selected} />;
  if (view === 'execution') return <ExecutionView node={selected} />;

  return (
    <div
      className={`map-viewport ${dragging ? 'dragging' : ''}`}
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest('.map-node')) return;
        setDragging(true);
        pointerStart.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!dragging) return;
        setOffset({ x: pointerStart.current.ox + event.clientX - pointerStart.current.x, y: pointerStart.current.oy + event.clientY - pointerStart.current.y });
      }}
      onPointerUp={() => setDragging(false)}
    >
      <div className="map-world" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}>
        <svg className="edge-layer" width="1500" height="800" viewBox="0 0 1500 800">
          {project.tasks.flatMap((node) => node.dependencies.map((dep) => {
            const source = project.tasks.find((item) => item.id === dep);
            if (!source) return null;
            const x1 = source.x + 220;
            const y1 = source.y + 60;
            const x2 = node.x;
            const y2 = node.y + 60;
            const mid = (x1 + x2) / 2;
            const done = source.status === 'done';
            return <path key={`${dep}-${node.id}`} d={`M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`} className={done ? 'edge done' : 'edge'} />;
          }))}
        </svg>
        {project.tasks.map((node) => <MapNode key={node.id} node={node} stage={stageMap[node.stageId]} selected={selectedId === node.id} onSelect={onSelect} />)}
      </div>
      <div className="map-legend"><span><i className="dot done" />已完成</span><span><i className="dot active" />进行中</span><span><i className="dot" />待解锁</span></div>
      <div className="zoom-controls">
        <button onClick={() => setZoom((z) => Math.min(1.15, z + 0.1))}><ZoomIn size={16} /></button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.max(0.48, z - 0.1))}><ZoomOut size={16} /></button>
        <button onClick={() => { setZoom(0.72); setOffset({ x: 250 - selected.x * 0.72, y: 90 - selected.y * 0.72 }); }}><Focus size={16} /></button>
      </div>
      <div className="minimap"><div className="mini-path" /><i style={{ left: `${Math.min(86, selected.x / 15)}%`, top: `${Math.min(80, selected.y / 9)}%` }} /></div>
    </div>
  );
}

function MapNode({ node, stage, selected, onSelect }: { node: TaskNode; stage: Stage; selected: boolean; onSelect: (id: string) => void }) {
  const Icon = node.status === 'done' ? Check : node.status === 'in-progress' ? Play : node.status === 'locked' ? Lock : Circle;
  return (
    <button className={`map-node status-${node.status} ${selected ? 'selected' : ''}`} style={{ left: node.x, top: node.y, '--stage-color': stage?.color } as React.CSSProperties} onClick={() => onSelect(node.id)}>
      <div className="node-top"><span className="node-icon"><Icon size={15} fill={node.status === 'in-progress' ? 'currentColor' : 'none'} /></span><small>{node.module}</small><MoreHorizontal size={15} /></div>
      <h3>{node.title}</h3>
      <p>{node.summary}</p>
      <div className="node-bottom"><span>{statusLabel[node.status]}</span><small><Clock3 size={12} />{node.duration}</small></div>
    </button>
  );
}

function KnowledgeView({ node }: { node: TaskNode }) {
  const positions = [{ x: '17%', y: '18%' }, { x: '65%', y: '12%' }, { x: '72%', y: '61%' }, { x: '18%', y: '65%' }];
  return (
    <div className="concept-canvas">
      <svg className="concept-lines"><line x1="50%" y1="48%" x2="24%" y2="25%" /><line x1="50%" y1="48%" x2="72%" y2="21%" /><line x1="50%" y1="48%" x2="77%" y2="68%" /><line x1="50%" y1="48%" x2="25%" y2="72%" /></svg>
      <div className="concept-center"><BookOpen size={23} /><small>当前知识主题</small><h2>{node.title}</h2><p>理解知识之间的关系，再回到任务中应用。</p></div>
      {node.knowledge.map((item, index) => <div className="concept-card" key={item} style={{ left: positions[index % 4].x, top: positions[index % 4].y }}><span>0{index + 1}</span><strong>{item}</strong><small>关键知识</small></div>)}
      <div className="view-note"><Lightbulb size={16} />知识图只展开当前节点需要掌握的内容，避免一次学太多。</div>
    </div>
  );
}

function ExecutionView({ node }: { node: TaskNode }) {
  return (
    <div className="execution-canvas">
      <div className="execution-head"><span><ListChecks size={20} /></span><div><small>当前任务</small><h2>{node.title}</h2></div><b>{node.steps.length} 步</b></div>
      <div className="step-flow">
        {node.steps.map((step, index) => <div className="step-card" key={step}><span>{String(index + 1).padStart(2, '0')}</span><div><small>STEP {index + 1}</small><strong>{step}</strong></div>{index === 0 ? <Play size={16} fill="currentColor" /> : <Circle size={16} />}</div>)}
      </div>
      <div className="deliverable-pin"><Box size={18} /><div><small>最终交付物</small><strong>{node.deliverable}</strong></div></div>
    </div>
  );
}

function DetailPanel({ project, node, onClose, onComplete, onProjectChange }: { project: Project; node: TaskNode; onClose: () => void; onComplete: (id: string) => void; onProjectChange: (project: Project) => void }) {
  const [tab, setTab] = useState<'detail' | 'ai'>('detail');
  const [checked, setChecked] = useState<number[]>([]);
  const [uploadName, setUploadName] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'hello', role: 'assistant', content: `我会陪你完成「${node.title}」。遇到报错、方案选择或结果判断，直接把情况发给我。` },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setChecked([]);
    setUploadName('');
    setMessages([{ id: uid(), role: 'assistant', content: `现在聚焦「${node.title}」。建议先按执行步骤做最小验证，有结果后我再帮你审核。` }]);
  }, [node.id, node.title]);

  async function sendMessage() {
    const content = input.trim();
    if (!content || sending) return;
    const userMessage: ChatMessage = { id: uid(), role: 'user', content };
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setSending(true);
    try {
      const response = await fetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project, node, message: content }) });
      if (!response.ok) throw new Error('AI unavailable');
      const data = await response.json() as { reply: string };
      setMessages((current) => [...current, { id: uid(), role: 'assistant', content: data.reply }]);
    } catch {
      setMessages((current) => [...current, { id: uid(), role: 'assistant', content: `先做一个最小排查：确认输入条件，再记录你看到的原始结果。针对“${content.slice(0, 24)}”，请把具体数据、截图或报错补充进来，我会按完成标准逐项判断。` }]);
    } finally { setSending(false); }
  }

  function updateNodeSummary() {
    const next = window.prompt('修改当前节点目标', node.summary);
    if (!next?.trim()) return;
    onProjectChange({ ...project, tasks: project.tasks.map((item) => item.id === node.id ? { ...item, summary: next.trim() } : item) });
  }

  return (
    <aside className="detail-panel">
      <div className="detail-toolbar"><div className="detail-tabs"><button className={tab === 'detail' ? 'active' : ''} onClick={() => setTab('detail')}>节点详情</button><button className={tab === 'ai' ? 'active' : ''} onClick={() => setTab('ai')}><Sparkles size={14} />AI 助手</button></div><button className="icon-button small" onClick={onClose}><X size={16} /></button></div>
      {tab === 'detail' ? (
        <div className="detail-scroll">
          <div className="detail-hero">
            <div className="detail-kicker"><span className={`status-pill ${node.status}`}>{statusLabel[node.status]}</span><span>{node.module}</span></div>
            <h2>{node.title}</h2><p>{node.summary}</p>
            <div className="detail-meta"><span><Clock3 size={14} />预计 {node.duration}</span><button onClick={updateNodeSummary}>编辑目标</button></div>
          </div>
          <DetailSection icon={<Target size={17} />} title="为什么做">
            <p>{node.why}</p>
          </DetailSection>
          <DetailSection icon={<BookOpen size={17} />} title="前置知识" badge={`${node.knowledge.length} 项`}>
            <div className="knowledge-tags">{node.knowledge.map((item) => <span key={item}>{item}</span>)}</div>
          </DetailSection>
          <DetailSection icon={<ListChecks size={17} />} title="执行步骤" badge={`${checked.length}/${node.steps.length}`}>
            <div className="check-list">{node.steps.map((step, index) => <label key={step} className={checked.includes(index) ? 'checked' : ''}><input type="checkbox" checked={checked.includes(index)} onChange={() => setChecked((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index])} /><span><Check size={13} /></span><b>{index + 1}</b><p>{step}</p></label>)}</div>
          </DetailSection>
          <DetailSection icon={<Link2 size={17} />} title="推荐资源">
            <div className="resource-list">{node.resources.map((resource) => <button key={resource.title}><span>{resource.type === 'video' ? <Play size={15} /> : resource.type === 'guide' ? <FileText size={15} /> : <Box size={15} />}</span><div><strong>{resource.title}</strong><small>{resource.type === 'video' ? '视频 · 12 分钟' : resource.type === 'guide' ? '参考指南' : '工具与示例'}</small></div><ChevronRight size={15} /></button>)}</div>
          </DetailSection>
          <DetailSection icon={<Box size={17} />} title="交付物">
            <div className="deliverable-box"><p>{node.deliverable}</p><label className={uploadName ? 'has-file' : ''}><input type="file" onChange={(event) => setUploadName(event.target.files?.[0]?.name ?? '')} /><UploadCloud size={18} /><span>{uploadName || '上传代码、截图、文档或测试数据'}</span></label></div>
          </DetailSection>
          <DetailSection icon={<Gauge size={17} />} title="完成标准">
            <ul className="criteria-list">{node.acceptanceCriteria.map((criterion) => <li key={criterion}><CheckCircle2 size={15} />{criterion}</li>)}</ul>
          </DetailSection>
        </div>
      ) : (
        <div className="ai-chat">
          <div className="ai-context"><Sparkles size={17} /><div><strong>节点教练已就位</strong><span>正在结合目标、依赖与完成标准回答</span></div></div>
          <div className="message-list">{messages.map((message) => <div key={message.id} className={`message ${message.role}`}><span>{message.role === 'assistant' ? <Bot size={16} /> : '你'}</span><p>{message.content}</p></div>)}{sending && <div className="message assistant"><span><Bot size={16} /></span><p className="typing"><i /><i /><i /></p></div>}</div>
          <div className="quick-prompts"><button onClick={() => setInput('我卡住了，帮我一步步排查')}>我卡住了</button><button onClick={() => setInput('请审核我现在的结果是否达标')}>审核结果</button><button onClick={() => setInput('有没有成本更低的方案？')}>更低成本</button></div>
          <div className="chat-input"><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} placeholder="描述进展、粘贴报错，或询问下一步…" /><button className="attach"><Paperclip size={16} /></button><button className="send" onClick={sendMessage}><Send size={16} /></button></div>
        </div>
      )}
      <div className="detail-footer">
        <button className="secondary" onClick={() => setTab('ai')}><MessageCircle size={16} />询问 AI</button>
        <button className="primary" disabled={node.status === 'done' || node.status === 'locked'} onClick={() => onComplete(node.id)}>{node.status === 'done' ? <><Check size={16} />已完成</> : node.status === 'locked' ? <><Lock size={15} />等待前置节点</> : <>提交并完成 <ArrowRight size={16} /></>}</button>
      </div>
    </aside>
  );
}

function DetailSection({ icon, title, badge, children }: { icon: React.ReactNode; title: string; badge?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return <section className={`detail-section ${open ? 'open' : ''}`}><button className="detail-section-title" onClick={() => setOpen((value) => !value)}><span>{icon}</span><strong>{title}</strong>{badge && <small>{badge}</small>}<ChevronDown size={16} /></button>{open && <div className="detail-section-body">{children}</div>}</section>;
}

function CreateProjectModal({ onClose, onCreate }: { onClose: () => void; onCreate: (project: Project) => void }) {
  const [step, setStep] = useState(0);
  const [brief, setBrief] = useState<ProjectBrief>(defaultBrief);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => () => { recognitionRef.current?.stop(); }, []);

  function toggleVoice() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceError('当前浏览器不支持语音输入，请使用最新版 Chrome 或 Safari。');
      return;
    }
    const recognition = new Recognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let transcript = '';
      for (let index = 0; index < event.results.length; index += 1) transcript += event.results[index][0].transcript;
      if (transcript.trim()) setBrief((current) => ({ ...current, goal: `${current.goal.trim()}${current.goal.trim() ? ' ' : ''}${transcript.trim()}` }));
    };
    recognition.onerror = () => {
      setVoiceError('没有听清，请检查麦克风权限后重试。');
      setListening(false);
      recognitionRef.current = null;
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    setVoiceError('');
    setListening(true);
    try {
      recognition.start();
    } catch {
      setListening(false);
      recognitionRef.current = null;
      setVoiceError('麦克风暂时无法启动，请稍后重试。');
    }
  }

  async function generate() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/projects/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(brief) });
      if (!response.ok) throw new Error('生成失败');
      const data = await response.json() as { project: Project };
      onCreate(data.project);
    } catch {
      const fallback = makeFallbackProject(brief);
      onCreate(fallback);
    } finally { setLoading(false); }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="create-modal">
        <div className="modal-head"><Brand /><div className="wizard-progress"><i className={step >= 0 ? 'active' : ''} /><i className={step >= 1 ? 'active' : ''} /><i className={step >= 2 ? 'active' : ''} /></div><button className="icon-button" onClick={onClose}><X size={18} /></button></div>
        {step === 0 && <div className="wizard-page goal-page">
          <p className="eyebrow">START WITH AN INTENTION</p><h1>你想把什么事情<br /><em>真正做出来？</em></h1>
          <div className="goal-input-wrap">
            <textarea autoFocus value={brief.goal} onChange={(event) => setBrief({ ...brief, goal: event.target.value })} placeholder="例如：我想做一个农业监控网站，查看土壤温湿度、pH 和棚内环境数据…" />
            <button type="button" className={`voice-input-button ${listening ? 'listening' : ''}`} onClick={toggleVoice} aria-label={listening ? '停止语音输入' : '开始语音输入'}>
              {listening ? <MicOff size={17} /> : <Mic size={17} />}
              <span>{listening ? '正在聆听' : '语音输入'}</span>
            </button>
          </div>
          {voiceError && <p className="voice-input-error">{voiceError}</p>}
          <p className="field-label">选择一个最接近的项目骨架</p>
          <div className="template-grid">{templateOptions.map((item) => <button key={item.id} className={brief.type === item.id ? 'active' : ''} onClick={() => setBrief({ ...brief, type: item.id })}><span style={{ background: item.accent }}>{item.icon}</span><div><strong>{item.title}</strong><small>{item.description}</small></div><i><Check size={13} /></i></button>)}</div>
        </div>}
        {step === 1 && <div className="wizard-page interview-page">
          <div className="interview-intro"><span><Sparkles size={19} /></span><div><p className="eyebrow">AI PROJECT INTERVIEW</p><h1>再了解一点，路线会更准确。</h1><p>这些答案决定项目范围、节奏与技术深度。</p></div></div>
          <div className="interview-fields">{interviewQuestions.map((question, index) => <label key={question.key}><span><b>{String(index + 1).padStart(2, '0')}</b>{question.label}</span><input value={brief[question.key]} onChange={(event) => setBrief({ ...brief, [question.key]: event.target.value })} placeholder={question.hint} /></label>)}</div>
        </div>}
        {step === 2 && <div className="wizard-page confirm-page">
          {loading ? <div className="generating"><div className="generating-orbit"><Sparkles size={28} /><i /><i /><i /></div><h1>正在搭建你的项目地图</h1><p>识别项目类型 · 匹配模板 · 拆分阶段 · 建立依赖 · 定义完成标准</p><div className="generating-bar"><i /></div></div> : <><p className="eyebrow">READY TO GENERATE</p><h1>确认项目简报</h1><div className="brief-card"><span>{templateOptions.find((item) => item.id === brief.type)?.icon}</span><div><small>项目目标</small><h2>{brief.goal}</h2><p>{brief.purpose || '目标待在执行中进一步澄清'} · {brief.timeline || '灵活周期'} · {brief.experience || '经验未指定'}</p></div></div><div className="promise-grid"><div><Layers3 size={18} /><strong>阶段骨架</strong><span>先看全局，避免走偏</span></div><div><ListChecks size={18} /><strong>执行节点</strong><span>每一步都有完成标准</span></div><div><Sparkles size={18} /><strong>动态调整</strong><span>根据真实结果更新路线</span></div></div>{error && <p className="form-error">{error}</p>}</>}
        </div>}
        <div className="modal-footer">
          <button className="secondary" onClick={step === 0 ? onClose : () => setStep((value) => value - 1)} disabled={loading}>{step === 0 ? '取消' : '上一步'}</button>
          {step < 2 ? <button className="primary" disabled={step === 0 && !brief.goal.trim()} onClick={() => setStep((value) => value + 1)}>{step === 0 ? '开始 AI 访谈' : '确认这些信息'}<ArrowRight size={16} /></button> : <button className="primary" disabled={loading} onClick={generate}>{loading ? '正在生成…' : '生成项目地图'}<Sparkles size={16} /></button>}
        </div>
      </div>
    </div>
  );
}

function getProgress(project: Project) {
  if (!project.tasks.length) return 0;
  const done = project.tasks.filter((item) => item.status === 'done').length;
  return Math.round((done / project.tasks.length) * 100);
}

function makeFallbackProject(brief: ProjectBrief): Project {
  const title = brief.goal.replace(/[，。,.].*$/, '').slice(0, 18) || '我的新项目';
  const fallbackTemplates: Record<ProjectType, { emoji: string; stages: string[] }> = {
    website: { emoji: '⌘', stages: ['需求与范围', '体验原型', '技术实现', '测试部署', '用户验证'] },
    app: { emoji: '▣', stages: ['用户与场景', '产品原型', '客户端开发', '测试发布', '用户反馈'] },
    content: { emoji: '🎬', stages: ['定位与用户', '内容系统', '生产流程', '发布增长', '数据迭代'] },
    ecommerce: { emoji: '◇', stages: ['市场与选品', '店铺定位', '内容上架', '流量与履约', '数据迭代'] },
    hardware: { emoji: '⌁', stages: ['需求与指标', '方案与器件', '样机验证', '可靠性测试', '量产准备'] },
    product: { emoji: '◇', stages: ['需求验证', '产品定义', '设计与打样', '供应链验证', '销售测试'] },
    startup: { emoji: '↗', stages: ['问题与用户', '方案与定位', '最小验证', '商业模型', '首批增长'] },
    research: { emoji: '⌕', stages: ['问题定义', '方法与样本', '资料与访谈', '分析与结论', '行动建议'] },
    agent: { emoji: '✦', stages: ['场景与边界', '提示词与流程', '工具与数据', '评测与安全', '部署与迭代'] },
  };
  const template = fallbackTemplates[brief.type];
  const stageTitles = template.stages;
  const stages: Stage[] = stageTitles.map((name, index) => ({ id: `s${index + 1}`, number: `0${index + 1}`, title: name, summary: '完成当前阶段的关键验证', color: ['#ef7b45', '#9b6df5', '#4787f3', '#26a98a', '#e8a02f'][index], modules: ['核心模块'] }));
  const tasks = stages.flatMap((stage, stageIndex) => [0, 1].map((_, taskIndex) => {
    const index = stageIndex * 2 + taskIndex;
    return {
      id: `n${index + 1}`, stageId: stage.id, module: stage.title, title: taskIndex === 0 ? `明确${stage.title}标准` : `完成${stage.title}验证`,
      moduleId: `${stage.id}:${stage.title}`,
      summary: `围绕“${title}”产出可检查的阶段结果`, why: '用真实交付物推进项目，避免停留在想法和信息收集。',
      status: index === 0 ? 'in-progress' as const : 'locked' as const, duration: '1–2 天', dependencies: index === 0 ? [] : [`n${index}`],
      knowledge: ['关键概念', '验证方法', '常见风险'], steps: ['定义本节点的输入', '完成最小执行', '记录结果', '对照标准自检'], resources: [{ title: '项目节点执行指南', type: 'guide' as const }],
      deliverable: `${stage.title}阶段的可复查交付物`, acceptanceCriteria: ['结果可复现', '关键假设已验证', '风险与下一步已记录'],
      x: 80 + (index % 5) * 280, y: 90 + Math.floor(index / 5) * 270,
    };
  }));
  for (let i = 1; i < tasks.length; i += 1) tasks[i].dependencies = [`n${i}`];
  const modules = stages.map((stage) => ({ id: `${stage.id}:${stage.title}`, stageId: stage.id, title: stage.title, summary: `${stage.title}工作模块` }));
  return { id: uid(), name: title, description: brief.goal, type: brief.type, emoji: template.emoji, updatedAt: '刚刚创建', risk: '尚未提交第一份执行结果，路线将在首次验证后继续校准', stages, modules, tasks };
}

export default App;
