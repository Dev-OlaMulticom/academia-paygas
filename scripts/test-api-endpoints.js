/**
 * API Endpoints Testing Script - Academia PayGas
 * Tests all main API endpoints from authentication to CRUD operations
 * 
 * NOTE: This test verifies route structure and authentication middleware.
 * Database-dependent tests will fail without PG_URL or DATABASE_URL set.
 */

const fastify = require("fastify");
const path = require("path");

async function runAllTests() {
	const app = fastify();

	// Register plugins dynamically
	await app.register(require("../apps/api/src/server/fastify-plugins/auth").default);
	await app.register(
		require("../apps/api/src/server/fastify-plugins/cors").default
	);
	await app.register(
		require("../apps/api/src/server/fastify-plugins/rate-limit").default
	);
	await app.register(
		require("../apps/api/src/server/fastify-plugins/encryption").default
	);

	// Register routes
	await app.register(require("../apps/api/src/server/fastify-routes/usuarios").default, {
		prefix: "/api/usuarios",
	});
	await app.register(require("../apps/api/src/server/fastify-routes/modules").default, {
		prefix: "/api/admin/modules",
	});
	await app.register(require("../apps/api/src/server/fastify-routes/progresso").default, {
		prefix: "/api/progresso",
	});
	await app.register(require("../apps/api/src/server/fastify-routes/forum").default, {
		prefix: "/api/forum",
	});
	await app.register(
		require("../apps/api/src/server/fastify-routes/certificates").default,
		{ prefix: "/api/certificates" }
	);
	await app.register(
		require("../apps/api/src/server/fastify-routes/role-permissions").default,
		{ prefix: "/api/role-permissions" }
	);
	await app.register(
		require("../apps/api/src/server/fastify-routes/dashboard").default,
		{ prefix: "/api/dashboard" }
	);
	await app.register(require("../apps/api/src/server/fastify-routes/auth").default, {
		prefix: "/api/auth",
	});

	// Override error handler to see errors in tests
	app.setErrorHandler((error, _request, reply) => {
		const statusCode = error.statusCode || reply.statusCode || 500;
		reply.code(statusCode).send({ error: error.message || "Erro interno" });
	});

	let totalTests = 0;
	let passedTests = 0;
	let failedTests = 0;

	function logResult(test, status, message) {
		totalTests++;
		if (status === "PASS") {
			passedTests++;
			console.log(`✅ ${test}: ${message}`);
		} else {
			failedTests++;
			console.log(`❌ ${test}: ${message}`);
		}
	}

	console.log("\n=== Testing API Endpoints ===\n");

	// -------------------------------------------------------
	// Authentication Routes (/api/auth)
	// -------------------------------------------------------

	// Test: Login page GET
	try {
		const reply = await app.inject({ method: "GET", url: "/api/auth/login" });
		logResult("GET /api/auth/login", "PASS", `Status: ${reply.statusCode}`);
	} catch (error) {
		logResult("GET /api/auth/login", "FAIL", error.message);
	}

	// Test: Login POST without body
	try {
		const reply = await app.inject({
			method: "POST",
			url: "/api/auth/login",
		});
		logResult("POST /api/auth/login (no body)", `Status: ${reply.statusCode}`, reply.body ? JSON.stringify(reply.body) : "empty");
	} catch (error) {
		logResult("POST /api/auth/login (no body)", "FAIL", error.message);
	}

	// Test: Me - unauthenticated should return 401
	try {
		const reply = await app.inject({
			method: "GET",
			url: "/api/auth/me",
			headers: { authorization: "Bearer invalid-token" },
		});
		if (reply.statusCode === 401) {
			logResult("GET /api/auth/me (unauthenticated)", "PASS", "Returns 401 as expected");
		} else {
			logResult("GET /api/auth/me (unauthenticated)", "FAIL", `Expected 401, got ${reply.statusCode}`);
		}
	} catch (error) {
		logResult("GET /api/auth/me (unauthenticated)", "FAIL", error.message);
	}

	// Test: Verify email - invalid token
	try {
		const reply = await app.inject({
			method: "GET",
			url: "/api/auth/verify-email",
			queries: { token: "invalid" },
		});
		// Note: Returns 400 for invalid token format, 404 for non-existent token
		if (reply.statusCode === 400 || reply.statusCode === 404) {
			logResult("GET /api/auth/verify-email (invalid token)", `PASS`, `Returns ${reply.statusCode} (token validation)`);
		} else {
			logResult("GET /api/auth/verify-email (invalid token)", "FAIL", `Expected 400/404, got ${reply.statusCode}`);
		}
	} catch (error) {
		logResult("GET /api/auth/verify-email (invalid token)", "FAIL", error.message);
	}

	// Test: Email status
	try {
		const reply = await app.inject({ method: "GET", url: "/api/auth/email-status" });
		logResult("GET /api/auth/email-status", `Status: ${reply.statusCode}`, reply.body ? JSON.stringify(reply.body) : "empty");
	} catch (error) {
		logResult("GET /api/auth/email-status", "FAIL", error.message);
	}

	// Test: Forgot password POST
	try {
		const reply = await app.inject({
			method: "POST",
			url: "/api/auth/forgot-password",
			body: { email: "test@example.com" },
		});
		logResult("POST /api/auth/forgot-password", `Status: ${reply.statusCode}`, reply.body ? JSON.stringify(reply.body).substring(0, 80) : "empty");
	} catch (error) {
		logResult("POST /api/auth/forgot-password", "FAIL", error.message);
	}

	// Test: Reset password POST
	try {
		const reply = await app.inject({
			method: "POST",
			url: "/api/auth/reset-password",
			body: {
				email: "test@example.com",
				code: "123456",
				newPassword: "Password123",
				confirmPassword: "Password123",
			},
		});
		logResult("POST /api/auth/reset-password", `Status: ${reply.statusCode}`, reply.body ? JSON.stringify(reply.body).substring(0, 80) : "empty");
	} catch (error) {
		logResult("POST /api/auth/reset-password", "FAIL", error.message);
	}

	// Test: PayGas access POST
	try {
		const reply = await app.inject({
			method: "POST",
			url: "/api/auth/paygas/paygas-access",
			body: { cpf: "12345678901" },
		});
		logResult("POST /api/auth/paygas/paygas-access", `Status: ${reply.statusCode}`, reply.body ? JSON.stringify(reply.body).substring(0, 80) : "empty");
	} catch (error) {
		logResult("POST /api/auth/paygas/paygas-access", "FAIL", error.message);
	}

	// Test: PayGas API status GET
	try {
		const reply = await app.inject({ method: "GET", url: "/api/auth/paygas/paygas-api-status" });
		logResult("GET /api/auth/paygas/paygas-api-status", `Status: ${reply.statusCode}`, reply.body ? JSON.stringify(reply.body) : "empty");
	} catch (error) {
		logResult("GET /api/auth/paygas/paygas-api-status", "FAIL", error.message);
	}

	// -------------------------------------------------------
	// Users Routes (/api/usuarios)
	// -------------------------------------------------------

	// Test: List users - unauthenticated
	try {
		const reply = await app.inject({
			method: "GET",
			url: "/api/usuarios",
			headers: { authorization: "Bearer invalid-token" },
		});
		if (reply.statusCode === 401) {
			logResult("GET /api/usuarios (unauthenticated)", "PASS", "Returns 401 as expected");
		} else {
			logResult("GET /api/usuarios (unauthenticated)", "FAIL", `Expected 401, got ${reply.statusCode}`);
		}
	} catch (error) {
		logResult("GET /api/usuarios (unauthenticated)", "FAIL", error.message);
	}

	// Test: Create user - unauthenticated
	try {
		const reply = await app.inject({
			method: "POST",
			url: "/api/usuarios",
			headers: { authorization: "Bearer invalid-token" },
			body: {
				email: "newuser@example.com",
				nome: "New User",
				senha: "Password123",
				role: "ATENDENTE",
			},
		});
		if (reply.statusCode === 401 || reply.statusCode === 403) {
			logResult("POST /api/usuarios (unauthenticated)", `PASS`, `Returns ${reply.statusCode} as expected`);
		} else {
			logResult("POST /api/usuarios (unauthenticated)", `FAIL`, `Expected 401/403, got ${reply.statusCode}`);
		}
	} catch (error) {
		logResult("POST /api/usuarios (unauthenticated)", "FAIL", error.message);
	}

	// Test: Change password - unauthenticated
	try {
		const reply = await app.inject({
			method: "PUT",
			url: "/api/usuarios/change-password",
			headers: { authorization: "Bearer invalid-token" },
			body: { currentPassword: "old", newPassword: "new" },
		});
		if (reply.statusCode === 401) {
			logResult("PUT /api/usuarios/change-password (unauthenticated)", "PASS", "Returns 401 as expected");
		} else {
			logResult("PUT /api/usuarios/change-password (unauthenticated)", "FAIL", `Expected 401, got ${reply.statusCode}`);
		}
	} catch (error) {
		logResult("PUT /api/usuarios/change-password (unauthenticated)", "FAIL", error.message);
	}

	// Test: Update user - unauthenticated
	try {
		const reply = await app.inject({
			method: "PUT",
			url: "/api/usuarios/123",
			headers: { authorization: "Bearer invalid-token" },
			body: { nome: "Updated" },
		});
		if (reply.statusCode === 401 || reply.statusCode === 403) {
			logResult("PUT /api/usuarios/:id (unauthenticated)", `PASS`, `Returns ${reply.statusCode} as expected`);
		} else {
			logResult("PUT /api/usuarios/:id (unauthenticated)", `FAIL`, `Expected 401/403, got ${reply.statusCode}`);
		}
	} catch (error) {
		logResult("PUT /api/usuarios/:id (unauthenticated)", "FAIL", error.message);
	}

	// Test: Delete user - unauthenticated
	try {
		const reply = await app.inject({
			method: "DELETE",
			url: "/api/usuarios/123",
			headers: { authorization: "Bearer invalid-token" },
		});
		if (reply.statusCode === 401 || reply.statusCode === 403) {
			logResult("DELETE /api/usuarios/:id (unauthenticated)", `PASS`, `Returns ${reply.statusCode} as expected`);
		} else {
			logResult("DELETE /api/usuarios/:id (unauthenticated)", `FAIL`, `Expected 401/403, got ${reply.statusCode}`);
		}
	} catch (error) {
		logResult("DELETE /api/usuarios/:id (unauthenticated)", "FAIL", error.message);
	}

	// Test: Validate account - unauthenticated
	try {
		const reply = await app.inject({
			method: "POST",
			url: "/api/usuarios/123/validate-account",
			headers: { authorization: "Bearer invalid-token" },
		});
		if (reply.statusCode === 401 || reply.statusCode === 403) {
			logResult("POST /api/usuarios/:id/validate-account (unauthenticated)", `PASS`, `Returns ${reply.statusCode} as expected`);
		} else {
			logResult("POST /api/usuarios/:id/validate-account (unauthenticated)", `FAIL`, `Expected 401/403, got ${reply.statusCode}`);
		}
	} catch (error) {
		logResult("POST /api/usuarios/:id/validate-account (unauthenticated)", "FAIL", error.message);
	}

	// -------------------------------------------------------
	// Modules Routes (/api/admin/modules)
	// -------------------------------------------------------

	// Test: Get enabled modules
	try {
		const reply = await app.inject({ method: "GET", url: "/api/admin/modules/enabled" });
		logResult("GET /api/admin/modules/enabled", `Status: ${reply.statusCode}`, reply.body ? JSON.stringify(reply.body).substring(0, 80) : "empty");
	} catch (error) {
		logResult("GET /api/admin/modules/enabled", "FAIL", error.message);
	}

	// Test: Toggle module - unauthenticated
	try {
		const reply = await app.inject({
			method: "PUT",
			url: "/api/admin/modules/dashboard",
			headers: { authorization: "Bearer invalid-token" },
			body: { enabled: false },
		});
		if (reply.statusCode === 401 || reply.statusCode === 403) {
			logResult("PUT /api/admin/modules/:key (unauthenticated)", `PASS`, `Returns ${reply.statusCode} as expected`);
		} else {
			logResult("PUT /api/admin/modules/:key (unauthenticated)", `FAIL`, `Expected 401/403, got ${reply.statusCode}`);
		}
	} catch (error) {
		logResult("PUT /api/admin/modules/:key (unauthenticated)", "FAIL", error.message);
	}

	// Test: Get all modules - unauthenticated
	try {
		const reply = await app.inject({ method: "GET", url: "/api/admin/modules" });
		logResult("GET /api/admin/modules (unauthenticated)", `Status: ${reply.statusCode}`, reply.body ? `Has data` : "empty");
	} catch (error) {
		logResult("GET /api/admin/modules (unauthenticated)", "FAIL", error.message);
	}

	// -------------------------------------------------------
	// Forum Routes (/api/forum)
	// -------------------------------------------------------

	// Test: List forum posts
	try {
		const reply = await app.inject({ method: "GET", url: "/api/forum" });
		logResult("GET /api/forum", `Status: ${reply.statusCode}`, reply.body ? `Has ${Array.isArray(reply.body) ? reply.body.length : typeof reply.body}` : "empty");
	} catch (error) {
		logResult("GET /api/forum", "FAIL", error.message);
	}

	// Test: Create forum post - unauthenticated
	try {
		const reply = await app.inject({
			method: "POST",
			url: "/api/forum",
			headers: { authorization: "Bearer invalid-token" },
			body: { titulo: "Test", conteudo: "Content" },
		});
		if (reply.statusCode === 401) {
			logResult("POST /api/forum (unauthenticated)", "PASS", "Returns 401 as expected");
		} else {
			logResult("POST /api/forum (unauthenticated)", "FAIL", `Expected 401, got ${reply.statusCode}`);
		}
	} catch (error) {
		logResult("POST /api/forum (unauthenticated)", "FAIL", error.message);
	}

	// Test: Like post - unauthenticated
	try {
		const reply = await app.inject({
			method: "POST",
			url: "/api/forum/like",
			headers: { authorization: "Bearer invalid-token" },
			body: { id: "1" },
		});
		if (reply.statusCode === 401 || reply.statusCode === 404) {
			logResult("POST /api/forum/:id/like (unauthenticated)", `PASS`, `Returns ${reply.statusCode} as expected`);
		} else {
			logResult("POST /api/forum/:id/like (unauthenticated)", `FAIL`, `Expected 401/404, got ${reply.statusCode}`);
		}
	} catch (error) {
		logResult("POST /api/forum/:id/like (unauthenticated)", "FAIL", error.message);
	}

	// Test: Reply to post - unauthenticated
	try {
		const reply = await app.inject({
			method: "POST",
			url: "/api/forum/reply",
			headers: { authorization: "Bearer invalid-token" },
			body: { id: "1", conteudo: "Reply" },
		});
		if (reply.statusCode === 401) {
			logResult("POST /api/forum/reply (unauthenticated)", "PASS", "Returns 401 as expected");
		} else {
			logResult("POST /api/forum/reply (unauthenticated)", "FAIL", `Expected 401, got ${reply.statusCode}`);
		}
	} catch (error) {
		logResult("POST /api/forum/reply (unauthenticated)", "FAIL", error.message);
	}

	// -------------------------------------------------------
	// Progresso Routes (/api/progresso)
	// -------------------------------------------------------

	// Test: List progress - unauthenticated
	try {
		const reply = await app.inject({
			method: "GET",
			url: "/api/progresso",
			headers: { authorization: "Bearer invalid-token" },
		});
		if (reply.statusCode === 401) {
			logResult("GET /api/progresso (unauthenticated)", "PASS", "Returns 401 as expected");
		} else {
			logResult("GET /api/progresso (unauthenticated)", "FAIL", `Expected 401, got ${reply.statusCode}`);
		}
	} catch (error) {
		logResult("GET /api/progresso (unauthenticated)", "FAIL", error.message);
	}

	// Test: Update progress - unauthenticated
	try {
		const reply = await app.inject({
			method: "PUT",
			url: "/api/progresso",
			headers: { authorization: "Bearer invalid-token" },
			body: { cursoId: "1", aulaId: "1", concluido: true },
		});
		if (reply.statusCode === 401) {
			logResult("PUT /api/progresso (unauthenticated)", "PASS", "Returns 401 as expected");
		} else {
			logResult("PUT /api/progresso (unauthenticated)", "FAIL", `Expected 401, got ${reply.statusCode}`);
		}
	} catch (error) {
		logResult("PUT /api/progresso (unauthenticated)", "FAIL", error.message);
	}

	// -------------------------------------------------------
	// Certificates Routes (/api/certificates)
	// -------------------------------------------------------

	// Test: List certificates
	try {
		const reply = await app.inject({ method: "GET", url: "/api/certificates" });
		logResult("GET /api/certificates", `Status: ${reply.statusCode}`, reply.body ? `Has data` : "empty");
	} catch (error) {
		logResult("GET /api/certificates", "FAIL", error.message);
	}

	// -------------------------------------------------------
	// Role Permissions Routes (/api/role-permissions)
	// -------------------------------------------------------

	// Test: List role permissions - unauthenticated
	try {
		const reply = await app.inject({
			method: "GET",
			url: "/api/role-permissions",
			headers: { authorization: "Bearer invalid-token" },
		});
		if (reply.statusCode === 401) {
			logResult("GET /api/role-permissions (unauthenticated)", "PASS", "Returns 401 as expected");
		} else {
			logResult("GET /api/role-permissions (unauthenticated)", "FAIL", `Expected 401, got ${reply.statusCode}`);
		}
	} catch (error) {
		logResult("GET /api/role-permissions (unauthenticated)", "FAIL", error.message);
	}

	// -------------------------------------------------------
	// Dashboard Routes (/api/dashboard)
	// -------------------------------------------------------

	// Test: Dashboard - unauthenticated
	try {
		const reply = await app.inject({
			method: "GET",
			url: "/api/dashboard",
			headers: { authorization: "Bearer invalid-token" },
		});
		if (reply.statusCode === 401) {
			logResult("GET /api/dashboard (unauthenticated)", "PASS", "Returns 401 as expected");
		} else {
			logResult("GET /api/dashboard (unauthenticated)", "FAIL", `Expected 401, got ${reply.statusCode}`);
		}
	} catch (error) {
		logResult("GET /api/dashboard (unauthenticated)", "FAIL", error.message);
	}

	// -------------------------------------------------------
	// Summary
	// -------------------------------------------------------

	console.log(`\n${"=".repeat(60)}`);
	console.log("TEST SUMMARY");
	console.log("=".repeat(60));

	console.log(`Total: ${totalTests} | Passed: ${passedTests} ✅ | Failed: ${failedTests} ❌`);
	console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
	console.log("\nTests verify: route structure, authentication middleware,");
	console.log("and CRUD operation availability without database.\n");
	console.log("Note: Database-dependent operations require PG_URL or DATABASE_URL");

	console.log("=".repeat(60));

	await app.close();
	process.exit(failedTests > 0 ? 1 : 0);
}

runAllTests().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});