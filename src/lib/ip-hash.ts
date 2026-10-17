import "server-only";
import { createHash } from "node:crypto";

/** Client IP from proxy headers (Vercel sets x-forwarded-for). Never stored in plain text. */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

export function hashIp(ip: string, salt = process.env.IP_HASH_SALT): string {
  if (!salt) throw new Error("IP_HASH_SALT is not set");
  return createHash("sha256")
    .update(ip + salt)
    .digest("hex");
}
