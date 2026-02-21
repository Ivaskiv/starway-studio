// features/ai-mentor/components/MentorWorkspace/MentorWorkspace.tsx
import MentorChat from './MentorChat';
import MentorInput from './MentorInput';
import MentorContextPanel from './MentorContextPanel';

interface Props {
  limited?: boolean;
}

export default function MentorWorkspace({ limited = false }: Props) {
  return (
    <div className="glass-card p-5 border border-white/10 grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* CHAT */}
      <div className="lg:col-span-3 flex flex-col gap-3">
        <MentorChat />

        <MentorInput limited={limited} />
      </div>

      {/* CONTEXT */}
      <div className="hidden lg:block">
        <MentorContextPanel />
      </div>
    </div>
  );
}
