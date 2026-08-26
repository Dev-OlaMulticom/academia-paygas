import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initEncryptionKey } from "./lib/crypto";
import { prefetchPdfLibs } from "./lib/prefetch";

const queryClient = new QueryClient();

initEncryptionKey().catch(() => {});

// Precarga jspdf/html2canvas en idle (no afecta el bundle inicial)
prefetchPdfLibs();

if (import.meta.env.DEV) {
	(window as any).clearCache = async () => {
		localStorage.clear();
		console.log("Cache limpiado. Recargando...");
		window.location.href = "/login";
	};
}

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<QueryClientProvider client={queryClient}>
			<App />
		</QueryClientProvider>
	</React.StrictMode>,
);
