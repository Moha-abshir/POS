import crypto from 'crypto';
import { AppError } from './AppError';

// Use a fallback random key for testing if not provided, but in production it MUST be provided
// Key should be exactly 32 bytes (64 hex characters) for aes-256-cbc. 
// For simplicity, if the string is less than 32 bytes, we hash it to get 32 bytes.
const rawKey = process.env.ENCRYPTION_KEY;
const ENCRYPTION_KEY = crypto.createHash('sha256').update(String(rawKey)).digest();

const IV_LENGTH = 16; 

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
  try {
    const textParts = text.split(':');
    const ivHex = textParts.shift();
    if (!ivHex) throw new AppError('Invalid encrypted text format', 400);
    
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new AppError(
      "Decryption failed. This usually happens if the server's ENCRYPTION_KEY was changed. Please go to Settings > M-Pesa Accounts and re-enter/re-save your API credentials (Consumer Key, Consumer Secret, and Passkey) to update them.",
      400
    );
  }
}
