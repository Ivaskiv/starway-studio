// packages/frontend/src/features/ai-mentor/telegram/MentorChat.tsx

import { Button, Textarea } from '@/ui';
import { AnimatePresence, motion } from 'framer-motion';
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
import { useGetChatHistoryQuery, useSendChatMessageMutation } from '../services/aiMentorApi';
import {
  addChatMessage,
  clearChatInput,
  selectChat,
  setChatInput,
  setChatTyping,
} from '../services/aiMentorSlice';
import type { ChatMessage } from '../types/ai-mentor.types';

// ============ MESSAGE BUBBLE ============
interface MessageBubbleProps {
  message: ChatMessage;
  isLast: boolean;
}

const MessageBubble = ({ message, isLast }: MessageBubbleProps) => {
  const isUser = message.role === 'user';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
    >
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
    </motion.div>
  );
};

// ============ TYPING INDICATOR ============
const TypingIndicator = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="flex items-center gap-2 mb-3"
  >
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 
                  flex items-center justify-center shadow-lg shadow-blue-500/20">
      <Sparkles className="w-4 h-4 text-white" />
    </div>
    
    <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-white/10 backdrop-blur-sm border border-white/10">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-white/60"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    </div>
  </motion.div>
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
      <motion.button
        key={action.action}
        onClick={() => onAction(action.action)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 
                 border border-white/10 text-white/80 text-sm whitespace-nowrap
                 hover:bg-white/10 transition-colors"
      >
        <action.icon className="w-4 h-4" style={{ color: action.color }} />
        {action.label}
      </motion.button>
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
        />
      </div>
      
      <motion.button
        onClick={onSend}
        disabled={!value.trim() || isLoading}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
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
      </motion.button>
    </div>
  );
};

// ============ MAIN CHAT COMPONENT ============
interface MentorChatProps {
  userId: string;
  onClose?: () => void;
}

export const MentorChat = ({ userId, onClose }: MentorChatProps) => {
  const dispatch = useAppDispatch();
  const { messages, isTyping, inputValue } = useAppSelector(selectChat);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showQuickActions, setShowQuickActions] = useState(true);
  
  // RTK Query
  const { data: chatHistory, isLoading: isLoadingHistory } = useGetChatHistoryQuery({ userId, limit: 50 });
  const [sendMessage, { isLoading: isSending }] = useSendChatMessageMutation();
  
  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);
  
  // Initialize chat history
  useEffect(() => {
    if (chatHistory && chatHistory.length > 0) {
      // Set messages from history
      chatHistory.forEach(msg => dispatch(addChatMessage(msg)));
    }
  }, [chatHistory, dispatch]);

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isSending) return;
    
    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
    };
    
    dispatch(addChatMessage(userMessage));
    dispatch(clearChatInput());
    dispatch(setChatTyping(true));
    setShowQuickActions(false);
    
    try {
      const response = await sendMessage({ userId, content: userMessage.content }).unwrap();
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
  }, [dispatch, inputValue, userId, sendMessage, isSending]);

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
        {/* Welcome message if no messages */}
        {messages.length === 0 && !isLoadingHistory && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 
                          flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-blue-500/30">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Привіт! 👋</h2>
            <p className="text-white/60 max-w-sm mx-auto">
              Я твій AI-ментор. Готовий допомогти з цілями, рефлексією та особистим розвитком.
            </p>
          </motion.div>
        )}
        
        {/* Messages */}
        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              isLast={index === messages.length - 1}
            />
          ))}
        </AnimatePresence>
        
        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && <TypingIndicator />}
        </AnimatePresence>
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Quick Actions */}
      {showQuickActions && messages.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 pb-2"
        >
          <p className="text-xs text-white/40 mb-2">Швидкі дії:</p>
          <QuickActionsBar onAction={handleQuickAction} />
        </motion.div>
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