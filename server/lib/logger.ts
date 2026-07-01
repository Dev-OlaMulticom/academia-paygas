import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

const baseLogger = pino({
	level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
	transport: isDev
		? {
				target: "pino-pretty",
				options: { colorize: true, translateTime: "SYS:standard", ignore: "pid,hostname" },
			}
		: undefined,
	formatters: {
		level(label: string) {
			return { level: label };
		},
	},
	timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Console-compatible logger wrapper over Pino.
 * Supports both console-style: logger.error('[MSG]', err)
 * and Pino-style: logger.error({ err }, '[MSG]')
 *
 * Error objects are serialized under the `err` key for proper stack trace handling.
 */
function buildArgs(args: unknown[]): Record<string, unknown> | undefined {
	if (args.length === 0) return undefined;
	if (args.length === 1) {
		const arg = args[0];
		if (arg instanceof Error) return { err: arg };
		if (typeof arg === "object" && arg !== null) return arg as Record<string, unknown>;
		return { extras: arg };
	}
	// Multiple args: first arg is likely context, rest are values
	const [first, ...rest] = args;
	if (first instanceof Error) return { err: first, extras: rest.length === 1 ? rest[0] : rest };
	if (typeof first === "object" && first !== null)
		return { ...(first as Record<string, unknown>), extras: rest.length === 1 ? rest[0] : rest };
	return { extras: args };
}

const logger = {
	info(msg: string, ...args: unknown[]): void {
		const obj = buildArgs(args);
		if (obj) baseLogger.info(obj, msg);
		else baseLogger.info(msg);
	},
	warn(msg: string, ...args: unknown[]): void {
		const obj = buildArgs(args);
		if (obj) baseLogger.warn(obj, msg);
		else baseLogger.warn(msg);
	},
	error(msg: string, ...args: unknown[]): void {
		const obj = buildArgs(args);
		if (obj) baseLogger.error(obj, msg);
		else baseLogger.error(msg);
	},
	debug(msg: string, ...args: unknown[]): void {
		const obj = buildArgs(args);
		if (obj) baseLogger.debug(obj, msg);
		else baseLogger.debug(msg);
	},
	fatal(msg: string, ...args: unknown[]): void {
		const obj = buildArgs(args);
		if (obj) baseLogger.fatal(obj, msg);
		else baseLogger.fatal(msg);
	},
};

export default logger;
