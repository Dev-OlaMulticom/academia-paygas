import { useEffect, useState } from "react";
import { clearRolePermissionsCache } from "../auth/casl/ability";
import { PERSONAS } from "../data/constants";
import { api } from "../lib/api";
import { resetEncryptionKey } from "../lib/crypto";

export interface User {
	id?: string;
	role: string;
	email: string;
	nome?: string;
	xp?: number;
	gestorId?: string | null;
}

function getStoredUser(): User | null {
	try {
		const stored = localStorage.getItem("user");
		const token = localStorage.getItem("token");
		if (stored && token) {
			const userData = JSON.parse(stored);
			api.setToken(token);
			return userData;
		}
	} catch {}
	return null;
}

export function useAuth() {
	const [user, setUser] = useState<User | null>(getStoredUser);
	const [xp, setXp] = useState(() => {
		const u = getStoredUser();
		return u?.xp || 0;
	});
	const [checking, setChecking] = useState(true);

	useEffect(() => {
		const stored = localStorage.getItem("token");
		if (!stored) {
			setChecking(false);
			return;
		}
		api
			.getMe()
			.then((userData: any) => {
				if (userData) {
					setUser(userData);
					setXp(userData.xp || 0);
					localStorage.setItem("user", JSON.stringify(userData));
				}
			})
			.catch((error) => {
				const msg = error instanceof Error ? error.message : String(error);
				if (msg.includes("HTTP 401") || msg.includes("HTTP 403") || msg.includes("Token")) {
					setUser(null);
					setXp(0);
					localStorage.removeItem("user");
					localStorage.removeItem("token");
					api.logout();
				}
			})
			.finally(() => setChecking(false));
	}, []);

	const handleLogin = async (userData: User, token: string) => {
		setUser(userData);
		localStorage.setItem("user", JSON.stringify(userData));
		api.setToken(token);
		setXp(userData.xp || 0);
		resetEncryptionKey();
	};

	const handleLogout = async () => {
		setUser(null);
		localStorage.removeItem("user");
		api.logout();
		resetEncryptionKey();
		clearRolePermissionsCache();
	};

	const persona = user ? PERSONAS[user.role as keyof typeof PERSONAS] : null;
	const isAuthenticated = !!user;

	return {
		user,
		persona,
		xp,
		isAuthenticated: !!user,
		checking,
		handleLogin,
		handleLogout,
	};
}
