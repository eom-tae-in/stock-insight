import type {
  AdminAnomaly,
  AdminRecentAnalysis,
  AdminRecentOverlay,
  AdminSummary,
} from '@/server/admin-service'

export interface AdminReportRepository {
  checkDatabase(): Promise<void>
  getUserCount(scope: AdminSummary['scope']): Promise<number | null>
  getKeywordCount(): Promise<number>
  getAnalysisCount(): Promise<number>
  getOverlayCount(): Promise<number>
  getUnrefreshedOverlayCount(): Promise<number>
  findRecentAnalyses(): Promise<AdminRecentAnalysis[]>
  findRecentOverlays(): Promise<AdminRecentOverlay[]>
  findAnomalies(): Promise<AdminAnomaly[]>
}
