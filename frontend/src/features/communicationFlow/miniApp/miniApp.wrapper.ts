// /features/communicationFlow/miniApp/miniApp.wrapper.ts
import { useDuplicateMiniAppItemMutation } from './services/miniApp.api';

export const useMiniAppDuplicator = (userId: string) => {
  const [duplicateMutation] = useDuplicateMiniAppItemMutation();

  const duplicate = async (payload: any, type: string) => {
    await duplicateMutation({ userId, payload, type }).unwrap();
  };

  return { duplicate };
};
