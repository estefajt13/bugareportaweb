import {
  EMPTY_ADMIN_DASHBOARD_DATA,
  REPORTS_ENDPOINTS,
} from "@/features/reports/types";

const BASE_URL = process.env.NEXT_PUBLIC_REPORTS_API_BASE_URL;

function hasApiConfigured() {
  return typeof BASE_URL === "string" && BASE_URL.trim().length > 0;
}

async function request(path, token) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
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

  return {
    isUsingPlaceholder: false,
    metrics: {
      totalReports: summary?.totalReports ?? null,
      inProgressReports: summary?.inProgressReports ?? null,
      solvedReports: summary?.solvedReports ?? null,
      averageResolutionHours: summary?.averageResolutionHours ?? null,
    },
    dailyProcesses: Array.isArray(daily?.items) ? daily.items : [],
    reportsByArea: Array.isArray(byArea?.items) ? byArea.items : [],
    mapDataByZone: Array.isArray(summary?.mapDataByZone) ? summary.mapDataByZone : [],
    mapDataByArea: Array.isArray(summary?.mapDataByArea) ? summary.mapDataByArea : [],
  };
}
