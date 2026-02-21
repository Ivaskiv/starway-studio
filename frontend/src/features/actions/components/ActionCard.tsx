// // frontend/src/features/actions/components/ActionCard.tsx
// // Окремий крок у воронці
// import { cn } from '@/lib/utils';
// import { ReactNode } from 'react';

// interface ActionCardProps {
//   title: string;
//   description?: string;
//   icon?: ReactNode;

//   isActive?: boolean;
//   isDisabled?: boolean;

//   onClick?: () => void;
// }

// export default function ActionCard({
//   title,
//   description,
//   icon,
//   isActive = false,
//   isDisabled = false,
//   onClick,
// }: ActionCardProps) {
//   return (
//     <button
//       type="button"
//       disabled={isDisabled}
//       onClick={onClick}
//       className={cn(
//         'w-full text-lft rounded-xl border p-4 transition',
//         'bg-slate-900/70 border-white/10 hover:border-orange-500/40',
//         isActive && 'border-orange-500 bg-orange-500/10',
//         isDisabled && 'opacity-50 cursor-not-allowed hover:border-white/10',
//       )}
//     >
//       <div className="flex items-start gap-3">
//         {icon && (
//           <div className="shrink-0 w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400">
//             {icon}
//           </div>
//         )}

//         <div className="flex-1">
//           <h4 className="text-sm font-semibold text-white">{title}</h4>
//           {description && (
//             <p className="mt-1 text-xs text-white/60 leading-relaxed">
//               {description}
//             </p>
//           )}
//         </div>
//       </div>
//     </button>
//   );
// }
