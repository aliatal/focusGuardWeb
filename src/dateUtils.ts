import type { ReminderOffset } from './types'

export const today = () => new Date()

export const dateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const timeKey = (date: Date) => {
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')
  return `${hours}:${minutes}`
}

export const parseDateKey = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export const combineDateTime = (dateValue: string, timeValue: string) => {
  const [hours, minutes] = timeValue.split(':').map(Number)
  const date = parseDateKey(dateValue)
  date.setHours(hours, minutes, 0, 0)
  return date
}

export const endOfDay = (dateValue: string) => {
  const date = parseDateKey(dateValue)
  date.setHours(23, 59, 0, 0)
  return date
}

export const startOfDay = (date: Date) => {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

export const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

export const addMonths = (date: Date, months: number) =>
  new Date(date.getFullYear(), date.getMonth() + months, 1)

export const buildMonthGrid = (month: Date) => {
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1)
  const firstVisibleDate = addDays(monthStart, -monthStart.getDay())
  return Array.from({ length: 42 }, (_, index) => addDays(firstVisibleDate, index))
}

export const isSameDay = (a: Date, b: Date) => dateKey(a) === dateKey(b)

export const isTodayKey = (value: string) => value === dateKey(today())

export const isTomorrowKey = (value: string) => value === dateKey(addDays(today(), 1))

export const isThisWeek = (date: Date, reference = today()) => {
  const start = addDays(startOfDay(reference), -reference.getDay())
  const end = addDays(start, 7)
  return date >= start && date < end
}

export const isNextWeek = (date: Date, reference = today()) => {
  const start = addDays(startOfDay(reference), -reference.getDay() + 7)
  const end = addDays(start, 7)
  return date >= start && date < end
}

export const isThisMonth = (date: Date, reference = today()) =>
  date.getFullYear() === reference.getFullYear() && date.getMonth() === reference.getMonth()

export const isNextMonth = (date: Date, reference = today()) => {
  const next = addMonths(reference, 1)
  return date.getFullYear() === next.getFullYear() && date.getMonth() === next.getMonth()
}

export const shortDateFormatter = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' })
export const mediumDateFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})
export const fullDateFormatter = new Intl.DateTimeFormat('en', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})
export const homeDateFormatter = new Intl.DateTimeFormat('en', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})
export const timeFormatter = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' })
export const monthFormatter = new Intl.DateTimeFormat('en', { month: 'long' })

export const formatTaskTime = (deadline: string | null, startDate: string | null) => {
  if (deadline === null) return 'Anytime'

  const end = new Date(deadline)
  const dayLabel = isTodayKey(dateKey(end))
    ? 'Today'
    : isTomorrowKey(dateKey(end))
      ? 'Tomorrow'
      : shortDateFormatter.format(end)

  if (startDate !== null) {
    return `${dayLabel}, ${timeFormatter.format(new Date(startDate))}-${timeFormatter.format(end)}`
  }

  const isDefaultNoTime = end.getHours() === 23 && end.getMinutes() === 59
  return isDefaultNoTime ? dayLabel : `${dayLabel}, ${timeFormatter.format(end)}`
}

export const reminderLeadMinutes: Record<ReminderOffset, number | null> = {
  Off: null,
  '15 mins before': 15,
  '30 mins before': 30,
  '1 hour before': 60,
  '2 hours before': 120,
  '6 hours before': 360,
  '12 hours before': 720,
  '24 hours before': 1440,
  '48 hours before': 2880,
  '1 week before': 10080,
}
