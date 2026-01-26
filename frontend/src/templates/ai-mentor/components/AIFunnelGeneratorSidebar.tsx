// frontend/src/features/ai-mentor/AIFunnelGeneratorSidebar.tsx
// import { Button } from '@/ui';
// import React, { useState, useEffect } from 'react';

// interface AIFunnelGeneratorSidebarProps {
//   activeInput: 'name' | 'description' | null;
//   currentName: string;
//   currentDescription: string;
//   onApply: (data: { name: string; description: string }) => void;
// }

// export const AIFunnelGeneratorSidebar: React.FC<AIFunnelGeneratorSidebarProps> = ({
//   activeInput,
//   currentName,
//   currentDescription,
//   onApply,
// }) => {
//   const [name, setName] = useState(currentName);
//   const [description, setDescription] = useState(currentDescription);

//   // Синхронізація з пропсами, якщо вони зміняться ззовні
//   useEffect(() => {
//     setName(currentName);
//   }, [currentName]);

//   useEffect(() => {
//     setDescription(currentDescription);
//   }, [currentDescription]);

//   const handleApply = () => {
//     onApply({ name, description });
//   };

//   return (
//     <div className="w-96 bg-gray-900/90 p-6 rounded-2xl shadow-lg space-y-6 border border-white/10">
//       <h2 className="text-xl font-bold text-white">AI Funnel Generator</h2>

//       <div className="space-y-4">
//         <label className="block text-white/70 font-medium">Name</label>
//         <input
//           type="text"
//           value={name}
//           onChange={(e) => setName(e.target.value)}
//           className={`
//             w-full p-3 rounded-xl bg-white/5 border border-white/20 text-white
//             placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50
//             transition-all duration-200
//             ${activeInput === 'name' ? 'ring-2 ring-blue-500/50' : ''}
//           `}
//           placeholder="Enter funnel name"
//         />
//       </div>

//       <div className="space-y-4">
//         <label className="block text-white/70 font-medium">Description</label>
//         <textarea
//           value={description}
//           onChange={(e) => setDescription(e.target.value)}
//           rows={4}
//           className={`
//             w-full p-3 rounded-xl bg-white/5 border border-white/20 text-white
//             placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50
//             transition-all duration-200
//             ${activeInput === 'description' ? 'ring-2 ring-blue-500/50' : ''}
//           `}
//           placeholder="Enter funnel description"
//         />
//       </div>

//       <Button
//         onClick={handleApply}
//         className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 font-semibold text-white hover:scale-105 transition-all duration-200"
//       >
//         Apply AI Suggestions
//       </Button>
//     </div>
//   );
// };

// export default AIFunnelGeneratorSidebar;


// frontend/src/features/funnels/components/AIFunnelGeneratorSidebar.tsx
import { useState } from 'react';
import { Sparkles, Loader } from 'lucide-react';
import { Button, Textarea } from '@/ui';

interface AIFunnelGeneratorSidebarProps {
  activeInput: 'name' | 'description' | null;
  currentName: string;
  currentDescription: string;
  onApply: (field: 'name' | 'description', value: string) => void;
}

const AIFunnelGeneratorSidebar = ({
  activeInput,
  currentName,
  currentDescription,
  onApply,
}: AIFunnelGeneratorSidebarProps) => {
  const [loading, setLoading] = useState(false);
  const [aiName, setAIName] = useState('');
  const [aiDescription, setAIDescription] = useState('');

  const handleGenerate = async () => {
    if (!activeInput) return;

    setLoading(true);

    // MOCK AI генерація
    await new Promise((res) => setTimeout(res, 800));

    if (activeInput === 'name') {
      setAIName(`AI Назва для "${currentName || 'нової воронки'}"`);
    } else {
      setAIDescription(`AI Опис для "${currentDescription || 'нової воронки'}"...`);
    }

    setLoading(false);
  };

  const handleApply = () => {
    if (activeInput === 'name') {
      onApply('name', aiName);
    } else if (activeInput === 'description') {
      onApply('description', aiDescription);
    }
  };

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-6 h-6 text-orange-500" />
        <h3 className="text-lg font-semibold text-white">AI Асистент</h3>
      </div>

      <Textarea
        value={activeInput === 'name' ? aiName : aiDescription}
        placeholder={
          activeInput === 'name'
            ? 'AI згенерує назву воронки'
            : 'AI згенерує опис воронки'
        }
        readOnly
        rows={4}
        className="glass-textarea"
      />

      <div className="flex space-x-2">
        <Button
          type="button"
          size="md"
          onClick={handleGenerate}
          disabled={loading || !activeInput}
          className="gradient-button flex-1 flex items-center justify-center"
        >
          {loading ? <Loader className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
          Згенерувати
        </Button>

        <Button
          type="button"
          size="md"
          onClick={handleApply}
          disabled={!activeInput || (!aiName && !aiDescription)}
          className="glass-button flex-1"
        >
          Застосувати
        </Button>
      </div>

      {!activeInput && (
        <p className="text-sm text-slate-400">
          Оберіть поле назви або опису, щоб AI міг згенерувати текст.
        </p>
      )}
    </div>
  );
};

export default AIFunnelGeneratorSidebar;
