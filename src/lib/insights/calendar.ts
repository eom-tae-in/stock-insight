import { addDays, format, getISOWeek, getISOWeekYear } from 'date-fns'
import { getLastCompletedWeekStart } from '@/lib/utils/week-sync'

export function isStale(value: string | null | undefined, now: Date) {
  return value ? now.getTime() - Date.parse(value) >= 14 * 86400000 : false
}

export function completedWeek(now: Date) {
  const monday = getLastCompletedWeekStart(now)
  return {
    key: format(monday, 'yyyy-MM-dd'),
    label: `${getISOWeekYear(monday)}년 ${getISOWeek(monday)}주차`,
    range: `${format(monday, 'MM.dd')} – ${format(addDays(monday, 4), 'MM.dd')}`,
    next: `${format(addDays(monday, 14), 'MM.dd')}(월) 이후`,
  }
}
