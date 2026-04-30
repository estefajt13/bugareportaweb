const BASE_URL = process.env.NEXT_PUBLIC_REPORTS_API_BASE_URL;

/**
 * Verifica que la API esté configurada
 */
function hasApiConfigured() {
  return typeof BASE_URL === "string" && BASE_URL.trim().length > 0;
}

/**
 * Realiza una petición a la API del microservicio
 * @param {string} path - Endpoint de la API
 * @param {string} uid - UID del funcionario
 * @param {string} area - Área del funcionario
 * @param {string} method - Método HTTP
 * @param {Object} body - Cuerpo de la petición (para POST/PUT)
 */
async function request(path, uid, area, method = "GET", body = null) {
  if (!hasApiConfigured()) {
    throw new Error("API del microservicio no configurada. Verifica NEXT_PUBLIC_REPORTS_API_BASE_URL");
  }

  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-User-UID": uid,
      "X-User-Area": area,
    },
  };

  if (body && (method === "POST" || method === "PUT")) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, options);

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
 * Obtener todos los reportes del área del funcionario
 * @param {string} uid - UID del funcionario
 * @param {string} area - Área del funcionario
 * @param {Object} filters - Filtros opcionales { estado, fechaDesde, fechaHasta }
 */
export async function fetchFuncionarioReports(uid, area, filters = {}) {
  const params = new URLSearchParams();
  if (filters.estado) params.append("estado", filters.estado);
  if (filters.fechaDesde) params.append("fechaDesde", filters.fechaDesde);
  if (filters.fechaHasta) params.append("fechaHasta", filters.fechaHasta);

  const queryString = params.toString();
  const path = `/funcionario/reports${queryString ? `?${queryString}` : ""}`;

  return request(path, uid, area);
}

/**
 * Obtener detalle de un reporte específico
 * @param {string} uid - UID del funcionario
 * @param {string} area - Área del funcionario
 * @param {number} id - ID del reporte
 */
export async function fetchFuncionarioReport(uid, area, id) {
  return request(`/funcionario/reports/${id}`, uid, area);
}

/**
 * Asignarse un reporte (cambia estado a en_revision)
 * @param {string} uid - UID del funcionario
 * @param {string} area - Área del funcionario
 * @param {number} id - ID del reporte
 */
export async function assignFuncionarioReport(uid, area, id) {
  return request(`/funcionario/reports/${id}/assign`, uid, area, "PUT");
}

/**
 * Actualizar estado de un reporte con comentario opcional
 * @param {string} uid - UID del funcionario
 * @param {string} area - Área del funcionario
 * @param {number} id - ID del reporte
 * @param {string} estado - Nuevo estado
 * @param {string} [comentario] - Comentario opcional
 * @param {boolean} [notificarCiudadano] - Si se debe notificar al ciudadano
 */
export async function updateFuncionarioReportStatus(uid, area, id, estado, comentario = null, notificarCiudadano = false) {
  return request(`/funcionario/reports/${id}/status`, uid, area, "PUT", { 
    estado, 
    comentario,
    notificarCiudadano 
  });
}

/**
 * Agregar un comentario al reporte
 * @param {string} uid - UID del funcionario
 * @param {string} area - Área del funcionario
 * @param {number} id - ID del reporte
 * @param {string} comentario - Texto del comentario
 * @param {boolean} visibleCiudadano - Si el ciudadano puede ver el comentario
 */
export async function addFuncionarioComment(uid, area, id, comentario, visibleCiudadano = false) {
  return request(`/funcionario/reports/${id}/comment`, uid, area, "POST", { 
    comentario,
    visibleCiudadano 
  });
}

/**
 * Obtener historial de un reporte
 * @param {string} uid - UID del funcionario
 * @param {string} area - Área del funcionario
 * @param {number} id - ID del reporte
 */
export async function fetchFuncionarioReportHistory(uid, area, id) {
  return request(`/funcionario/reports/${id}/history`, uid, area);
}

/**
 * Obtener métricas del dashboard
 * @param {string} uid - UID del funcionario
 * @param {string} area - Área del funcionario
 */
export async function fetchFuncionarioDashboardMetrics(uid, area) {
  return request("/funcionario/dashboard/metrics", uid, area);
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