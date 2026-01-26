// shared/types/funnel.types.ts
// # Funnel, FunnelBlock, FunnelBlockData, FunnelStats, BlockType, ChannelId
import { ChannelId } from '../constants/funnel.constants';
import { AIConfig } from './ai.types';
import { ProductType } from './product.types';

export type BlockType =
  | 'awareness'
  | 'interest'
  | 'decision'
  | 'action'
  | 'retention'
  | 'landing'
  | 'telegram'
  | 'email'
  | 'payment'
  | 'ai-mentor'
  | 'product'
  | 'automation';

export interface Block {
  id: string;
  type: BlockType;
  label: string;
  description?: string;
  next?: string[];
}
/* ======================================================
  FUNNEL
====================================================== */

export interface Funnel {
  id: string;
  name: string;
  description?: string;
  blocks: FunnelBlock[];
  connections?: { from: string; to: string }[];
  status: 'draft' | 'active' | 'paused' | 'archived';
  created_at: string;
  updated_at?: string;
  user_id: string;
}

/* ======================================================
  FUNNEL BLOCKS
====================================================== */

export interface FunnelBlockData {
  type: string;
  label: string;
  channels: ChannelId[];
  product?: {
    name: string;
    price: number;
  };
  duration?: number;
  aiConfig?: AIConfig;
  [key: string]: unknown;
}

export interface FunnelBlock extends Node {
  id: string;
  type: string;
  data: FunnelBlockData;
  position: { x: number; y: number };
}

/* ======================================================
  FUNNEL STATS
====================================================== */

export interface FunnelStats {
  views: number;
  conversions: number;
  revenue: number;
  activeUsers: number;
}
// ═══════════════════════════════════════════════════════════════
// FUNNEL DRAFT
// ═══════════════════════════════════════════════════════════════

export interface FunnelDraft {
  id?: string;
  name: string;
  audience: string;
  niche: string;
  goal?: string;
  productType?: ProductType | string | null;
  blocks: Block[];
}
