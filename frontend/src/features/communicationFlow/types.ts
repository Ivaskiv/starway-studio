export interface FlowDecisionItem {
  type?: string; // 'microTask' | 'question' | 'custom'
  payload: any;
}

export interface FlowDecision {
  microTasks?: FlowDecisionItem[];  // завжди масив
  otherItems?: FlowDecisionItem[];  // завжди масив
  supportMessage?: string;
  upsell?: {
    type: 'course' | 'subscription' | 'consultation';
    slug?: string;
  };
  pdfReport?: boolean;
}