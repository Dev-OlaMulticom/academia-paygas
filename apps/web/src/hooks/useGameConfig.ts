import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { XP_PER_LEVEL } from "../lib/constants";

export interface LevelThreshold {
	level: number;
	xp: number;
}

export interface GameConfig {
	xpPerLevel: number;
	levels: LevelThreshold[];
}

const FALLBACK: GameConfig = { xpPerLevel: XP_PER_LEVEL, levels: [] };

let cached: GameConfig | null = null;
let inflight: Promise<GameConfig> | null = null;

function fetchGameConfig(): Promise<GameConfig> {
	if (cached) return Promise.resolve(cached);
	if (!inflight) {
		inflight = api
			.getPublicConfig()
			.then((config) => {
				const xpPerLevelValue = Number(config?.xpPerLevel);
				const levels: LevelThreshold[] = Array.isArray(config?.levels)
					? config.levels
							.map((l: any) => ({ level: Number(l?.level), xp: Number(l?.xp) }))
							.filter((l: LevelThreshold) => Number.isFinite(l.level) && Number.isFinite(l.xp))
							.sort((a: LevelThreshold, b: LevelThreshold) => a.xp - b.xp)
					: [];
				cached = { xpPerLevel: xpPerLevelValue > 0 ? xpPerLevelValue : XP_PER_LEVEL, levels };
				return cached;
			})
			.catch(() => FALLBACK);
	}
	return inflight;
}

/** Invalida o cache local — chamar após salvar configs de XP/níveis. */
export function invalidateGameConfig() {
	cached = null;
	inflight = null;
}

/** Configuração de gamificação — vem de GET /api/public/config; cai no fallback local se a API falhar. */
export function useGameConfig(): GameConfig {
	const [config, setConfig] = useState<GameConfig>(cached ?? FALLBACK);

	useEffect(() => {
		let active = true;
		fetchGameConfig().then((value) => {
			if (active) setConfig(value);
		});
		return () => {
			active = false;
		};
	}, []);

	return config;
}

export function useXpPerLevel(): number {
	return useGameConfig().xpPerLevel;
}

/**
 * Nível a partir do XP acumulado. Aceita o GameConfig (níveis configurados)
 * ou um número (fórmula linear legada). Sem níveis configurados: XP ÷ xpPerLevel + 1.
 */
export function levelForXp(xp: number, config: GameConfig | number = XP_PER_LEVEL): number {
	if (typeof config === "number") return Math.floor(xp / config) + 1;
	if (config.levels.length > 0) {
		let level = 1;
		for (const t of config.levels) {
			if (xp >= t.xp && t.level > level) level = t.level;
		}
		return level;
	}
	return Math.floor(xp / config.xpPerLevel) + 1;
}

/**
 * Faixa de progresso do nível atual. `nextLevelXp` é null quando o usuário
 * já está no nível máximo configurado (sem próximo nível definido).
 */
export function levelProgress(
	xp: number,
	config: GameConfig,
): { level: number; currentLevelXp: number; nextLevelXp: number | null; progressPercent: number } {
	const level = levelForXp(xp, config);
	if (config.levels.length === 0) {
		const currentLevelXp = (level - 1) * config.xpPerLevel;
		const nextLevelXp = level * config.xpPerLevel;
		const progressPercent = Math.min(((xp - currentLevelXp) / config.xpPerLevel) * 100, 100);
		return { level, currentLevelXp, nextLevelXp, progressPercent };
	}
	const currentLevelXp = config.levels.filter((t) => xp >= t.xp).at(-1)?.xp ?? 0;
	const nextLevelXp = config.levels.find((t) => t.xp > xp)?.xp ?? null;
	const progressPercent =
		nextLevelXp === null ? 100 : Math.min(((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100, 100);
	return { level, currentLevelXp, nextLevelXp, progressPercent };
}
