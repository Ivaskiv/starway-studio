import type { User } from '@/features/user/types/user.types';

export type HomeLegacyHandlers = {
  user: User | null;
  postText: string;
  setPostText: (value: string) => void;
  onOpenAuth: () => void;
  onOpenAIMentor: () => void;
  onCloseAIMentor: () => void;
  aiModalOpen: boolean;
  onNavigateWheel: () => void;
  onNavigateCycle: () => void;
  onNavigateProgress: () => void;
};
