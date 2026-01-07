// packages/frontend/src/components/chat/ChatWidget.tsx
import { useState } from 'react';
import { useGetMessagesQuery, useSendMessageMutation } from '@/services/chat.api';

interface ChatWidgetProps {
  userId: string;
}

export default function ChatWidget({ userId }: ChatWidgetProps) {
  const { data: messages } = useGetMessagesQuery({ userId });
  const [sendMessage] = useSendMessageMutation();
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage({ userId, text: input });
    setInput('');
  };

  return (
    <div className="chat-widget glass-card p-4 flex flex-col fixed bottom-4 right-4 w-80 max-h-[400px]">
      <div className="messages flex-1 overflow-auto mb-2">
        {messages?.map(m => (
          <div key={m.id} className={`message ${m.source === 'telegram' ? 'text-blue-400' : 'text-white'}`}>
            <p>{m.text}</p>
            {m.aiResponse && <p className="text-green-400 text-sm">{m.aiResponse}</p>}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          className="flex-1 rounded p-2 bg-slate-800 text-white"
          placeholder="Написати повідомлення..."
        />
        <button onClick={handleSend} className="btn btn-orange">
          Відправити
        </button>
      </div>
    </div>
  );
}
