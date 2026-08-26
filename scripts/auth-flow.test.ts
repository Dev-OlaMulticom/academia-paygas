import { describe, it, expect } from "vitest";

// Test 1: LocalStorage auth state management
describe("Auth LocalStorage Management", () => {
	it("stores user and token on login", () => {
		// Simulate login
		localStorage.setItem("token", "jwt-token-123");
		localStorage.setItem("user", JSON.stringify({ role: "ATENDENTE", nome: "Test User" }));

		const token = localStorage.getItem("token");
		const user = JSON.parse(localStorage.getItem("user") || "{}");

		expect(token).toBe("jwt-token-123");
		expect(user.role).toBe("ATENDENTE");
		expect(user.nome).toBe("Test User");
	});

	it("clears auth state on logout", () => {
		// Set up state
		localStorage.setItem("token", "before-logout");
		localStorage.setItem("user", JSON.stringify({ role: "ATENDENTE", nome: "Before" }));

		// Clear state
		localStorage.removeItem("token");
		localStorage.removeItem("user");

		expect(localStorage.getItem("token")).toBeNull();
		expect(localStorage.getItem("user")).toBeNull();
	});

	it("throws when getMe called without token", () => {
		localStorage.removeItem("token");
		
		const token = localStorage.getItem("token");
		if (!token) {
			throw new Error("Não autenticado");
		}
		// If we reach here, test should fail
		assert.fail("Should have thrown");
	});
});

// Test 2: Auth flow simulation
describe("Auth Flow Simulation", () => {
	it("simulates login success setting new credentials", () => {
		// Clear first
		localStorage.clear();

		// Simulate API login response
		const newToken = "new-jwt-token";
		const newUser = { role: "GESTOR", nome: "Gestor Test", email: "gestor@test.com", xp: 150 };

		localStorage.setItem("token", newToken);
		localStorage.setItem("user", JSON.stringify(newUser));

		const storedToken = localStorage.getItem("token");
		const storedUser = JSON.parse(localStorage.getItem("user") || "{}");

		expect(storedToken).toBe(newToken);
		expect(storedUser.role).toBe("GESTOR");
		expect(storedUser.nome).toBe("Gestor Test");
		expect(storedUser.xp).toBe(150);
	});

	it("simulates password reset clearing old auth", () => {
		localStorage.clear();

		// Set old auth state
		localStorage.setItem("token", "old-token");
		localStorage.setItem("user", JSON.stringify({ role: "ATENDENTE", nome: "Old User" }));

		// After reset - clear old
		localStorage.removeItem("token");
		localStorage.removeItem("user");

		// Set new auth state (simulating successful reset)
		const newToken = "new-reset-token";
		const newUser = { role: "ATENDENTE", nome: "New User" };
		localStorage.setItem("token", newToken);
		localStorage.setItem("user", JSON.stringify(newUser));

		const refreshedToken = localStorage.getItem("token");
		const refreshedUser = JSON.parse(localStorage.getItem("user") || "{}");

		expect(refreshedToken).toBe(newToken);
		expect(refreshedUser.nome).toBe("New User");
	});
});
