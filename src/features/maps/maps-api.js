const BASE_URL = process.env.NEXT_PUBLIC_MAPS_API_BASE_URL;

function hasApiConfigured() {
  return typeof BASE_URL === "string" && BASE_URL.trim().length > 0;
}

async function request(path) {
  if (!hasApiConfigured()) {
    throw new Error("API del microservicio de mapas no configurada. Verifica NEXT_PUBLIC_MAPS_API_BASE_URL");
  }

  const response = await fetch(`${BASE_URL}${path}`, {
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

  return response.json();
}

function featureToPoint(feature) {
  const coordinates = feature?.geometry?.coordinates || [];
  const props = feature?.properties || {};

  return {
    id: String(props.id ?? crypto.randomUUID()),
    label: props.asunto || props.nombre || `Punto ${props.id ?? ""}`.trim(),
    lat: Number(coordinates[1]),
    lng: Number(coordinates[0]),
    total: Number(props.total ?? 1),
    kind: props.tipo === "cluster" ? "cluster" : "report",
    clusterId: props.tipo === "cluster" ? Number(props.id) : (props.clusterId ?? null),
  };
}

/**
 * Obtiene los puntos de mapa ya resueltos por el microservicio de mapas.
 * @param {{area?: string, estado?: string}} filters
 */
export async function fetchMapPoints(filters = {}) {
  const params = new URLSearchParams();
  if (filters.area && filters.area !== "todas") params.append("area", filters.area);
  if (filters.estado && filters.estado !== "todos") params.append("estado", filters.estado);

  const queryString = params.toString();
  const payload = await request(`/api/mapas/reportes${queryString ? `?${queryString}` : ""}`);

  const features = Array.isArray(payload?.features) ? payload.features : [];
  return features.map(featureToPoint);
}
