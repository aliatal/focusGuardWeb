import type {
  EditScope,
  NotebookSort,
  PlannerCategory,
  PlannerTaskItem,
  TaskDraft,
  TaskSpecialFilter,
  TaskStatusFilter,
} from './types'
import {
  addDays,
  combineDateTime,
  dateKey,
  endOfDay,
  isNextMonth,
  isNextWeek,
  isThisMonth,
  isThisWeek,
  isTodayKey,
  isTomorrowKey,
  today,
  timeKey,
} from './dateUtils'

export const createEmptyDraft = (date = dateKey(today()), categoryTitle = 'General'): TaskDraft => ({
  title: '',
  categoryTitle,
  usesDeadline: true,
  deadlineDate: date,
  hasSpecificTime: false,
  deadlineTime: '12:00',
  usesDuration: false,
  startDate: date,
  startTime: '11:00',
  repeats: false,
  repeatWeekdays: [new Date().getDay()],
  repeatEndDate: dateKey(addDays(today(), 28)),
  note: '',
})

export const draftFromTask = (task: PlannerTaskItem, note = ''): TaskDraft => {
  const deadline = task.deadline === null ? null : new Date(task.deadline)
  const start = task.startDate === null ? null : new Date(task.startDate)
  const baseDate = deadline ?? today()
  return {
    title: task.title,
    categoryTitle: task.categoryTitle,
    usesDeadline: deadline !== null,
    deadlineDate: dateKey(baseDate),
    hasSpecificTime: deadline !== null && !(deadline.getHours() === 23 && deadline.getMinutes() === 59),
    deadlineTime: deadline === null ? '12:00' : timeKey(deadline),
    usesDuration: start !== null,
    startDate: dateKey(start ?? baseDate),
    startTime: start === null ? '11:00' : timeKey(start),
    repeats: task.seriesID !== null,
    repeatWeekdays: [baseDate.getDay()],
    repeatEndDate: dateKey(addDays(baseDate, 28)),
    note,
  }
}

export const tasksFromDraft = (draft: TaskDraft): PlannerTaskItem[] => {
  const normalizedTitle = normalizeTitle(draft.title)
  if (normalizedTitle.length === 0) return []

  if (!draft.usesDeadline) {
    return [singleTaskFromDraft(draft, null, null, null)]
  }

  if (!draft.repeats) {
    return [singleTaskFromDraft(draft, draft.deadlineDate, draft.startDate, null)]
  }

  const seriesID = crypto.randomUUID()
  const selectedWeekdays = new Set(draft.repeatWeekdays)
  const startDate = combineDateTime(draft.deadlineDate, '00:00')
  const endDate = combineDateTime(draft.repeatEndDate, '00:00')
  const tasks: PlannerTaskItem[] = []

  for (let cursor = new Date(startDate); cursor <= endDate; cursor = addDays(cursor, 1)) {
    if (selectedWeekdays.has(cursor.getDay())) {
      const occurrenceDate = dateKey(cursor)
      tasks.push(singleTaskFromDraft(draft, occurrenceDate, occurrenceDate, seriesID))
    }
  }

  return tasks.length > 0 ? tasks : [singleTaskFromDraft(draft, draft.deadlineDate, draft.startDate, seriesID)]
}

export const applyDraftToTask = (task: PlannerTaskItem, draft: TaskDraft, detachSeries = false): PlannerTaskItem => {
  const normalizedTitle = normalizeTitle(draft.title)
  const updated = taskWithDraftTime(task, draft, task.deadline)
  return {
    ...updated,
    title: normalizedTitle,
    categoryTitle: draft.categoryTitle,
    seriesID: detachSeries ? null : updated.seriesID,
  }
}

export const updateTaskSeries = (
  tasks: PlannerTaskItem[],
  selectedTask: PlannerTaskItem,
  draft: TaskDraft,
  scope: EditScope,
) => {
  const ids = scope === 'onlyThisTask' ? new Set([selectedTask.id]) : taskIDsForThisAndLaterRepeats(tasks, selectedTask)
  return tasks.map((task) => {
    if (!ids.has(task.id)) return task
    if (scope === 'onlyThisTask') return applyDraftToTask(task, draft, true)
    if (task.id === selectedTask.id) return applyDraftToTask(task, draft, false)
    return applyRepeatDraftPreservingDate(task, draft)
  })
}

