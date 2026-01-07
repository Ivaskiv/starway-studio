// // packages/frontend/src/components/FunnelEditor/FunnelEditor.tsx

// import { useState } from 'react';
// import { useAppDispatch, useAppSelector } from '../../store/hooks';
// import { 
//   selectActiveFunnel, 
//   updateFunnel,
//   addStep,
//   updateStep,
//   deleteStep,
//   reorderSteps
// } from '../../store/slices/funnelSlice';
// import StepEditor from './StepEditor';
// import StepList from './StepList';
// import type { FunnelStep, StepType } from '@starway-studio/shared/types';
// import { Button } from '@starway-studio/shared';
// import { Plus } from 'lucide-react';

// const FunnelEditor = () => {
//   const dispatch = useAppDispatch();
//   const activeFunnel = useAppSelector(selectActiveFunnel);
//   const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

//   if (!activeFunnel) {
//     return (
//       <div className="flex items-center justify-center h-full">
//         <p className="text-gray-500">Виберіть воронку для редагування</p>
//       </div>
//     );
//   }

//   const handleAddStep = (type: StepType) => {
//     const newStep: Omit<FunnelStep, 'id'> = {
//       type,
//       name: `Новий крок: ${type}`,
//       order: activeFunnel.steps.length,
//       config: {},
//       conditions: [],
//       isActive: true
//     };

//     dispatch(addStep({ funnelId: activeFunnel.id, step: newStep }));
//   };

//   const handleUpdateStep = (stepId: string, updates: Partial<FunnelStep>) => {
//     dispatch(updateStep({ 
//       funnelId: activeFunnel.id, 
//       stepId, 
//       updates 
//     }));
//   };

//   const handleDeleteStep = (stepId: string) => {
//     dispatch(deleteStep({ 
//       funnelId: activeFunnel.id, 
//       stepId 
//     }));
//     if (selectedStepId === stepId) {
//       setSelectedStepId(null);
//     }
//   };

//   const handleReorderSteps = (startIndex: number, endIndex: number) => {
//     dispatch(reorderSteps({ 
//       funnelId: activeFunnel.id, 
//       startIndex, 
//       endIndex 
//     }));
//   };

//   const selectedStep = activeFunnel.steps.find(s => s.id === selectedStepId);

//   return (
//     <div className="flex h-full">
//       {/* Ліва панель - список кроків */}
//       <div className="w-80 border-r border-gray-200 bg-gray-50 overflow-y-auto">
//         <div className="p-4 border-b border-gray-200 bg-white">
//           <h2 className="text-lg font-semibold text-gray-900">
//             {activeFunnel.name}
//           </h2>
//           <p className="text-sm text-gray-500 mt-1">
//             {activeFunnel.steps.length} кроків
//           </p>
//         </div>

//         <StepList
//           steps={activeFunnel.steps}
//           selectedStepId={selectedStepId}
//           onSelectStep={setSelectedStepId}
//           onReorder={handleReorderSteps}
//           onDelete={handleDeleteStep}
//         />

//         <div className="p-4 border-t border-gray-200">
//           <Button
//             onClick={() => handleAddStep('message')}
//             variant="primary"
//             size="md"
//             className="w-full"
//           >
//             <Plus className="w-4 h-4 mr-2" />
//             Додати крок
//           </Button>
//         </div>
//       </div>

//       {/* Права панель - редактор кроку */}
//       <div className="flex-1 overflow-y-auto">
//         {selectedStep ? (
//           <StepEditor
//             step={selectedStep}
//             onUpdate={(updates) => handleUpdateStep(selectedStep.id, updates)}
//             onDelete={() => handleDeleteStep(selectedStep.id)}
//           />
//         ) : (
//           <div className="flex items-center justify-center h-full">
//             <div className="text-center">
//               <p className="text-gray-500 mb-4">
//                 Виберіть крок для редагування або додайте новий
//               </p>
//               <Button
//                 onClick={() => handleAddStep('message')}
//                 variant="primary"
//                 size="lg"
//               >
//                 <Plus className="w-5 h-5 mr-2" />
//                 Створити перший крок
//               </Button>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default FunnelEditor;