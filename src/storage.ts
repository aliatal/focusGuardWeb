import type {
  CompletedTaskRetentionDays,
  PlannerCategory,
  PlannerSettings,
  PlannerTaskItem,
  PurchaseRecord,
  TaskAttachments,
  TaskNotes,
} from './types'
import { startOfDay } from './dateUtils'

export const storageKeys = {
  tasks: 'planner.tasks',
  categories: 'planner.categories',
  categoriesEnabled: 'planner.categoriesEnabled',
  notes: 'home.taskNotes',
  attachments: 'focusguard.taskAttachments',
  settings: 'focusguard.settings',
  aiCredits: 'focusguard.aiCredits',
  purchases: 'focusguard.purchaseHistory',
}

export const defaultCategories: PlannerCategory[] = [
  {
    id: 'category-general',
    title: 'General',
    symbol: 'circle.fill',
    color: '#4a8af0',
    isDefault: true,
  },
]

export const paletteOptions = [
  '#4a8af0',
  '#4ab86e',
  '#eda82e',
  '#87293b',
  '#db7d38',
  '#24bdb8',
  '#a672e6',
  '#949f38',
]

export const defaultSettings: PlannerSettings = {
  notificationsEnabled: true,
  deviceFeedbackEnabled: true,
  themeMode: 'dark',
  categoriesEnabled: false,
  completedTaskRetentionDays: 60,
  taskNotifyAtStart: false,
  reminderOffset1: '24 hours before',
  reminderOffset2: 'Off',
  emailReminders: false,
  notebookSort: 'dateAscending',
  notebookFontStyle: 'rounded',
  notebookFontSize: 'medium',
  backgroundStyle: 'automatic',
}

export const loadTasks = (): PlannerTaskItem[] => parseArray(localStorage.getItem(storageKeys.tasks), [])

export const saveTasks = (tasks: PlannerTaskItem[]) => {
  localStorage.setItem(storageKeys.tasks, JSON.stringify(tasks))
}

export const loadCategories = (): PlannerCategory[] => {
  const categories = parseArray<PlannerCategory>(localStorage.getItem(storageKeys.categories), defaultCategories)
  return categories.length === 0 ? defaultCategories : categories
}

export const saveCategories = (categories: PlannerCategory[]) => {
  localStorage.setItem(storageKeys.categories, JSON.stringify(categories.slice(0, 8)))
}

export const loadNotes = (): TaskNotes => parseObject(localStorage.getItem(storageKeys.notes), {})

export const saveNotes = (notes: TaskNotes) => {
  localStorage.setItem(storageKeys.notes, JSON.stringify(notes))
}

export const loadAttachments = (): TaskAttachments => parseObject(localStorage.getItem(storageKeys.attachments), {})

export const saveAttachments = (attachments: TaskAttachments) => {
  localStorage.setItem(storageKeys.attachments, JSON.stringify(attachments))
}

export const loadSettings = (): PlannerSettings => {
  const settings = parseObject<Partial<PlannerSettings>>(localStorage.getItem(storageKeys.settings), {})
  const legacyCategoriesEnabled = localStorage.getItem(storageKeys.categoriesEnabled)
  return {
    ...defaultSettings,
    ...settings,
    categoriesEnabled:
      typeof settings.categoriesEnabled === 'boolean'
        ? settings.categoriesEnabled
        : legacyCategoriesEnabled === 'true',
  }
}

export const saveSettings = (settings: PlannerSettings) => {
  localStorage.setItem(storageKeys.settings, JSON.stringify(settings))
  localStorage.setItem(storageKeys.categoriesEnabled, String(settings.categoriesEnabled))
}

export const loadAiCredits = () => Number(localStorage.getItem(storageKeys.aiCredits) ?? 0)

export const saveAiCredits = (credits: number) => {
  localStorage.setItem(storageKeys.aiCredits, String(Math.max(0, Math.floor(credits))))
}

export const loadPurchases = (): PurchaseRecord[] =>
  parseArray<PurchaseRecord>(localStorage.getItem(storageKeys.purchases), [])

export const savePurchases = (records: PurchaseRecord[]) => {
  localStorage.setItem(storageKeys.purchases, JSON.stringify(records))
}

export const pruneExpiredTasks = (
  tasks: PlannerTaskItem[],
  retentionDays: CompletedTaskRetentionDays,
  now = new Date(),
) => {
  if (retentionDays === -1) return tasks

  const cutoff = startOfDay(now)
  cutoff.setDate(cutoff.getDate() - retentionDays)

  return tasks.filter((task) => {
    if (!task.isCompleted) return true
    const retainedDate = task.completedAt ?? task.deadline
    return retainedDate === null ? false : new Date(retainedDate) >= cutoff
  })
}

function parseArray<T>(rawValue: string | null, fallback: T[]): T[] {
  if (rawValue === null || rawValue.length === 0) return fallback
  try {
    const parsed = JSON.parse(rawValue)
    return Array.isArray(parsed) ? (parsed as T[]) : fallback
  } catch {
    return fallback
  }
}

function parseObject<T extends object>(rawValue: string | null, fallback: T): T {
  if (rawValue === null || rawValue.length === 0) return fallback
  try {
    const parsed = JSON.parse(rawValue)
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as T) : fallback
  } catch {
    return fallback
  }
}
