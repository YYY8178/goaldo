import type { ApiPresetId, Project, ProjectBrief, ProjectType, Stage, TaskNode } from './types';

export interface ApiProviderPreset {
  id: ApiPresetId;
  name: string;
  shortName: string;
  description: string;
  baseUrl: string;
  model: string;
  protocol: 'openai-compatible' | 'anthropic';
  keyPlaceholder: string;
}

export const apiProviderPresets: ApiProviderPreset[] = [
  { id: 'openai', name: 'OpenAI', shortName: 'OpenAI', description: 'GPT 系列', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', protocol: 'openai-compatible', keyPlaceholder: 'sk-…' },
  { id: 'anthropic', name: 'Claude', shortName: 'Claude', description: 'Claude 系列', baseUrl: 'https://api.anthropic.com', model: 'claude-3-5-haiku-latest', protocol: 'anthropic', keyPlaceholder: 'sk-ant-…' },
  { id: 'deepseek', name: 'DeepSeek', shortName: 'DeepSeek', description: 'DeepSeek V4', baseUrl: 'https://api.deepseek.com', model: 'deepseek-v4-flash', protocol: 'openai-compatible', keyPlaceholder: 'sk-…' },
  { id: 'gemini', name: 'Gemini', shortName: 'Gemini', description: 'Gemini Flash', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-3.6-flash', protocol: 'openai-compatible', keyPlaceholder: 'AIza…' },
  { id: 'qwen', name: '通义千问', shortName: 'Qwen', description: '阿里云百炼', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus', protocol: 'openai-compatible', keyPlaceholder: 'sk-…' },
  { id: 'kimi', name: 'Kimi', shortName: 'Kimi', description: '月之暗面', baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k', protocol: 'openai-compatible', keyPlaceholder: 'sk-…' },
  { id: 'glm', name: '智谱 GLM', shortName: 'GLM', description: '智谱 AI', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash', protocol: 'openai-compatible', keyPlaceholder: '…' },
  { id: 'custom', name: '自定义接口', shortName: 'Custom', description: 'OpenAI 兼容', baseUrl: '', model: '', protocol: 'openai-compatible', keyPlaceholder: '填写 API Key' },
];

const stageDefs: Stage[] = [
  { id: 'scope', number: '01', title: '需求与范围', summary: '把模糊想法变成可验证的 MVP', color: '#ef7b45', modules: ['目标定义', '用户场景'] },
  { id: 'hardware', number: '02', title: '硬件采集', summary: '验证传感器与采集链路', color: '#a96dff', modules: ['协议基础', '单传感器', '多传感器'] },
  { id: 'cloud', number: '03', title: '云端链路', summary: '把稳定数据送到云端并存储', color: '#4787f3', modules: ['通信上传', '数据接收', '数据库'] },
  { id: 'product', number: '04', title: '产品界面', summary: '把数据变成可用的监控体验', color: '#26a98a', modules: ['后端 API', '前端仪表盘', '预警'] },
  { id: 'launch', number: '05', title: '测试与上线', summary: '完成可靠性验证与真实部署', color: '#e8a02f', modules: ['系统测试', '部署', '用户验证'] },
];

const task = (
  id: string,
  stageId: string,
  module: string,
  title: string,
  summary: string,
  status: TaskNode['status'],
  x: number,
  y: number,
  dependencies: string[] = [],
  extra: Partial<TaskNode> = {},
): TaskNode => ({
  id,
  stageId,
  moduleId: `${stageId}:${module}`,
  module,
  title,
  summary,
  why: '完成这一节点，才能让后续方案建立在真实、可验证的结果上。',
  status,
  duration: '1–2 天',
  dependencies,
  knowledge: ['核心概念', '常见错误', '验证方法'],
  steps: ['确认输入与约束', '完成最小可行尝试', '记录结果与异常', '按完成标准自检'],
  resources: [
    { title: '节点快速上手指南', type: 'guide' },
    { title: '官方参考资料', type: 'tool' },
  ],
  deliverable: '一份可复查的验证结果，包含过程记录与关键数据。',
  acceptanceCriteria: ['结果可以稳定复现', '关键异常已有记录', '交付物已上传或归档'],
  x,
  y,
  ...extra,
});

const agricultureTasks: TaskNode[] = [
  task('t1', 'scope', '目标定义', '定义 MVP 边界', '明确第一版监控哪些数据、服务谁', 'done', 80, 80, [], {
    duration: '45 分钟',
    deliverable: '一页 MVP 范围说明：土壤温湿度、pH、棚内环境，手机优先。',
    acceptanceCriteria: ['列出目标用户和使用场景', '明确第一版不做远程控制', '定义 4 周完成时间'],
  }),
  task('t2', 'scope', '用户场景', '验证核心使用场景', '访谈 3 位种植者，排序查看与预警需求', 'done', 360, 80, ['t1']),
  task('t3', 'hardware', '协议基础', '认识 RS485 与 Modbus', '理解接线、地址、波特率与读寄存器', 'done', 640, 80, ['t2']),
  task('t4', 'hardware', '单传感器', '读取单个土壤传感器', '让 ESP32 稳定输出温度、湿度和 pH', 'in-progress', 920, 80, ['t3'], {
    why: '单传感器链路是整个项目的最小技术闭环。先把它跑稳，才能低风险地扩展到多传感器和云端。',
    duration: '2–3 小时',
    knowledge: ['RS485 差分信号', 'Modbus RTU 帧结构', 'CRC 校验', '异常值处理'],
    steps: ['确认传感器供电规格', '查看 Modbus 地址与寄存器表', '接入 RS485 转 TTL 模块', 'ESP32 发送读取指令', '解析返回数据', '连续运行 30 分钟并记录异常'],
    resources: [
      { title: 'RS485 与 Modbus：10 分钟入门', type: 'video' },
      { title: '传感器 Modbus 寄存器手册', type: 'guide' },
      { title: 'ESP32 Modbus 示例工程', type: 'tool' },
    ],
    deliverable: 'ESP32 串口持续输出温度、湿度、pH，并保存 30 分钟测试日志。',
    acceptanceCriteria: ['连续运行 30 分钟无中断', 'CRC 校验通过率 ≥ 99%', '不再出现未处理的 65535 异常值'],
  }),
  task('t5', 'hardware', '多传感器', '接入多个传感器', '轮询读取土壤与棚内环境数据', 'locked', 1200, 80, ['t4']),
  task('t6', 'cloud', '通信上传', '选择并验证通信方式', '比较 Wi-Fi、4G 和 LoRa 后完成上报', 'locked', 1200, 330, ['t5']),
  task('t7', 'cloud', '数据接收', '建立数据接收服务', '接收设备消息并验证数据格式', 'locked', 920, 330, ['t6']),
  task('t8', 'cloud', '数据库', '设计时序数据模型', '保存设备、传感器与历史读数', 'locked', 640, 330, ['t7']),
  task('t9', 'product', '后端 API', '开发查询 API', '提供实时数据与历史趋势接口', 'locked', 360, 330, ['t8']),
  task('t10', 'product', '前端仪表盘', '搭建监控仪表盘', '展示核心指标、趋势与设备状态', 'locked', 80, 330, ['t9']),
  task('t11', 'product', '预警', '配置异常预警', '对越界、离线和异常值进行提醒', 'locked', 80, 580, ['t10']),
  task('t12', 'launch', '系统测试', '完成端到端测试', '覆盖采集、传输、存储和展示', 'locked', 360, 580, ['t11']),
  task('t13', 'launch', '部署', '部署第一个可用版本', '让系统在真实温室连续运行', 'locked', 640, 580, ['t12']),
  task('t14', 'launch', '用户验证', '完成首轮现场验证', '收集使用反馈并更新下一轮路线', 'locked', 920, 580, ['t13']),
];

export const sampleProject: Project = {
  id: 'agri-iot',
  name: '农业物联网平台',
  description: '监测土壤温湿度、pH 与棚内环境数据，先完成 4 周 MVP。',
  type: 'website',
  emoji: '🌱',
  updatedAt: '刚刚更新',
  risk: '传感器偶发 65535 异常值，需要补充 CRC 与过滤逻辑',
  stages: stageDefs,
  modules: stageDefs.flatMap((stage) => stage.modules.map((title) => ({ id: `${stage.id}:${title}`, stageId: stage.id, title, summary: `${stage.title}阶段的${title}工作模块` }))),
  tasks: agricultureTasks,
};

export const projectCards = [
  { ...sampleProject, progress: 23, current: '硬件采集 · 单传感器验证', today: '读取单个土壤传感器', accent: '#bce8b6' },
  { id: 'douyin', name: '知识型抖音账号', emoji: '🎬', type: 'content' as ProjectType, progress: 42, current: '内容系统 · 选题库', today: '完成 10 个首发选题', updatedAt: '2 小时前', accent: '#ffd6ca' },
  { id: 'printer', name: '桌面 3D 打印产品', emoji: '🧊', type: 'product' as ProjectType, progress: 12, current: '需求验证 · 用户访谈', today: '整理竞品差评', updatedAt: '昨天', accent: '#d9d2ff' },
];

export const interviewQuestions = [
  { key: 'purpose', label: '这个项目最终要解决什么问题？', hint: '个人学习、内部使用、商业化，或其他' },
  { key: 'experience', label: '你目前有哪些相关经验？', hint: '完全新手 / 有一些经验 / 能独立完成基础工作' },
  { key: 'timeline', label: '希望多久看到第一个可用结果？', hint: '例如：2 周 Demo，6 周上线' },
  { key: 'budget', label: '可投入的预算范围？', hint: '包含工具、硬件、外包与推广预算' },
  { key: 'constraints', label: '有必须遵守的限制或偏好吗？', hint: '例如：手机优先、低成本、不露脸、国内部署' },
] as const;

export const defaultBrief: ProjectBrief = {
  goal: '',
  type: 'website',
  purpose: '',
  experience: '',
  timeline: '',
  budget: '',
  constraints: '',
};

export const templateOptions = [
  { id: 'website' as const, icon: '⌘', title: '开发一个网站', description: '软件与数字产品项目', accent: '#dce8ff' },
  { id: 'app' as const, icon: '▣', title: '开发一个 App', description: '移动端产品与体验项目', accent: '#d9f0e7' },
  { id: 'content' as const, icon: '▶', title: '做一个短视频账号', description: '内容、IP 与增长项目', accent: '#ffe0d5' },
  { id: 'ecommerce' as const, icon: '◇', title: '开一个网店', description: '选品、内容与经营项目', accent: '#fff0cf' },
  { id: 'hardware' as const, icon: '⌁', title: '开发硬件系统', description: '传感器、通信与设备项目', accent: '#dce8ff' },
  { id: 'product' as const, icon: '◇', title: '开发一个实体产品', description: '设计、打样与供应链项目', accent: '#e2dcff' },
  { id: 'startup' as const, icon: '↗', title: '验证一个创业想法', description: '市场、商业模式与首批用户', accent: '#ffe0d5' },
  { id: 'research' as const, icon: '⌕', title: '做一次调研', description: '问题、样本与结论项目', accent: '#d9f0e7' },
  { id: 'agent' as const, icon: '✦', title: '开发一个 AI Agent', description: '提示词、工具与评测项目', accent: '#e2dcff' },
];
