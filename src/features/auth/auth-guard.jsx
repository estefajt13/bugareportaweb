"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";

export function AuthGuard({
  children,
  allowedRoles = [],
  redirectTo = "/login",
  forbiddenTo = "/403",
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading, profile } = useAuth();

  const hasRoleRestriction = allowedRoles.length > 0;
  const hasAllowedRole = hasRoleRestriction
    ? allowedRoles.includes(profile?.rol)
    : true;

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      router.replace(redirectTo);
      return;
    }

    if (!hasAllowedRole) {
      router.replace(forbiddenTo);
    }
  }, [
    forbiddenTo,
    hasAllowedRole,
    isAuthenticated,
    isLoading,
    redirectTo,
    router,
  ]);

  if (isLoading || !isAuthenticated || !hasAllowedRole) {
    return null;
  }

  return children;
}

export function AdminGuard({ children, redirectTo = "/login" }) {
  return (
    <AuthGuard
      allowedRoles={["Administrador"]}
      redirectTo={redirectTo}
      forbiddenTo="/403"
    >
      {children}
    </AuthGuard>
  );
}

export function FuncionarioGuard({ children, redirectTo = "/login" }) {
  return (
    <AuthGuard
      allowedRoles={["Funcionario"]}
      redirectTo={redirectTo}
      forbiddenTo="/403"
    >
      {children}
    </AuthGuard>
  );
}