export const deleteTaskSeries = (tasks: PlannerTaskItem[], selectedTask: PlannerTaskItem, scope: EditScope) => {
  if (scope === 'onlyThisTask') return tasks.filter((task) => task.id !== selectedTask.id)
  const ids = taskIDsForThisAndLaterRepeats(tasks, selectedTask)
  return tasks.filter((task) => !ids.has(task.id))
}

export const taskIDsForThisAndLaterRepeats = (tasks: PlannerTaskItem[], selectedTask: PlannerTaskItem) => {
  if (selectedTask.deadline === null) return new Set([selectedTask.id])
  const selectedDeadline = new Date(selectedTask.deadline).getTime()

  if (selectedTask.seriesID !== null) {
    return new Set(
      tasks
        .filter((task) => task.seriesID === selectedTask.seriesID && sortTime(task) >= selectedDeadline)
        .map((task) => task.id),
    )
  }

  return new Set(
    tasks
      .filter((task) => sortTime(task) >= selectedDeadline && (task.id === selectedTask.id || isLikelySameRepeat(task, selectedTask)))
      .map((task) => task.id),
  )
}

export const hasLaterRepeats = (tasks: PlannerTaskItem[], task: PlannerTaskItem) =>
  taskIDsForThisAndLaterRepeats(tasks, task).size > 1

export const toggleTaskCompletion = (task: PlannerTaskItem): PlannerTaskItem => ({
  ...task,
  isCompleted: !task.isCompleted,
  completedAt: task.isCompleted ? null : new Date().toISOString(),
})

export const isOverdue = (task: PlannerTaskItem, now = new Date()) =>
  task.deadline !== null && !task.isCompleted && new Date(task.deadline) < now

export const isDueToday = (task: PlannerTaskItem) =>
  task.deadline !== null && isTodayKey(dateKey(new Date(task.deadline)))

export const sortTasks = (tasks: PlannerTaskItem[]) =>
  [...tasks].sort((lhs, rhs) => {
    if ((lhs.deadline !== null) !== (rhs.deadline !== null)) return lhs.deadline !== null ? -1 : 1
    if (lhs.isCompleted !== rhs.isCompleted) return lhs.isCompleted ? 1 : -1
    return sortTime(lhs) - sortTime(rhs) || lhs.title.localeCompare(rhs.title)
  })

export const filterTasks = (
  tasks: PlannerTaskItem[],
  status: TaskStatusFilter,
  special: TaskSpecialFilter,
  category: string,
) =>
  sortTasks(
    tasks.filter((task) => {
      if (status === 'open' && task.isCompleted) return false
      if (status === 'completed' && !task.isCompleted) return false
      if (category !== 'All' && task.categoryTitle !== category) return false
      if (special === 'dueToday' && !isDueToday(task)) return false
      if (special === 'overdue' && !isOverdue(task)) return false
      if (special === 'noDeadline' && task.deadline !== null) return false
      return true
    }),
  )

export const notebookFilteredTasks = (tasks: PlannerTaskItem[], sort: NotebookSort) => {
  const openTasks = tasks.filter((task) => !task.isCompleted)
  const filtered = openTasks.filter((task) => {
    if (sort === 'today') return task.deadline !== null && isTodayKey(dateKey(new Date(task.deadline)))
    if (sort === 'tomorrow') return task.deadline !== null && isTomorrowKey(dateKey(new Date(task.deadline)))
    if (sort === 'thisWeek') return task.deadline === null || isThisWeek(new Date(task.deadline))
    if (sort === 'nextWeek') return task.deadline === null || isNextWeek(new Date(task.deadline))
    if (sort === 'thisMonth') return task.deadline === null || isThisMonth(new Date(task.deadline))
    if (sort === 'nextMonth') return task.deadline === null || isNextMonth(new Date(task.deadline))
    return true
  })

  return [...filtered].sort((lhs, rhs) => {
    if ((lhs.deadline !== null) !== (rhs.deadline !== null)) return lhs.deadline !== null ? -1 : 1
    if (sort === 'dateDescending' && lhs.deadline !== null && rhs.deadline !== null) {
      return new Date(rhs.deadline).getTime() - new Date(lhs.deadline).getTime()
    }
    if (sort === 'category') {
      return lhs.categoryTitle.localeCompare(rhs.categoryTitle) || sortTime(lhs) - sortTime(rhs)
    }
    return sortTime(lhs) - sortTime(rhs) || lhs.title.localeCompare(rhs.title)
  })
}

