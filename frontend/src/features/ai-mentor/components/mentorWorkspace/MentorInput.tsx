// features/ai-mentor/components/MentorWorkspace/MentorInput.tsx
interface Props {
  limited: boolean;
}

export default function MentorInput({ limited }: Props) {
  return (
    <div className="flex gap-2">
      <input
        disabled={limited}
        placeholder={
          limited
            ? 'Доступ обмежений у trial'
            : 'Напиши своє питання…'
        }
        className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none disabled:opacity-40"
      />
      <button
        disabled={limited}
        className="px-4 py-2 rounded-lg bg-orange-500 text-black font-medium disabled:opacity-40"
      >
        →
      </button>
    </div>
  );
}
