import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

/**
 * Password hashing stays in the Node runtime so the foundation does not depend on
 * a native hashing package. The random salt is stored beside the derived hash.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;

  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, keyHex] = storedHash.split(':');

  if (!salt || !keyHex) {
    return false;
  }

  const storedKey = Buffer.from(keyHex, 'hex');

  if (storedKey.length !== KEY_LENGTH) {
    return false;
  }

  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;

  return timingSafeEqual(storedKey, derivedKey);
}
