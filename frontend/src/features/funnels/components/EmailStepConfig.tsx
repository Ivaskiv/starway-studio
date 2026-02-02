// // frontend/src/components/funnel/stepConfigs/EmailStepConfig.tsx

// import { Mail } from 'lucide-react';
// import { Input, Textarea } from '@/frontend/srcui';

// interface EmailStepConfigProps {
//   config: any;
//   onChange: (config: any) => void;
// }

// export default function EmailStepConfig({ config, onChange }: EmailStepConfigProps) {
//   const handleChange = (field: string, value: string) => {
//     onChange({
//       ...config,
//       email: {
//         ...config.email,
//         [field]: value
//       }
//     });
//   };

//   return (
//     <div className="glass-card p-6 space-y-6">
//       <div className="flex items-center gap-3 mb-4">
//         <div className="icon-container-purple w-10 h-10">
//           <Mail className="w-5 h-5 text-purple-500" />
//         </div>
//         <div>
//           <h4 className="font-semibold text-white">Email Лист</h4>
//           <p className="text-sm text-slate-400">Налаштуйте email повідомлення</p>
//         </div>
//       </div>

//       <Input
//         label="Тема листа"
//         placeholder="Ваші результати за тиждень 🎯"
//         value={config.email?.subject || ''}
//         onChange={(e) => handleChange('subject', e.target.value)}
//         className="glass-input"
//       />

//       <Input
//         label="Від кого (необов'язково)"
//         placeholder="nadya@starway.com"
//         value={config.email?.from || ''}
//         onChange={(e) => handleChange('from', e.target.value)}
//         className="glass-input"
//         helperText="Якщо не вказано, використовується дефолтний email"
//       />

//       <Textarea
//         label="Текст листа"
//         placeholder="Привіт!

// Ось твої результати за перший тиждень...

// З любов'ю,
// AI-Ментор ✨"
//         value={config.email?.body || ''}
//         onChange={(e) => handleChange('body', e.target.value)}
//         rows={12}
//         className="glass-textarea"
//         helperText="Підтримує HTML та змінні: {user_name}, {weekNumber}"
//       />
//     </div>
//   );
// }
