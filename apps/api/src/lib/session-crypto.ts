import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const version = "v1";
const ivLength = 12;

/** Encrypts and authenticates a JSON payload with AES-256-GCM. The first secret encrypts; all secrets may decrypt (rotation). */
export function sealJson(value: unknown, secrets: string[]): string {
  const iv = randomBytes(ivLength);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(secrets[0]), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [version, iv.toString("base64url"), ciphertext.toString("base64url"), tag.toString("base64url")].join(".");
}

export function unsealJson<T>(sealed: string | undefined, secrets: string[]): T | undefined {
  if (!sealed || sealed.length > 8192) return undefined;
  const [prefix, ivPart, dataPart, tagPart, ...rest] = sealed.split(".");
  if (prefix !== version || !ivPart || !dataPart || !tagPart || rest.length) return undefined;
  const iv = Buffer.from(ivPart, "base64url");
  const data = Buffer.from(dataPart, "base64url");
  const tag = Buffer.from(tagPart, "base64url");
  if (iv.length !== ivLength || tag.length !== 16) return undefined;
  for (const secret of secrets) {
    try {
      const decipher = createDecipheriv("aes-256-gcm", deriveKey(secret), iv);
      decipher.setAuthTag(tag);
      const plaintext = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
      return JSON.parse(plaintext) as T;
    } catch {
      // try the next (previous) secret
    }
  }
  return undefined;
}

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(`evolvefit-session:${secret}`).digest();
}
