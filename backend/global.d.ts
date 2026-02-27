// // backend/src/types/global.d.ts
// import { AuthUser } from './src/types/globalTypes';

// // -----------------------------
// // 1. Розширення Express.Request
// // -----------------------------

// declare global {
//   namespace Express {
//     interface Request {
//       user?: AuthUser;
//       tenant?: { expertId: string };
//     }
//   }
// }

// // -----------------------------
// // 2. Модулі CSS/SCSS
// // -----------------------------
// declare module '*.css';
// declare module '*.scss';

// // -----------------------------
// // 3. Глобальні властивості Window
// // -----------------------------
// export interface Window {
//   google?: {
//     accounts: {
//       oauth2: {
//         initTokenClient: (opts: {
//           client_id: string;
//           scope: string;
//           callback: (res: { access_token?: string }) => void;
//         }) => {
//           requestAccessToken: () => void;
//         };
//       };
//     };
//   };
//   Telegram?: any;
// }

// // -----------------------------
// // 4. Щоб TS бачив цей файл як модуль
// // -----------------------------
// export {};