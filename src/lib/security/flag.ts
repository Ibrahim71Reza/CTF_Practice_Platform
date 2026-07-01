// src/lib/security/flag.ts
import crypto from "crypto";

export function normalizeFlag(flag: string, caseSensitive = true) {
  const trimmed = flag.trim();
  if (caseSensitive) {
    return trimmed;
  }
  return trimmed.toLowerCase();
}

export function generateFlagSalt() {
  return crypto.randomBytes(16).toString("hex");
}

export function hashFlag({
  flag,
  salt,
  caseSensitive = true,
}: {
  flag: string;
  salt: string;
  caseSensitive?: boolean;
}) {
  const secret = process.env.FLAG_HASH_SECRET;

  if (!secret) {
    throw new Error("FLAG_HASH_SECRET is missing from environment variables");
  }

  const normalizedFlag = normalizeFlag(flag, caseSensitive);

  return crypto
    .createHmac("sha256", `${secret}:${salt}`)
    .update(normalizedFlag)
    .digest("hex");
}