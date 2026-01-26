// // frontend/src/components/funnel/stepConfigs/TelegramStepConfig.tsx

// import { useState } from 'react';
// import { MessageCircle, Plus, Trash2, Sparkles } from 'lucide-react';
// import { Button, Input, Textarea, Select } from '@/ui';
// import { buildPrompt } from '@/lib/aiPrompts';
// import toast from 'react-hot-toast';

// interface TelegramStepConfigProps {
//   config: any;
//   onChange: (config: any) => void;
// }

// export default function TelegramStepConfig({ config, onChange }: TelegramStepConfigProps) {
//   const [message, setMessage] = useState(config.message?.text || '');
//   const [buttons, setButtons] = useState(config.message?.buttons || []);
//   const [generatingAI, setGeneratingAI] = useState(false);

//   const handleMessageChange = (text: string) => {
//     setMessage(text);
//     onChange({
//       ...config,
//       message: {
//         ...config.message,
//         text,
//         buttons
//       }
//     });
//   };

//   const handleGenerateAI = async () => {
//     setGeneratingAI(true);
//     try {
//       const prompt = buildPrompt('telegramMessage', '', {
//         stepName: 'Привітальне повідомлення',
//         context: 'AI-Ментор воронка',
//         goal: 'Привітати користувача',
//         targetAudience: 'Люди 25-45 років'
//       });

//       // TODO: Реальний AI API
//       await new Promise(resolve => setTimeout(resolve, 1500));
      
//       const generatedText = 'Привіт! 👋 Вітаю в AI-Менторі!\n\nГотовий почати свою трансформацію?';
//       handleMessageChange(generatedText);
//       toast.success('Текст згенеровано!');
//     } catch (err) {
//       toast.error('Помилка генерації');
//     } finally {
//       setGeneratingAI(false);
//     }
//   };

//   const handleAddButton = () => {
//     const newButtons = [
//       ...buttons,
//       { 
//         id: `btn_${Date.now()}`, 
//         text: 'Нова кнопка', 
//         action: 'next', 
//         value: '',
//         style: 'primary'
//       }
//     ];
//     setButtons(newButtons);
//     onChange({
//       ...config,
//       message: {
//         ...config.message,
//         text: message,
//         buttons: newButtons
//       }
//     });
//   };

//   const handleRemoveButton = (index: number) => {
//     const newButtons = buttons.filter((_: any, i: number) => i !== index);
//     setButtons(newButtons);
//     onChange({
//       ...config,
//       message: {
//         ...config.message,
//         text: message,
//         buttons: newButtons
//       }
//     });
//   };

//   const handleButtonChange = (index: number, field: string, value: string) => {
//     const newButtons = buttons.map((btn: any, i: number) =>
//       i === index ? { ...btn, [field]: value } : btn
//     );
//     setButtons(newButtons);
//     onChange({
//       ...config,
//       message: {
//         ...config.message,
//         text: message,
//         buttons: newButtons
//       }
//     });
//   };

//   return (
//     <div className="glass-card p-6 space-y-6">
//       <div className="flex items-center gap-3 mb-4">
//         <div className="icon-container-blue w-10 h-10">
//           <MessageCircle className="w-5 h-5 text-blue-500" />
//         </div>
//         <div>
//           <h4 className="font-semibold text-white">Telegram Повідомлення</h4>
//           <p className="text-sm text-slate-400">Налаштуйте текст та кнопки</p>
//         </div>
//       </div>

//       {/* Message Text */}
//       <div>
//         <div className="flex items-center justify-between mb-2">
//           <label className="block text-sm font-medium text-slate-300">
//             Текст повідомлення
//           </label>
//           <Button
//             variant="ghost"
//             size="sm"
//             onClick={handleGenerateAI}
//             disabled={generatingAI}
//             className="glass-button text-orange-400"
//           >
//             <Sparkles className="w-4 h-4 mr-1" />
//             {generatingAI ? 'Генерую...' : 'AI'}
//           </Button>
//         </div>
        
//         <Textarea
//           placeholder="Привіт! 👋 Вітаю в AI-Менторі..."
//           value={message}
//           onChange={(e) => handleMessageChange(e.target.value)}
//           rows={6}
//           helperText="Підтримує emoji та Markdown форматування"
//         />
//       </div>

//       {/* Buttons */}
//       <div>
//         <div className="flex items-center justify-between mb-3">
//           <label className="text-sm font-medium text-slate-300">Кнопки</label>
//           <Button
//             variant="ghost"
//             size="sm"
//             onClick={handleAddButton}
//             className="glass-button"
//           >
//             <Plus className="w-4 h-4 mr-2" />
//             Додати кнопку
//           </Button>
//         </div>

//         <div className="space-y-3">
//           {buttons.map((button: any, index: number) => (
//             <div key={button.id} className="glass-card bg-slate-800/50 p-4">
//               <div className="flex items-center gap-3 mb-3">
//                 <Input
//                   placeholder="Текст кнопки"
//                   value={button.text}
//                   onChange={(e) => handleButtonChange(index, 'text', e.target.value)}
//                   className="flex-1"
//                 />
//                 <Button
//                   variant="ghost"
//                   size="sm"
//                   onClick={() => handleRemoveButton(index)}
//                   className="glass-button text-red-400 hover:bg-red-500/10"
//                 >
//                   <Trash2 className="w-4 h-4" />
//                 </Button>
//               </div>

//               <div className="grid grid-cols-2 gap-3">
//                 {/* ВИПРАВЛЕНО: використовуємо options prop */}
//                 <Select
//                   options={[
//                     { value: 'next', label: 'Наступний крок' },
//                     { value: 'url', label: 'Відкрити URL' },
//                     { value: 'callback', label: 'Callback дія' },
//                     { value: 'payment', label: 'Оплата' }
//                   ]}
//                   value={button.action}
//                   onChange={(e) => handleButtonChange(index, 'action', e.target.value)}
//                 />

//                 <Select
//                   options={[
//                     { value: 'primary', label: 'Основна' },
//                     { value: 'secondary', label: 'Вторинна' },
//                     { value: 'danger', label: 'Небезпечна' }
//                   ]}
//                   value={button.style}
//                   onChange={(e) => handleButtonChange(index, 'style', e.target.value)}
//                 />
//               </div>

//               {button.action === 'url' && (
//                 <Input
//                   placeholder="https://example.com"
//                   value={button.value || ''}
//                   onChange={(e) => handleButtonChange(index, 'value', e.target.value)}
//                   className="mt-3"
//                 />
//               )}
//             </div>
//           ))}

//           {buttons.length === 0 && (
//             <div className="text-center py-8 glass-card bg-slate-800/30">
//               <p className="text-slate-400 text-sm">Немає кнопок</p>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }