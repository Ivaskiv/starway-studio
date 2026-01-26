// // frontend/src/components/funnel/stepConfigs/PaymentStepConfig.tsx

// import { CreditCard } from 'lucide-react';
// import { Input, Textarea, Select } from '@/ui';

// interface PaymentStepConfigProps {
//   config: any;
//   onChange: (config: any) => void;
// }

// export default function PaymentStepConfig({ config, onChange }: PaymentStepConfigProps) {
//   const handleChange = (field: string, value: string | number) => {
//     onChange({
//       ...config,
//       payment: {
//         ...config.payment,
//         [field]: value
//       }
//     });
//   };

//   return (
//     <div className="glass-card p-6 space-y-6">
//       <div className="flex items-center gap-3 mb-4">
//         <div className="icon-container-green w-10 h-10">
//           <CreditCard className="w-5 h-5 text-green-500" />
//         </div>
//         <div>
//           <h4 className="font-semibold text-white">Оплата</h4>
//           <p className="text-sm text-slate-400">WayForPay інтеграція</p>
//         </div>
//       </div>

//       <div className="grid grid-cols-2 gap-4">
//         <Input
//           label="Сума"
//           type="number"
//           placeholder="1200"
//           value={config.payment?.amount || ''}
//           onChange={(e) => handleChange('amount', parseFloat(e.target.value))}
//         />

//         <Select
//           label="Валюта"
//           options={[
//             { value: 'UAH', label: 'UAH (₴)' },
//             { value: 'USD', label: 'USD ($)' },
//             { value: 'EUR', label: 'EUR (€)' }
//           ]}
//           value={config.payment?.currency || 'UAH'}
//           onChange={(e) => handleChange('currency', e.target.value)}
//         />
//       </div>

//       <Textarea
//         label="Опис платежу"
//         placeholder="Підписка AI-Ментор на 1 місяць"
//         value={config.payment?.description || ''}
//         onChange={(e) => handleChange('description', e.target.value)}
//         rows={3}
//       />

//       <Select
//         label="Провайдер"
//         options={[
//           { value: 'wayforpay', label: 'WayForPay' },
//           { value: 'stripe', label: 'Stripe' },
//           { value: 'liqpay', label: 'LiqPay' },
//           { value: 'fondy', label: 'Fondy' }
//         ]}
//         value={config.payment?.provider || 'wayforpay'}
//         onChange={(e) => handleChange('provider', e.target.value)}
//       />

//       <Input
//         label="Success URL (необов'язково)"
//         placeholder="https://your-site.com/success"
//         value={config.payment?.successUrl || ''}
//         onChange={(e) => handleChange('successUrl', e.target.value)}
//       />

//       <Input
//         label="Cancel URL (необов'язково)"
//         placeholder="https://your-site.com/cancel"
//         value={config.payment?.cancelUrl || ''}
//         onChange={(e) => handleChange('cancelUrl', e.target.value)}
//       />
//     </div>
//   );
// }