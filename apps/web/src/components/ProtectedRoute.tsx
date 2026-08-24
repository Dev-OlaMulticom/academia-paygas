import type React from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { User } from "../hooks/useAuth";

interface ProtectedRouteProps {
	user: User | null;
	children: React.ReactNode;
}

export function ProtectedRoute({ user, children }: ProtectedRouteProps) {
	const location = useLocation();

	if (!user) {
		return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
	}
	return <>{children}</>;
}
