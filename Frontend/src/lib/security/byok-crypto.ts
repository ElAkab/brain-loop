import "server-only";

import crypto from "crypto";

const ENCRYPTION_VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_BYTE_LENGTH = 12;

function getEncryptionSecret(): string {
	const secret = process.env.BYOK_ENCRYPTION_SECRET;
	if (!secret) {
		throw new Error(
			"BYOK encryption is misconfigured. Missing BYOK_ENCRYPTION_SECRET.",
		);
	}
	return secret;
}

function getAesKey(secret: string): Buffer {
	return crypto.createHash("sha256").update(secret).digest();
}

export function getKeyLast4(apiKey: string): string {
	const trimmed = apiKey.trim();
	if (trimmed.length < 4) return trimmed;
	return trimmed.slice(-4);
}

export function encryptOpenRouterKey(plainApiKey: string): string {
	const secret = getEncryptionSecret();
	const key = getAesKey(secret);
	const iv = crypto.randomBytes(IV_BYTE_LENGTH);
	const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

	const encrypted = Buffer.concat([
		cipher.update(plainApiKey, "utf8"),
		cipher.final(),
	]);
	const authTag = cipher.getAuthTag();

	return [
		ENCRYPTION_VERSION,
		iv.toString("base64"),
		authTag.toString("base64"),
		encrypted.toString("base64"),
	].join(":");
}

export function decryptOpenRouterKey(payload: string): string {
	const secret = getEncryptionSecret();
	const [version, ivBase64, tagBase64, encryptedBase64] = payload.split(":");

	if (
		version !== ENCRYPTION_VERSION ||
		!ivBase64 ||
		!tagBase64 ||
		!encryptedBase64
	) {
		throw new Error("Invalid encrypted BYOK payload format.");
	}

	const key = getAesKey(secret);
	const iv = Buffer.from(ivBase64, "base64");
	const authTag = Buffer.from(tagBase64, "base64");
	const encrypted = Buffer.from(encryptedBase64, "base64");

	const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
	decipher.setAuthTag(authTag);

	const decrypted = Buffer.concat([
		decipher.update(encrypted),
		decipher.final(),
	]);

	return decrypted.toString("utf8");
}
