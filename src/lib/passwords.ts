import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt$${salt.toString("base64")}$${derivedKey.toString("base64")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, encodedSalt, encodedKey] = storedHash.split("$");
  if (algorithm !== "scrypt" || !encodedSalt || !encodedKey) return false;

  try {
    const salt = Buffer.from(encodedSalt, "base64");
    const expectedKey = Buffer.from(encodedKey, "base64");
    if (expectedKey.length !== KEY_LENGTH) return false;
    const actualKey = (await scrypt(password, salt, expectedKey.length)) as Buffer;
    return timingSafeEqual(actualKey, expectedKey);
  } catch {
    return false;
  }
}
