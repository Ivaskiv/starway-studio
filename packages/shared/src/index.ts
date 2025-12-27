// packages/shared/src/index.ts

// ============================================
// UI Components
// ============================================
export { Button, type ButtonProps } from './components/ui/Button';
export { Card, CardHeader, CardContent, CardFooter, type CardProps } from './components/ui/Card';
export { Input, type InputProps } from './components/ui/Input';
export { FormField } from './components/ui/FormField';
export { PasswordField } from './components/ui/PasswordField';
export { PasswordStrength } from './components/ui/PasswordStrength';
export { ErrorAlert } from './components/ui/ErrorAlert';
export { Badge, type BadgeProps } from './components/ui/Badge';
export { Progress, type ProgressProps } from './components/ui/Progress';
export { Select, type SelectProps } from './components/ui/Select';
export { Textarea, type TextareaProps } from './components/ui/Textarea';

// ============================================
// Auth Components
// ============================================
export { LoginForm } from './components/auth/LoginForm';
export { RegisterForm } from './components/auth/RegisterForm';
export { ProtectedRoute } from './components/auth/ProtectedRoute';

// ============================================
// Types - ALL FROM ONE SOURCE
// ============================================
export { UserRole } from './types';
export type { 
  // Base
  ID,
  ISODate,
  
  // User & Auth
  User,
  AuthState,
  LoginRequest,
  RegisterRequest,
  RegisterUserInFunnelRequest,
  CreateTelegramUserBody,
  ChangePasswordRequest,
  AuthResponse,
  UserResponse,
  AuthError,
  JwtPayload,
  NormalizedUser,
  
  // Product
  ProductType,
  ProductItem,
  Enrollment,
  
  // Funnel
  FunnelStage,
  FunnelType,
  FunnelStatus,
  Funnel,
  FunnelStep,
  FunnelDraft,
  CreateFunnelRequest,
  UpdateFunnelRequest,
  FunnelResponse,
  FunnelsResponse,
  FunnelUser,
  FunnelUsersResponse,
  
  // Blocks
  BlockType,
  Block,
  CompleteBlockBody,
  
  // Lessons
  Lesson,
  
  // Progress
  UserProgress,
  Achievement,
  
  // Miniapps
  Miniapp,
  Purchase,
  
  // Practicum
  Practicum,
  PracticumBody,
  
  // Cabinet
  CabinetResponse,
  
  // Payment
  WayForPayPayload,
  StartParamPayload,
  WebhookPayload,
  
  // AI
  AIFieldFocus,
  AIGenerateRequest,
  AIGenerateResponse,
  GenerationsBalance,
  AIFunnelAssistantProps,
  
  // Demo
  DemoFunnelStage,
  DemoFunnelResult,
  DemoState,
  
  // Express
  AuthRequest,
  AuthenticatedRequest,
  
  // API Responses
  ApiResponse,
  PaginatedResponse,
} from './types';

// ============================================
// Schemas
// ============================================
export { loginSchema, registerSchema } from './schemas/auth.schemas';
export type { LoginFormData, RegisterFormData } from './schemas/auth.schemas';

// ============================================
// Services
// ============================================
export { authService } from './services/authService';
export { funnelService } from './services/funnelService';

// ============================================
// Funnel Form Schemas & Validators
// ============================================
export {
  createFunnelSchema,
  updateFunnelSchema,
  generateSlug,
  type CreateFunnelFormData,
  type UpdateFunnelFormData,
} from './hooks/useFunnelForm';

// ============================================
// Utils
// ============================================
export { cn } from './utils/cn';

