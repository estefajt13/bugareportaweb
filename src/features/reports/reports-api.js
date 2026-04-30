import {
  EMPTY_ADMIN_DASHBOARD_DATA,
  REPORTS_ENDPOINTS,
} from "@/features/reports/types";

const BASE_URL = process.env.NEXT_PUBLIC_REPORTS_API_BASE_URL;

function hasApiConfigured() {
  return typeof BASE_URL === "string" && BASE_URL.trim().length > 0;
}

/**
 * Verifica la conexión con el microservicio
 * @returns {Promise<{ok: boolean, message: string}>}
 */
export async function checkApiHealth() {
  if (!hasApiConfigured()) {
    return {
      ok: false,
      message: "API del microservicio no configurada. Verifica NEXT_PUBLIC_REPORTS_API_BASE_URL"
    };
  }

  try {
    const response = await fetch(`${BASE_URL}/health`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (response.ok) {
      return { ok: true, message: "Conexión exitosa con el microservicio" };
    } else {
      return { ok: false, message: `Error ${response.status}: ${await response.text()}` };
    }
  } catch (error) {
    return { ok: false, message: `Error de conexión: ${error.message}` };
  }
}

async function request(path, token) {
  if (!hasApiConfigured()) {
    throw new Error("API del microservicio no configurada. Verifica NEXT_PUBLIC_REPORTS_API_BASE_URL");
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error ${response.status}: ${errorText}`);
  }

  // Si la respuesta es 204 No Content, retornar null
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

/**
 * @param {string} token
 * @returns {Promise<import("./types").AdminDashboardData>}
 */
export async function fetchAdminDashboardData(token) {
  if (!hasApiConfigured()) {
    return EMPTY_ADMIN_DASHBOARD_DATA;
  }

  const [summary, daily, byArea] = await Promise.all([
    request(REPORTS_ENDPOINTS.summary, token),
    request(REPORTS_ENDPOINTS.dailyProcesses, token),
    request(REPORTS_ENDPOINTS.reportsByArea, token),
  ]);

  // Mapear campos del backend al formato del frontend
  const tiempos = summary?.tiempos || {};
  const porEstado = summary?.porEstado || {};

  return {
    isUsingPlaceholder: false,
    metrics: {
      // El backend devuelve: totalReportes, el frontend espera: totalReports
      totalReports: summary?.totalReportes ?? summary?.totalReports ?? null,
      // El backend devuelve: tiempos.enProceso + tiempos.enRevision
      inProgressReports: 
        (tiempos?.enProceso ?? 0) + (tiempos?.enRevision ?? 0) ??
        summary?.inProgressReports ?? 
        (porEstado?.en_proceso ?? 0) + (porEstado?.en_revision ?? 0),
      // El backend devuelve: tiempos.resueltos o porEstado.resuelto
      solvedReports: tiempos?.resueltos ?? summary?.solvedReports ?? porEstado?.resuelto ?? null,
      // El backend devuelve: averageResolutionHours
      averageResolutionHours: summary?.averageResolutionHours ?? null,
    },
    // El backend devuelve array directo o {items: []}
    dailyProcesses: Array.isArray(daily) ? daily : (daily?.items ?? []),
    // El backend devuelve: {items: [{areaNombre, total, porcentaje}]}
    reportsByArea: mapByAreaResponse(byArea),
    mapDataByZone: Array.isArray(summary?.mapDataByZone) ? summary.mapDataByZone : [],
    mapDataByArea: Array.isArray(summary?.mapDataByArea) ? summary.mapDataByArea : [],
  };
}

/**
 * Mapear respuesta de /by-area al formato esperado
 * Backend: [{areaNombre, total, porcentaje}]
 * Frontend: [{name, percentage, total}]
 */
function mapByAreaResponse(response) {
  if (!response) return [];
  
  const items = Array.isArray(response) ? response : (response.items ?? []);
  
  return items.map(item => ({
    name: item.areaNombre || item.name || item.area,
    percentage: item.porcentaje ?? item.percentage ?? 0,
    total: item.total ?? 0,
  }));
}
