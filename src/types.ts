export type ProjectType = 'website' | 'app' | 'content' | 'ecommerce' | 'hardware' | 'product' | 'startup' | 'research' | 'agent';
export type TaskStatus = 'locked' | 'todo' | 'in-progress' | 'review' | 'done';
export type ViewMode = 'project' | 'knowledge' | 'execution';

export interface ProjectBrief {
  goal: string;
  type: ProjectType;
  purpose: string;
  experience: string;
  timeline: string;
  budget: string;
  constraints: string;
}

export interface TaskNode {
  id: string;
  stageId: string;
  moduleId: string;
  module: string;
  title: string;
  summary: string;
  why: string;
  status: TaskStatus;
  duration: string;
  dependencies: string[];
  knowledge: string[];
  steps: string[];
  resources: { title: string; type: 'guide' | 'video' | 'tool' }[];
  deliverable: string;
  acceptanceCriteria: string[];
  x: number;
  y: number;
}

export interface Stage {
  id: string;
  number: string;
  title: string;
  summary: string;
  color: string;
  modules: string[];
}

export interface Module {
  id: string;
  stageId: string;
  title: string;
  summary: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  type: ProjectType;
  emoji: string;
  updatedAt: string;
  risk: string;
  stages: Stage[];
  modules: Module[];
  tasks: TaskNode[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export type ApiConnectionStatus = 'active' | 'revoked';
export type ApiRequestStatus = 'pending' | 'approved' | 'rejected';
export type ApiPresetId = 'openai' | 'anthropic' | 'deepseek' | 'gemini' | 'qwen' | 'kimi' | 'glm' | 'custom';

export interface ApiConnection {
  id: string;
  mode: 'self' | 'managed';
  provider: 'openai-compatible' | 'custom';
  preset_id: ApiPresetId;
  label: string;
  base_url: string;
  model: string;
  key_hint: string;
  status: ApiConnectionStatus;
  created_at: string;
  updated_at: string;
}

export interface ApiAccessRequest {
  id: string;
  user_id: string;
  email?: string;
  purpose: string;
  expected_usage: string;
  status: ApiRequestStatus;
  admin_note: string;
  created_at: string;
  updated_at: string;
}
