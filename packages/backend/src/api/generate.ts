// // starway-studio/packages/backend/src/api/generate.ts
// import OpenAI from 'openai'

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY!
// })

// export async function generateWithAI(
//   _field: string,
//   prompt: string,
//   _context?: any
// ): Promise<string> {
//   if (!prompt.trim()) {
//     throw new Error('Empty prompt')
//   }

//  if (!process.env.OPENAI_API_KEY) {
//     throw new Error('OPENAI_API_KEY is not configured');
//   }

//   try {
//     const completion = await openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.7,
//       max_tokens: 2000,
//       messages: [
//         {
//           role: 'user',
//           content: prompt
//         }
//       ]
//     });

//     const result = completion.choices[0]?.message?.content?.trim();

//     if (!result) {
//       throw new Error('AI returned empty response');
//     }

//     return result;

//   } catch (error: any) {
//     console.error('❌ OpenAI Error:', error.message);

//     if (error.status === 401) {
//       throw new Error('Invalid OPENAI_API_KEY');
//     }
//     if (error.status === 429) {
//       throw new Error('Rate limit exceeded');
//     }

//     throw new Error(`AI generation failed: ${error.message}`);
//   }
// }