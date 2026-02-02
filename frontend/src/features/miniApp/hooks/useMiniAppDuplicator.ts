// /features/miniApp/hooks/useMiniAppDuplicator.ts
import { duplicateToMiniApp } from '../utils/miniApp.utils';

export const useMiniAppDuplicator = (userId: string) => {
  const duplicate = async (payload: any, type: 'question' | 'microTask' | 'report') => {
    await duplicateToMiniApp(userId, payload, type);
  };

  return { duplicate };
};
