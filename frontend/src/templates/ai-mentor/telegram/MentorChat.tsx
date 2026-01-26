import { ChatMessage } from '@/types/mentor.types';
import { Button, Textarea } from '@/ui';
import {
  BarChart3,
  Moon,
  Send,
  Settings,
  Sparkles,
  Sun,
  Target,
  X
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks';
import { useGetChatHistoryQuery, useSendChatMessageMutation } from '../services/aiMentor.api';
import {
  addChatMessage,
  clearChatInput,
  selectChat,
  setChatInput,
  setChatTyping,
} from '../services/aiMentorSlice';

// ============ MESSAGE BUBBLE ============
interface MessageBubbleProps {
  message: ChatMessage;
  isLast: boolean;
}

const MessageBubble = ({ message }: MessageBubbleProps) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 
                      flex items-center justify-center mr-2 flex-shrink-0 shadow-lg shadow-blue-500/20">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      )}
      
      <div
        className={`
          max-w-[80%] px-4 py-3 rounded-2xl
          ${isUser 
            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md' 
            : 'bg-white/10 text-white/90 rounded-bl-md backdrop-blur-sm border border-white/10'
          }
        `}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        <span className={`text-[10px] mt-1 block ${isUser ? 'text-white/60' : 'text-white/40'}`}>
          {new Date(message.timestamp).toLocaleTimeString('uk-UA', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>
      </div>
    </div>
  );
};

// ============ TYPING INDICATOR ============
const TypingIndicator = () => (
  <div className="flex items-center gap-2 mb-3">
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 
                  flex items-center justify-center shadow-lg shadow-blue-500/20">
      <Sparkles className="w-4 h-4 text-white" />
    </div>
    
    <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-white/10 backdrop-blur-sm border border-white/10">
      <div className="flex gap-1 animate-pulse">
        <div className="w-2 h-2 rounded-full bg-white/60" />
        <div className="w-2 h-2 rounded-full bg-white/60" />
        <div className="w-2 h-2 rounded-full bg-white/60" />
      </div>
    </div>
  </div>
);

// ============ QUICK ACTIONS ============
interface QuickAction {
  icon: React.ElementType;
  label: string;
  action: string;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { icon: Sun, label: 'Ранкова сесія', action: 'start_morning_session', color: '#F59E0B' },
  { icon: Moon, label: 'Вечірня сесія', action: 'start_evening_session', color: '#6366F1' },
  { icon: Target, label: 'Мої цілі', action: 'show_goals', color: '#10B981' },
  { icon: BarChart3, label: 'Аналітика', action: 'show_analytics', color: '#8B5CF6' },
];

interface QuickActionsBarProps {
  onAction: (action: string) => void;
}

const QuickActionsBar = ({ onAction }: QuickActionsBarProps) => (
  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
    {QUICK_ACTIONS.map((action) => (
      <button
        key={action.action}
        onClick={() => onAction(action.action)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 
                   border border-white/10 text-white/80 text-sm whitespace-nowrap
                   hover:bg-white/10 transition-colors"
      >
        <action.icon className="w-4 h-4" style={{ color: action.color }} />
        {action.label}
      </button>
    ))}
  </div>
);

// ============ CHAT INPUT ============
interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
}

const ChatInput = ({ value, onChange, onSend, isLoading }: ChatInputProps) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };
  
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [value]);

  return (
    <div className="flex items-end gap-2 p-4 bg-black/40 backdrop-blur-xl border-t border-white/10">
      <div className="flex-1 relative">
        <Textarea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Напиши повідомлення..."
          rows={1}
          className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/10
                   text-white placeholder-white/40 resize-none
                   focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent
                   transition-all duration-200"
          style={{ maxHeight: '120px' }}
          autoFocus
        />
      </div>
      
      <button
        onClick={onSend}
        disabled={!value.trim() || isLoading}
        className={`
          w-12 h-12 rounded-2xl flex items-center justify-center
          transition-all duration-200
          ${value.trim() && !isLoading
            ? 'bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30'
            : 'bg-white/10 opacity-50 cursor-not-allowed'
          }
        `}
      >
        <Send className="w-5 h-5 text-white" />
      </button>
    </div>
  );
};

// ============ MAIN CHAT COMPONENT ============
interface MentorChatProps {
  user_id: string;
  onClose?: () => void;
}

export const MentorChat = ({ user_id, onClose }: MentorChatProps) => {
  const dispatch = useAppDispatch();
  const { messages, isTyping, inputValue } = useAppSelector(selectChat);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showQuickActions, setShowQuickActions] = useState(true);
  
  const { data: chat_history, isLoading: isLoadingHistory } = useGetChatHistoryQuery({ user_id, limit: 50 });
  const [sendMessage, { isLoading: isSending }] = useSendChatMessageMutation();
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);
  
  useEffect(() => {
    if (chat_history && chat_history.length > 0) {
      chat_history.forEach(msg => dispatch(addChatMessage(msg)));
    }
  }, [chat_history, dispatch]);

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isSending) return;
    
    const user_message: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
    };
    
    dispatch(addChatMessage(user_message));
    dispatch(clearChatInput());
    dispatch(setChatTyping(true));
    setShowQuickActions(false);
    
    try {
      const response = await sendMessage({ user_id, content: user_message.content }).unwrap();
      dispatch(addChatMessage(response));
    } catch (error) {
      console.error('Send message error:', error);
      dispatch(addChatMessage({
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Вибач, щось пішло не так. Спробуй ще раз 🙏',
        timestamp: new Date().toISOString(),
      }));
    } finally {
      dispatch(setChatTyping(false));
    }
  }, [dispatch, inputValue, user_id, sendMessage, isSending]);

  const handleQuickAction = useCallback((action: string) => {
    const actionMessages: Record<string, string> = {
      start_morning_session: 'Хочу почати ранкову сесію',
      start_evening_session: 'Готовий до вечірньої сесії',
      show_goals: 'Покажи мої цілі',
      show_analytics: 'Яка моя аналітика за цей тиждень?',
    };
    
    dispatch(setChatInput(actionMessages[action] || action));
  }, [dispatch]);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 
                        flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-white">AI-Ментор</h1>
            <p className="text-xs text-green-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Онлайн
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 
                           flex items-center justify-center transition-colors">
            <Settings className="w-5 h-5 text-white/60" />
          </Button>
          {onClose && (
            <Button 
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 
                       flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-white/60" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && !isLoadingHistory && (
          <div className="text-center py-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 
                          flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-blue-500/30">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Привіт! 👋</h2>
            <p className="text-white/60 max-w-sm mx-auto">
              Я твій AI-ментор. Готовий допомогти з цілями, рефлексією та особистим розвитком.
            </p>
          </div>
        )}
        
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            isLast={index === messages.length - 1}
          />
        ))}
        
        {isTyping && <TypingIndicator />}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Quick Actions */}
      {showQuickActions && messages.length === 0 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-white/40 mb-2">Швидкі дії:</p>
          <QuickActionsBar onAction={handleQuickAction} />
        </div>
      )}
      
      {/* Input */}
      <ChatInput
        value={inputValue}
        onChange={(value) => dispatch(setChatInput(value))}
        onSend={handleSend}
        isLoading={isSending}
      />
    </div>
  );
};

export default MentorChat;
