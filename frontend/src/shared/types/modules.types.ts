// frontend/src/types/modules.ts

// ═══════════════════════════════════════════════════════════════
// USER & AUTH
// ═══════════════════════════════════════════════════════════════
export type FieldType =
  | 'input'
  | 'email'
  | 'textarea'
  | 'select'
  | 'number'
  | 'checkbox'
  | 'radio'
  | 'date'
  | 'time'
  | 'datetime-local'
  | 'month'
  | 'week'
  | 'range'
  | 'color'
  | 'file'
  | 'password'
  | 'text';

export interface FrontendUser {
  id: string;
  name: string;
  email?: string;
  token?: string;
  demo?: boolean;
}

// frontend/src/features/ai-mentor/types/mentor.types.ts

export interface DailyTask {
  id: string;
  title: string;
  description?: string;
  status: 'PENDING' | 'COMPLETED' | 'skipped';
  scheduledTime?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  createdAt: string;
  completed_at?: string;
}

export interface TodayTasks {
  tasks: DailyTask[];
  total: number;
  completed: number;
}

export interface YearlyGoal {
  id: string;
  title: string;
  progress: number;
  category?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  messages?: ChatMessage[];
}

export interface ChatHistory {
  messages: ChatMessage[];
  total: number;
}

export interface MentorStats {
  streak: number;
  goalsCompleted: number;
  xp: number;
  level: number;
  tasksToday: number;
  sessionsThisWeek: number;
}

export interface SmartAction {
  action: string;
  time: string;
  duration_min: number;
  result: string;
}

// frontend/src/types/index.ts

export interface PromptAnalysis {
  theme: string; // коротка назва теми воронки (максимум 60 символів)
  targetAudience: string; // хто цільова аудиторія
  mainProblem: string; // головна проблема, яку вирішує продукт
  solution: string; // яке рішення пропонується
  uniqueValue: string; // унікальна цінність пропозиції
  duration: string; // тривалість програми (якщо не вказано, 'не вказано')
  platform: string; // платформа (web / telegram / mobile або комбінація)
  monetization: string; // модель монетизації (trial / subscription / freemium / course тощо)
}
