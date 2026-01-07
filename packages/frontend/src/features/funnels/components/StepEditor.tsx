// // packages/frontend/src/components/aIGenerator/StepEditor.tsx
// import React, { useState, useEffect } from 'react';
// import { AIGeneratorStep } from '@/pages/dashboard/AIGeneratorProvider';
// import { Button, Textarea } from '@/ui';

// interface StepEditorProps {
//   step: AIGeneratorStep;
//   onUpdate: (stepNumber: number, selectedVariant: string, customText?: string) => void;
//   onNext: () => void;
//   onPrevious: () => void;
//   isFirst: boolean;
//   isLast: boolean;
// }

// export const StepEditor: React.FC<StepEditorProps> = ({
//   step,
//   onUpdate,
//   onNext,
//   onPrevious,
//   isFirst,
//   isLast
// }) => {
//   // ... решта коду без змін
//   const [customText, setCustomText] = useState('');
//   const [selectedVariant, setSelectedVariant] = useState(
//     step.selectedVariant || step.variants[0] || ''
//   );

//   useEffect(() => {
//     if (step.customText) {
//       setCustomText(step.customText);
//     }
//     if (step.selectedVariant) {
//       setSelectedVariant(step.selectedVariant);
//     }
//   }, [step.stepNumber, step.customText, step.selectedVariant]);

//   const handleVariantSelect = (variant: string) => {
//     setSelectedVariant(variant);
//     setCustomText('');
//     onUpdate(step.stepNumber, variant);
//   };

//   const handleCustomTextChange = (text: string) => {
//     setCustomText(text);
//     onUpdate(step.stepNumber, selectedVariant, text);
//   };

//   const displayText = customText || selectedVariant;

//   return (
//     <div className="step-editor">
//       <div className="step-header">
//         <span className="step-number">Крок {step.stepNumber}</span>
//         <h3 className="step-title">{step.title}</h3>
//         <p className="step-description">{step.description}</p>
//       </div>

//       <div className="step-content">
//         <div className="variants-section">
//           <h4>AI-згенеровані варіанти:</h4>
//           <div className="variants-list">
//             {step.variants.map((variant, index) => (
//               <div
//                 key={index}
//                 className={`variant-card ${selectedVariant === variant ? 'selected' : ''}`}
//                 onClick={() => handleVariantSelect(variant)}
//               >
//                 <div className="variant-number">{index + 1}</div>
//                 <div className="variant-text">{variant}</div>
//               </div>
//             ))}
//           </div>
//         </div>

//         <div className="custom-section">
//           <h4>Або введи свій варіант:</h4>
//           <Textarea
//             className="custom-textarea"
//             value={customText}
//             onChange={(e) => handleCustomTextChange(e.target.value)}
//             placeholder="Напиши власний варіант або відредагуй вибраний..."
//             rows={4}
//           />
//         </div>

//         <div className="preview-section">
//           <h4>Вибраний текст:</h4>
//           <div className="preview-box">{displayText || 'Виберіть варіант або введіть свій текст'}</div>
//         </div>
//       </div>

//       <div className="step-navigation">
//         <Button
//           className="btn-secondary"
//           onClick={onPrevious}
//           disabled={isFirst}
//         >
//           ← Попередній крок
//         </Button>
        
//         <Button
//           className="btn-primary"
//           onClick={onNext}
//           disabled={!displayText}
//         >
//           {isLast ? 'Зберегти воронку' : 'Наступний крок →'}
//         </Button>
//       </div>
//     </div>
//   );
// };