import crypto from "node:crypto";
import logger from "../lib/logger";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const ITERATIONS = 100000;
const KEY_LENGTH = 32;
const SALT_LENGTH = 64;
const AUTH_TAG_LENGTH = 16;

let DYNAMIC_ENCRYPTION_KEY: string;

function getEncryptionKey(): string {
	if (!DYNAMIC_ENCRYPTION_KEY) {
		const key = process.env.ENCRYPTION_KEY;
		if (!key || key.length < 32) {
			logger.error("ENCRYPTION_KEY is required and must be at least 32 characters");
			process.exit(1);
		}
		DYNAMIC_ENCRYPTION_KEY = key;
	}
	return DYNAMIC_ENCRYPTION_KEY;
}

// Export getter for auth route to provide to authenticated clients
export function getServerEncryptionKey(): string {
	return getEncryptionKey();
}

function deriveKey(salt: Buffer): Buffer {
	return crypto.pbkdf2Sync(getEncryptionKey(), salt, ITERATIONS, KEY_LENGTH, "sha512");
}

export function decryptSync(encryptedData: string): string {
	const combined = Buffer.from(encryptedData, "base64");
	const salt = combined.subarray(0, SALT_LENGTH);
	const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
	const dataWithTag = combined.subarray(SALT_LENGTH + IV_LENGTH);
	const data = dataWithTag.subarray(0, dataWithTag.length - AUTH_TAG_LENGTH);
	const authTag = dataWithTag.subarray(dataWithTag.length - AUTH_TAG_LENGTH);

	const key = deriveKey(salt);
	const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
	decipher.setAuthTag(authTag);
	const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
	return decrypted.toString("utf8");
}

export function encryptSync(text: string): string {
	const salt = crypto.randomBytes(SALT_LENGTH);
	const iv = crypto.randomBytes(IV_LENGTH);
	const key = deriveKey(salt);

	const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
	const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
	const authTag = cipher.getAuthTag();

	const combined = Buffer.concat([salt, iv, encrypted, authTag]);
	return combined.toString("base64");
}
