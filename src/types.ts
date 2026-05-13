export type Page = 'dashboard' | 'tasklist' | 'calendar' | 'ai' | 'settings'

export type ThemeMode = 'system' | 'light' | 'dark'
export type CompletedTaskRetentionDays = 7 | 30 | 60 | 90 | -1
export type TaskStatusFilter = 'open' | 'completed' | 'all'
export type TaskSpecialFilter = 'all' | 'dueToday' | 'overdue' | 'noDeadline'
export type NotebookSort =
  | 'dateAscending'
  | 'dateDescending'
  | 'category'
  | 'today'
  | 'tomorrow'
  | 'thisWeek'
  | 'nextWeek'
  | 'thisMonth'
  | 'nextMonth'
export type NotebookFontStyle = 'system' | 'rounded' | 'serif'
export type NotebookFontSize = 'compact' | 'medium' | 'large'
export type EditScope = 'onlyThisTask' | 'thisAndLaterRepeats'

export type ReminderOffset =
  | 'Off'
  | '15 mins before'
  | '30 mins before'
  | '1 hour before'
  | '2 hours before'
  | '6 hours before'
  | '12 hours before'
  | '24 hours before'
  | '48 hours before'
  | '1 week before'

export type PlannerTaskItem = {
  id: string
  title: string
  categoryTitle: string
  deadline: string | null
  startDate: string | null
  isCompleted: boolean
  completedAt: string | null
  seriesID: string | null
}

export type PlannerCategory = {
  id: string
  title: string
  symbol: string
  color: string
  isDefault: boolean
}

export type TaskNotes = Record<string, string>

export type PlannerSettings = {
  notificationsEnabled: boolean
  deviceFeedbackEnabled: boolean
  themeMode: ThemeMode
  categoriesEnabled: boolean
  completedTaskRetentionDays: CompletedTaskRetentionDays
  taskNotifyAtStart: boolean
  reminderOffset1: ReminderOffset
  reminderOffset2: ReminderOffset
  emailReminders: boolean
  notebookSort: NotebookSort
  notebookFontStyle: NotebookFontStyle
  notebookFontSize: NotebookFontSize
  backgroundStyle: 'automatic' | 'prism' | 'lattice' | 'rings'
}

export type TaskDraft = {
  title: string
  categoryTitle: string
  usesDeadline: boolean
  deadlineDate: string
  hasSpecificTime: boolean
  deadlineTime: string
  usesDuration: boolean
  startDate: string
  startTime: string
  repeats: boolean
  repeatWeekdays: number[]
  repeatEndDate: string
  note: string
}

export type AiSuggestion = {
  id: string
  title: string
  categoryTitle: string
  deadlineDate: string
  deadlineTime: string
  selected: boolean
}

export type PurchaseRecord = {
  id: string
  label: string
  price: number
  credits: number
  createdAt: string
}
