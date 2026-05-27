"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminGuard } from "@/features/auth/auth-guard";
import AdminShell from "@/components/navigation/AdminShell";

export default function AdminEstadisticasPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir al dashboard ya que las estadísticas ahora están integradas allí
    router.push("/admin");
  }, [router]);

  return (
    <AdminGuard>
      <AdminShell activeSection="dashboard" breadcrumb="Admin / Dashboard">
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '400px',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <p style={{ fontSize: '1.1rem', color: '#5a4530' }}>
            Redirigiendo al Dashboard...
          </p>
          <p style={{ fontSize: '0.9rem', color: '#8f7758' }}>
            Las estadísticas avanzadas ahora se encuentran en el Dashboard.
          </p>
        </div>
      </AdminShell>
    </AdminGuard>
  );
}