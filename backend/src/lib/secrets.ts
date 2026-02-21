// backend/src/lib/secrets.ts
// fix code_x: encrypt/decrypt helpers for sensitive values (tokens, API keys) using AES-256-GCM.
import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const PREFIX = 'enc:v1';

function deriveKey(): Buffer {
  const seed =
    process.env.SECRETS_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    process.env.JWT_REFRESH_SECRET ||
    '';

  if (!seed) {
    throw new Error('Missing secrets encryption key. Set SECRETS_ENCRYPTION_KEY in env.');
  }

  return crypto.createHash('sha256').update(seed).digest();
}

export function encryptSecret(plainText: string): string {
  const input = String(plainText || '').trim();
  if (!input) return '';

  const key = deriveKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);

  const encrypted = Buffer.concat([cipher.update(input, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    PREFIX,
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':');
}

export function decryptSecret(payload: string): string {
  const raw = String(payload || '').trim();
  if (!raw) return '';

  const [prefix, ivB64, tagB64, dataB64] = raw.split(':');
  if (prefix !== PREFIX || !ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid encrypted secret format');
  }

  const key = deriveKey();
  const iv = Buffer.from(ivB64, 'base64url');
  const tag = Buffer.from(tagB64, 'base64url');
  const data = Buffer.from(dataB64, 'base64url');

  if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
    throw new Error('Invalid encrypted secret payload');
  }

  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}

