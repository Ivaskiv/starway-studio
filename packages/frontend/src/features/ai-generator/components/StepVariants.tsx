// // packages/frontend/src/features/ai-generator/components/StepVariants.tsx
// import { useState } from 'react'

// interface Props {
//   stepNumber: number
//   userInput: string
//   context: Record<string, string>
//   onConfirm: (selected: string) => void
//   generateStepVariants: any
// }

// export function StepVariants({
//   stepNumber,
//   userInput,
//   context,
//   onConfirm,
//   generateStepVariants,
// }: Props) {
//   const [variants, setVariants] = useState<string[]>([])
//   const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

//   const onGenerate = async () => {
//     const base =
//       selectedIndex !== null ? variants[selectedIndex] : userInput

//     const res = await generateStepVariants({
//       stepNumber,
//       userInput: base,
//       context,
//     }).unwrap()

//     setVariants(prev => [...prev, ...res.variants])
//     setSelectedIndex(null) // ❗️скидаємо вибір після генерації
//   }

//   return (
//     <div className="space-y-4">
//       {variants.map((v, i) => (
//         <VariantCard
//           key={i}
//           text={v}
//           active={selectedIndex === i}
//           onClick={() => setSelectedIndex(i)}
//         />
//       ))}

//       <div className="flex gap-2">
//         <Button onClick={onGenerate}>Згенерувати ще</Button>

//         <Button
//           disabled={selectedIndex === null}
//           onClick={() => onConfirm(variants[selectedIndex!])}
//         >
//           Далі
//         </Button>
//       </div>
//     </div>
//   )
// }
