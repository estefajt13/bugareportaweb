const STATISTICS_BASE_URL = process.env.NEXT_PUBLIC_STATISTICS_API_BASE_URL;

function hasApiConfigured() {
  return typeof STATISTICS_BASE_URL === "string" && STATISTICS_BASE_URL.trim().length > 0;
}

/**
 * Verifica la conexión con el microservicio de estadísticas
 * @returns {Promise<{ok: boolean, message: string}>}
 */
export async function checkStatisticsApiHealth() {
  if (!hasApiConfigured()) {
    return {
      ok: false,
      message: "API de estadísticas no configurada. Verifica NEXT_PUBLIC_STATISTICS_API_BASE_URL"
    };
  }

  try {
    const response = await fetch(`${STATISTICS_BASE_URL}/health`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (response.ok) {
      return { ok: true, message: "Conexión exitosa con el microservicio de estadísticas" };
    } else {
      return { ok: false, message: `Error ${response.status}: ${await response.text()}` };
    }
  } catch (error) {
    return { ok: false, message: `Error de conexión: ${error.message}` };
  }
}

async function request(path) {
  if (!hasApiConfigured()) {
    throw new Error("API de estadísticas no configurada. Verifica NEXT_PUBLIC_STATISTICS_API_BASE_URL");
  }

  const response = await fetch(`${STATISTICS_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
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
 * Obtiene el área con más incidencias activas
 * @returns {Promise<{area: string, total: number}>}
 */
export async function fetchAreaMasActiva() {
  try {
    const data = await request("/estadisticas/area-mas-activa");
    return data || { area: null, total: 0 };
  } catch (error) {
    console.error("Error fetching area mas activa:", error);
    return { area: null, total: 0 };
  }
}

/**
 * Obtiene los tipos de reportes más frecuentes de la última semana
 * @param {number} limite - Cantidad máxima de tipos a devolver
 * @returns {Promise<Array<{tipo: string, area: string, total: number}>>}
 */
export async function fetchTiposFrecuentes(limite = 5) {
  try {
    const data = await request(`/estadisticas/tipos-frecuentes?limite=${limite}`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching tipos frecuentes:", error);
    return [];
  }
}

/**
 * Obtiene la tendencia mensual de reportes (últimos 6 meses)
 * @returns {Promise<Array<{mes: string, total: number}>>}
 */
export async function fetchTendenciaMensual() {
  try {
    const data = await request("/estadisticas/tendencia-mensual");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching tendencia mensual:", error);
    return [];
  }
}

/**
 * Obtiene el tipo de reporte más frecuente globalmente
 * @returns {Promise<{tipo: string, area: string, total: number}>}
 */
export async function fetchTipoMasFrecuente() {
  try {
    const data = await request("/estadisticas/tipo-mas-frecuente");
    return data || { tipo: null, area: null, total: 0 };
  } catch (error) {
    console.error("Error fetching tipo mas frecuente:", error);
    return { tipo: null, area: null, total: 0 };
  }
}

/**
 * Obtiene procesos diarios del admin dashboard
 * @param {string} periodo - Período: semanal, mensual, anual
 * @returns {Promise<Array<{fecha: string, total: number}>>}
 */
export async function fetchAdminDailyProcesses(periodo = "semanal") {
  try {
    const data = await request(`/estadisticas/admin/daily-processes?periodo=${periodo}`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching daily processes:", error);
    return [];
  }
}

/**
 * Obtiene distribución por área del admin dashboard
 * @param {string} estado - Estado opcional para filtrar
 * @returns {Promise<Array<{area: string, total: number, porcentaje: number}>>}
 */
export async function fetchAdminReportsByArea(estado = null) {
  try {
    const path = estado 
      ? `/estadisticas/admin/by-area?estado=${estado}`
      : "/estadisticas/admin/by-area";
    const data = await request(path);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching reports by area:", error);
    return [];
  }
}

/**
 * Obtiene resumen completo del admin dashboard
 * @returns {Promise<Object>}
 */
export async function fetchAdminSummary() {
  try {
    const data = await request("/estadisticas/admin/summary");
    return data || {};
  } catch (error) {
    console.error("Error fetching admin summary:", error);
    return {};
  }
}

/**
 * Obtiene todos los datos para el dashboard de estadísticas
 * @param {Object} filters - Filtros opcionales
 * @returns {Promise<Object>}
 */
export async function fetchEstadisticasDashboard(filters = {}) {
  const { periodo = "semanal" } = filters;

  try {
    const [
      areaMasActiva,
      tiposFrecuentes,
      tendenciaMensual,
      tipoMasFrecuente,
      dailyProcesses,
      reportsByArea,
    ] = await Promise.all([
      fetchAreaMasActiva(),
      fetchTiposFrecuentes(5),
      fetchTendenciaMensual(),
      fetchTipoMasFrecuente(),
      fetchAdminDailyProcesses(periodo),
      fetchAdminReportsByArea(),
    ]);

    return {
      areaMasActiva,
      tiposFrecuentes,
      tendenciaMensual,
      tipoMasFrecuente,
      dailyProcesses,
      reportsByArea,
      isUsingPlaceholder: false,
    };
  } catch (error) {
    console.error("Error fetching estadisticas dashboard:", error);
    return getEmptyDashboardData();
  }
}

/**
 * Datos vacíos por defecto para el dashboard de estadísticas
 */
export const EMPTY_ESTADISTICAS_DASHBOARD_DATA = {
  areaMasActiva: { area: null, total: 0 },
  tiposFrecuentes: [],
  tendenciaMensual: [],
  tipoMasFrecuente: { tipo: null, area: null, total: 0 },
  dailyProcesses: [],
  reportsByArea: [],
  isUsingPlaceholder: true,
};

function getEmptyDashboardData() {
  return {
    ...EMPTY_ESTADISTICAS_DASHBOARD_DATA,
    isUsingPlaceholder: false,
  };
}