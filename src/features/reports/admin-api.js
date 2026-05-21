const BASE_URL = process.env.NEXT_PUBLIC_REPORTS_API_BASE_URL;

/**
 * Verifica que la API esté configurada
 */
function hasApiConfigured() {
  return typeof BASE_URL === "string" && BASE_URL.trim().length > 0;
}

/**
 * Realiza una petición autenticada a la API del microservicio
 */
async function request(path, token, method = "GET", body = null) {
  if (!hasApiConfigured()) {
    throw new Error("API del microservicio no configurada. Verifica NEXT_PUBLIC_REPORTS_API_BASE_URL");
  }

  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };

  if (body && (method === "POST" || method === "PUT")) {
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, options);
  } catch (error) {
    // El navegador lanza TypeError cuando no hay conectividad o CORS bloquea la petición.
    throw new Error(
      "No se pudo conectar con el microservicio de reportes. Verifica URL, CORS y que el servicio este activo."
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error ${response.status}: ${errorText}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

/**
 * Obtener todos los reportes (sin filtro de área)
 * @param {string} token - Token de autenticación
 * @param {Object} filters - Filtros opcionales { estado, fechaDesde, fechaHasta, area }
 */
export async function fetchAdminReports(token, filters = {}) {
  const params = new URLSearchParams();
  if (filters.estado) params.append("estado", filters.estado);
  if (filters.fechaDesde) params.append("fechaDesde", filters.fechaDesde);
  if (filters.fechaHasta) params.append("fechaHasta", filters.fechaHasta);
  if (filters.area) params.append("area", filters.area);

  const queryString = params.toString();
  const path = `/admin/reports${queryString ? `?${queryString}` : ""}`;

  return request(path, token);
}

/**
 * Obtener detalle de un reporte específico (admin)
 * @param {string} token - Token de autenticación
 * @param {number} id - ID del reporte
 */
export async function fetchAdminReport(token, id) {
  return request(`/admin/reports/${id}`, token);
}

/**
 * Actualizar estado de un reporte (admin)
 * @param {string} token - Token de autenticación
 * @param {number} id - ID del reporte
 * @param {Object} data - { estado, uidFuncionario?, comentario?, notificarCiudadano? }
 */
export async function updateAdminReport(token, id, data) {
  return request(`/admin/reports/${id}`, token, "PUT", data);
}

/**
 * Obtener historial de un reporte (admin)
 * @param {string} token - Token de autenticación
 * @param {number} id - ID del reporte
 */
export async function fetchAdminReportHistory(token, id) {
  return request(`/admin/reports/${id}/history`, token);
}

/**
 * Agregar un comentario a un reporte (admin)
 * @param {string} token - Token de autenticación
 * @param {number} id - ID del reporte
 * @param {string} comentario - Texto del comentario
 * @param {boolean} visibleCiudadano - Si el ciudadano puede verlo
 */
export async function addAdminComment(token, id, comentario, visibleCiudadano = false) {
  return request(`/admin/reports/${id}/comment`, token, "POST", {
    comentario,
    visibleCiudadano,
  });
}

/**
 * Reasignar un reporte a otro funcionario
 * @param {string} token - Token de autenticación
 * @param {number} id - ID del reporte
 * @param {string} uidFuncionario - UID del nuevo funcionario
 */
export async function reassignAdminReport(token, id, uidFuncionario) {
  return request(`/admin/reports/${id}/reassign`, token, "PUT", {
    uidFuncionario,
  });
}

/**
 * Obtener lista de funcionarios para reasignación
 * @param {string} token - Token de autenticación
 */
export async function fetchAdminFuncionarios(token) {
  return request("/admin/funcionarios", token);
}

/**
 * Obtener lista de áreas disponibles
 */
export async function fetchAreas() {
  if (!hasApiConfigured()) {
    throw new Error("API del microservicio no configurada. Verifica NEXT_PUBLIC_REPORTS_API_BASE_URL");
  }

  const response = await fetch(`${BASE_URL}/funcionario/areas`);

  if (!response.ok) {
    throw new Error(`Error ${response.status}`);
  }

  return response.json();
}