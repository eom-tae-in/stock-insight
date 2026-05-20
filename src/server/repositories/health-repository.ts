export interface HealthRepository {
  checkDatabase(): Promise<void>
}
