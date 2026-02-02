export const duplicateToMiniApp = async (userId: string, payload: any, type: 'question' | 'microTask' | 'report') => {
  try {
    await fetch('/api/miniapp/duplicate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, payload, type }),
    });
  } catch (err) {
    console.error(`[MiniApp] duplication error for type ${type}`, err);
  }
};
