import { format, startOfISOWeek, subWeeks } from 'date-fns'

export function getLastCompletedWeekStart(date: Date = new Date()): Date {
  return subWeeks(startOfISOWeek(date), 1)
}

export function getLastCompletedWeekKey(date: Date = new Date()): string {
  return format(getLastCompletedWeekStart(date), 'yyyy-MM-dd')
}
