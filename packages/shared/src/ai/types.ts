import { Sparkles, Users, Target, Flag, ListTree } from 'lucide-react';


export type AIGenerateField = 'name' | 'audience' | 'goal' | 'steps';



export type AIFieldFocus = 'name' | 'audience' | 'niche' | 'goal' | 'funnel-structure';


export interface AIFieldConfig {
  title: string;
  placeholder: string;
  tips: string[];
  icon: typeof Sparkles; 
}
