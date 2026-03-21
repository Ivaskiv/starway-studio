// features/ai-mentor/components/MentorWorkspace/MentorWorkspace.tsx
import MentorInput from './MentorInput';
import MentorContextPanel from './MentorContextPanel';
import type { ReactNode } from 'react';
import MentorChat from '@/features/ai-mentor/components/mentorWorkspace/MentorWelcome';

interface Props {
  limited?: boolean;
  children?: ReactNode;
}

export default function MentorWorkspace({ limited = false, children }: Props) {
  return (
    <div className="glass-card p-5 border border-white/10 grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* CHAT */}
      <div className="lg:col-span-3 flex flex-col gap-3">
        {children ?? (
          <>
            <MentorChat />
            <MentorInput limited={limited} />
          </>
        )}
      </div>

      {/* CONTEXT */}
      <div className="hidden lg:block">
        <MentorContextPanel />
      </div>
    </div>
  );
}
