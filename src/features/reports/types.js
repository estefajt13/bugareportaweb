/**
 * @typedef {Object} ReportMetrics
 * @property {number | null} totalReports
 * @property {number | null} inProgressReports
 * @property {number | null} solvedReports
 * @property {number | null} averageResolutionHours
 */

/**
 * @typedef {Object} DailyProcessItem
 * @property {string} date
 * @property {number} total
 */

/**
 * @typedef {Object} AreaDistributionItem
 * @property {string} name
 * @property {number} percentage
 * @property {number} [total]
 */

/**
 * @typedef {Object} MapPoint
 * @property {string} id
 * @property {string} label
 * @property {number} lat
 * @property {number} lng
 * @property {number} [total]
 */

/**
 * @typedef {Object} AdminDashboardData
 * @property {boolean} isUsingPlaceholder
 * @property {ReportMetrics} metrics
 * @property {DailyProcessItem[]} dailyProcesses
 * @property {AreaDistributionItem[]} reportsByArea
 * @property {MapPoint[]} mapDataByZone
 * @property {MapPoint[]} mapDataByArea
 */

export const REPORTS_ENDPOINTS = {
  summary: "/admin/reports/summary",
  dailyProcesses: "/admin/reports/daily-processes",
  reportsByArea: "/admin/reports/by-area",
};

/** @type {AdminDashboardData} */
export const EMPTY_ADMIN_DASHBOARD_DATA = {
  isUsingPlaceholder: true,
  metrics: {
    totalReports: null,
    inProgressReports: null,
    solvedReports: null,
    averageResolutionHours: null,
  },
  dailyProcesses: [],
  reportsByArea: [],
  mapDataByZone: [],
  mapDataByArea: [],
};
