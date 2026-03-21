export interface FunnelDraft {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt?: string | null;
  status: 'draft' | 'published' | 'archived';
  ownerId: string;
  ownerName: string;
  steps: Array<{ title: string; description: string }>;
}
