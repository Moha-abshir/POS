import crypto from 'crypto';

// Use a fallback random key for testing if not provided, but in production it MUST be provided
// Key should be exactly 32 bytes (64 hex characters) for aes-256-cbc. 
// For simplicity, if the string is less than 32 bytes, we hash it to get 32 bytes.
const rawKey = process.env.ENCRYPTION_KEY || 'default-secret-key-change-in-prod';
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
  const textParts = text.split(':');
  const ivHex = textParts.shift();
  if (!ivHex) throw new Error('Invalid encrypted text format');
  
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
