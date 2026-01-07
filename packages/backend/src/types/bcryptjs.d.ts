
// packages/backend/bcryptjs.d.ts
declare module 'bcryptjs' {
  export function hash(s: string, salt: number): Promise<string>;
  export function compare(s: string, hash: string): Promise<boolean>;
  export function genSalt(rounds?: number): Promise<string>;
  export function hashSync(s: string, salt: number): string;
  export function compareSync(s: string, hash: string): boolean;
  export function genSaltSync(rounds?: number): string;
}

// declare module 'bcryptjs' {
//   export function hash(data: string, saltRounds: number): Promise<string>;
//   export function compare(data: string, encrypted: string): Promise<boolean>;
// }