export const categoryForTask = (categories: PlannerCategory[], task: PlannerTaskItem) =>
  categories.find((category) => category.title === task.categoryTitle) ?? categories[0]

export const calendarChipLabel = (title: string) => normalizeTitle(title).slice(0, 4).padEnd(4, ' ')

export const normalizeTitle = (title: string) => title.trim().slice(0, 120)

function singleTaskFromDraft(
  draft: TaskDraft,
  occurrenceDeadlineDate: string | null,
  occurrenceStartDate: string | null,
  seriesID: string | null,
): PlannerTaskItem {
  let deadline = resolveDeadline(draft, occurrenceDeadlineDate)
  const startDate = resolveStartDate(draft, occurrenceStartDate, deadline)
  if (deadline !== null && startDate !== null && new Date(deadline) <= new Date(startDate)) {
    const adjustedDeadline = new Date(startDate)
    adjustedDeadline.setHours(adjustedDeadline.getHours() + 1)
    deadline = adjustedDeadline.toISOString()
  }

  return {
    id: crypto.randomUUID(),
    title: normalizeTitle(draft.title),
    categoryTitle: draft.categoryTitle,
    deadline,
    startDate,
    isCompleted: false,
    completedAt: null,
    seriesID,
  }
}

function taskWithDraftTime(task: PlannerTaskItem, draft: TaskDraft, occurrenceDateSource: string | null): PlannerTaskItem {
  const occurrenceDate = occurrenceDateSource === null ? draft.deadlineDate : dateKey(new Date(occurrenceDateSource))
  let deadline = draft.usesDeadline ? resolveDeadline(draft, occurrenceDate) : null
  const startDate = draft.usesDeadline ? resolveStartDate(draft, occurrenceDate, deadline) : null
  if (deadline !== null && startDate !== null && new Date(deadline) <= new Date(startDate)) {
    const adjustedDeadline = new Date(startDate)
    adjustedDeadline.setHours(adjustedDeadline.getHours() + 1)
    deadline = adjustedDeadline.toISOString()
  }
  return {
    ...task,
    deadline,
    startDate,
  }
}

function applyRepeatDraftPreservingDate(task: PlannerTaskItem, draft: TaskDraft): PlannerTaskItem {
  const updated = taskWithDraftTime(task, draft, task.deadline ?? task.startDate)
  return {
    ...updated,
    title: normalizeTitle(draft.title),
    categoryTitle: draft.categoryTitle,
  }
}

function resolveDeadline(draft: TaskDraft, occurrenceDate: string | null) {
  if (!draft.usesDeadline || occurrenceDate === null) return null
  const end = draft.hasSpecificTime || draft.usesDuration ? combineDateTime(occurrenceDate, draft.deadlineTime) : endOfDay(occurrenceDate)
  return end.toISOString()
}

function resolveStartDate(draft: TaskDraft, occurrenceDate: string | null, deadline: string | null) {
  if (!draft.usesDuration || occurrenceDate === null || deadline === null) return null
  const start = combineDateTime(occurrenceDate, draft.startTime)
  return start.toISOString()
}

function sortTime(task: PlannerTaskItem) {
  return task.deadline === null ? Number.MAX_SAFE_INTEGER : new Date(task.deadline).getTime()
}

function isLikelySameRepeat(candidate: PlannerTaskItem, task: PlannerTaskItem) {
  if (candidate.id === task.id || candidate.deadline === null || task.deadline === null) return false
  const candidateDeadline = new Date(candidate.deadline)
  const taskDeadline = new Date(task.deadline)
  return (
    candidate.title === task.title &&
    candidate.categoryTitle === task.categoryTitle &&
    candidateDeadline.getHours() === taskDeadline.getHours() &&
    candidateDeadline.getMinutes() === taskDeadline.getMinutes()
  )
}
