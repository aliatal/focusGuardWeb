import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import {
  addMonths,
  buildMonthGrid,
  dateKey,
  formatTaskTime,
  fullDateFormatter,
  homeDateFormatter,
  monthFormatter,
  parseDateKey,
  shortDateFormatter,
  today,
} from './dateUtils'
import {
  defaultCategories,
  loadAiCredits,
  loadCategories,
  loadNotes,
  loadPurchases,
  loadSettings,
  loadTasks,
  paletteOptions,
  pruneExpiredTasks,
  saveAiCredits,
  saveCategories,
  saveNotes,
  savePurchases,
  saveSettings,
  saveTasks,
} from './storage'
import {
  calendarChipLabel,
  categoryForTask,
  createEmptyDraft,
  deleteTaskSeries,
  draftFromTask,
  filterTasks,
  hasLaterRepeats,
  isDueToday,
  isOverdue,
  notebookFilteredTasks,
  sortTasks,
  tasksFromDraft,
  toggleTaskCompletion,
  updateTaskSeries,
} from './taskLogic'
import type {
  AiSuggestion,
  CompletedTaskRetentionDays,
  EditScope,
  NotebookFontSize,
  NotebookFontStyle,
  NotebookSort,
  Page,
  PlannerCategory,
  PlannerSettings,
  PlannerTaskItem,
  PurchaseRecord,
  ReminderOffset,
  TaskDraft,
  TaskSpecialFilter,
  TaskStatusFilter,
} from './types'

const navItems: Array<{ page: Page; label: string; accent: string }> = [
  { page: 'dashboard', label: 'Home', accent: 'home' },
  { page: 'tasklist', label: 'Tasklist', accent: 'tasklist' },
  { page: 'calendar', label: 'Calendar', accent: 'calendar' },
  { page: 'ai', label: 'AI', accent: 'ai' },
  { page: 'settings', label: 'Settings', accent: 'settings' },
]

const reminderOffsets: ReminderOffset[] = [
  'Off',
  '15 mins before',
  '30 mins before',
  '1 hour before',
  '2 hours before',
  '6 hours before',
  '12 hours before',
  '24 hours before',
  '48 hours before',
  '1 week before',
]

const creditPacks = [
  { label: 'Starter', price: 5, credits: 250 },
  { label: 'Plus', price: 10, credits: 600 },
  { label: 'Power', price: 20, credits: 1500 },
]

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const shortWeekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

type ScopeDialogState = {
  action: 'edit' | 'delete'
  task: PlannerTaskItem
}

type EditingState = {
  task: PlannerTaskItem
  draft: TaskDraft
  scope: EditScope
}

function App() {
  const [activePage, setActivePage] = useState<Page>('dashboard')
  const [settings, setSettings] = useState<PlannerSettings>(() => loadSettings())
  const [categories, setCategories] = useState<PlannerCategory[]>(() => loadCategories())
  const [tasks, setTasks] = useState<PlannerTaskItem[]>(() =>
    pruneExpiredTasks(loadTasks(), loadSettings().completedTaskRetentionDays),
  )
  const [notes, setNotes] = useState(() => loadNotes())
  const [taskDraft, setTaskDraft] = useState<TaskDraft>(() => createEmptyDraft(dateKey(today()), loadCategories()[0].title))
  const [taskStatusFilter, setTaskStatusFilter] = useState<TaskStatusFilter>('open')
  const [taskSpecialFilter, setTaskSpecialFilter] = useState<TaskSpecialFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today().getFullYear(), today().getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(dateKey(today()))
  const [scopeDialog, setScopeDialog] = useState<ScopeDialogState | null>(null)
  const [editing, setEditing] = useState<EditingState | null>(null)
  const [aiCredits, setAiCredits] = useState(() => loadAiCredits())
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseRecord[]>(() => loadPurchases())
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([])
  const [aiStatus, setAiStatus] = useState('AI import is mocked for MVP and structured for a Netlify Function.')
  const [aiPendingCost, setAiPendingCost] = useState(10)

  useEffect(() => saveTasks(tasks), [tasks])
  useEffect(() => saveNotes(notes), [notes])
  useEffect(() => saveCategories(categories), [categories])
  useEffect(() => saveSettings(settings), [settings])
  useEffect(() => saveAiCredits(aiCredits), [aiCredits])
  useEffect(() => savePurchases(purchaseHistory), [purchaseHistory])

  useEffect(() => {
    document.documentElement.dataset.theme = settings.themeMode
  }, [settings.themeMode])

  const openTasks = tasks.filter((task) => !task.isCompleted)
  const completedTasks = tasks.filter((task) => task.isCompleted)
  const dueTodayTasks = sortTasks(openTasks.filter(isDueToday))
  const overdueTasks = sortTasks(openTasks.filter((task) => isOverdue(task)))
  const upcomingTasks = sortTasks(openTasks.filter((task) => task.deadline !== null && !isDueToday(task) && !isOverdue(task))).slice(0, 8)
  const filteredTasks = useMemo(
    () => filterTasks(tasks, taskStatusFilter, taskSpecialFilter, categoryFilter),
    [categoryFilter, taskSpecialFilter, taskStatusFilter, tasks],
  )
  const selectedDayTasks = useMemo(
    () => sortTasks(tasks.filter((task) => task.deadline !== null && dateKey(new Date(task.deadline)) === selectedDate)),
    [selectedDate, tasks],
  )
  const calendarDays = useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth])

  const updateSettings = (patch: Partial<PlannerSettings>) => {
    setSettings((current) => ({ ...current, ...patch }))
    if (patch.completedTaskRetentionDays !== undefined) {
      setTasks((current) => pruneExpiredTasks(current, patch.completedTaskRetentionDays ?? settings.completedTaskRetentionDays))
    }
  }

  function addTasks(draft: TaskDraft) {
    const createdTasks = tasksFromDraft(draft)
    if (createdTasks.length === 0) return
    setTasks((current) => sortTasks([...current, ...createdTasks]))
    const trimmedNote = draft.note.trim()
    if (trimmedNote.length > 0) {
      setNotes((current) => ({
        ...current,
        ...Object.fromEntries(createdTasks.map((task) => [task.id, trimmedNote])),
      }))
    }
    setTaskDraft(createEmptyDraft(draft.deadlineDate, categories[0]?.title ?? 'General'))
  }

  function toggleTask(taskId: string) {
    setTasks((current) => current.map((task) => (task.id === taskId ? toggleTaskCompletion(task) : task)))
  }

  function requestEdit(task: PlannerTaskItem) {
    if (task.seriesID !== null || hasLaterRepeats(tasks, task)) {
      setScopeDialog({ action: 'edit', task })
      return
    }
    setEditing({ task, draft: draftFromTask(task, notes[task.id] ?? ''), scope: 'onlyThisTask' })
  }

  function requestDelete(task: PlannerTaskItem) {
    if (task.seriesID !== null || hasLaterRepeats(tasks, task)) {
      setScopeDialog({ action: 'delete', task })
      return
    }
    setTasks((current) => current.filter((candidate) => candidate.id !== task.id))
  }

  function applyScope(scope: EditScope) {
    if (scopeDialog === null) return
    if (scopeDialog.action === 'delete') {
      setTasks((current) => deleteTaskSeries(current, scopeDialog.task, scope))
      setScopeDialog(null)
      return
    }
    setEditing({
      task: scopeDialog.task,
      draft: draftFromTask(scopeDialog.task, notes[scopeDialog.task.id] ?? ''),
      scope,
    })
    setScopeDialog(null)
  }

  function saveEdit(draft: TaskDraft) {
    if (editing === null) return
    setTasks((current) => updateTaskSeries(current, editing.task, draft, editing.scope))
    setNotes((current) => {
      const next = { ...current }
      const trimmed = draft.note.trim()
      if (trimmed.length === 0) delete next[editing.task.id]
      else next[editing.task.id] = trimmed
      return next
    })
    setEditing(null)
  }

  function selectCalendarDate(nextDate: string) {
    setSelectedDate(nextDate)
    setTaskDraft((current) => ({
      ...current,
      usesDeadline: true,
      deadlineDate: nextDate,
      startDate: nextDate,
      repeatEndDate: current.repeatEndDate < nextDate ? nextDate : current.repeatEndDate,
    }))
  }

  function addCategory(category: PlannerCategory) {
    if (categories.length >= 8) return
    setCategories((current) => [...current, category])
  }

  function updateCategory(category: PlannerCategory) {
    setCategories((current) => current.map((item) => (item.id === category.id ? category : item)))
  }

  function deleteCategory(category: PlannerCategory) {
    if (category.isDefault) return
    setCategories((current) => current.filter((item) => item.id !== category.id))
    setTasks((current) =>
      current.map((task) =>
        task.categoryTitle === category.title ? { ...task, categoryTitle: defaultCategories[0].title } : task,
      ),
    )
  }

  function buyCredits(pack: (typeof creditPacks)[number]) {
    const record = {
      id: crypto.randomUUID(),
      label: pack.label,
      price: pack.price,
      credits: pack.credits,
      createdAt: new Date().toISOString(),
    }
    setAiCredits((current) => current + pack.credits)
    setPurchaseHistory((current) => [record, ...current])
    setAiStatus(`Added ${pack.credits} credits locally. Stripe Checkout will replace this MVP action.`)
  }

  function mockAiImport(kind: 'photo' | 'pdf' | 'cleanup' | 'dayPlan') {
    const cost = kind === 'photo' ? 10 : kind === 'pdf' ? 18 : kind === 'cleanup' ? 15 : 8
    setAiPendingCost(cost)
    if (aiCredits < cost) {
      setAiStatus(`Not enough credits. This action needs ${cost} credits.`)
      return
    }
    const baseDate = dateKey(today())
    const suggestions: AiSuggestion[] = [
      {
        id: crypto.randomUUID(),
        title: kind === 'dayPlan' ? "Review today's highest priority work" : 'Review imported assignment dates',
        categoryTitle: categories[0]?.title ?? 'General',
        deadlineDate: baseDate,
        deadlineTime: '16:00',
        selected: true,
      },
      {
        id: crypto.randomUUID(),
        title: kind === 'pdf' ? 'Extract course outline milestones' : 'Confirm schedule conflicts',
        categoryTitle: categories[0]?.title ?? 'General',
        deadlineDate: dateKey(new Date(today().getFullYear(), today().getMonth(), today().getDate() + 2)),
        deadlineTime: '12:00',
        selected: true,
      },
    ]
    setAiSuggestions(suggestions)
    setAiStatus('Review the extracted suggestions before adding them. Credits deduct after confirmation.')
  }

  function confirmAiSuggestions() {
    const selected = aiSuggestions.filter((suggestion) => suggestion.selected)
    if (selected.length === 0) {
      setAiStatus('Select at least one suggestion to add.')
      return
    }
    const importedTasks = selected.flatMap((suggestion) =>
      tasksFromDraft({
        ...createEmptyDraft(suggestion.deadlineDate, suggestion.categoryTitle),
        title: suggestion.title,
        hasSpecificTime: true,
        deadlineTime: suggestion.deadlineTime,
      }),
    )
    setTasks((current) => sortTasks([...current, ...importedTasks]))
    setAiCredits((current) => Math.max(0, current - aiPendingCost))
    setAiSuggestions([])
    setAiStatus(`Added ${importedTasks.length} task${importedTasks.length === 1 ? '' : 's'} and used ${aiPendingCost} credits.`)
  }

  function renderPage() {
    switch (activePage) {
      case 'dashboard':
        return (
          <DashboardPage
            settings={settings}
            tasks={tasks}
            categories={categories}
            notes={notes}
            dueTodayTasks={dueTodayTasks}
            overdueTasks={overdueTasks}
            upcomingTasks={upcomingTasks}
            openCount={openTasks.length}
            completedCount={completedTasks.length}
            onSettingsChange={updateSettings}
            onToggleTask={toggleTask}
            onEditTask={requestEdit}
            onDeleteTask={requestDelete}
            onOpenCalendar={(nextDate) => {
              setActivePage('calendar')
              selectCalendarDate(nextDate)
            }}
          />
        )
      case 'tasklist':
        return (
          <TasklistPage
            categories={categories}
            settings={settings}
            draft={taskDraft}
            filteredTasks={filteredTasks}
            notes={notes}
            statusFilter={taskStatusFilter}
            specialFilter={taskSpecialFilter}
            categoryFilter={categoryFilter}
            onDraftChange={setTaskDraft}
            onAddTasks={addTasks}
            onStatusFilterChange={setTaskStatusFilter}
            onSpecialFilterChange={setTaskSpecialFilter}
            onCategoryFilterChange={setCategoryFilter}
            onToggleTask={toggleTask}
            onEditTask={requestEdit}
            onDeleteTask={requestDelete}
            onOpenCalendar={(nextDate) => {
              setActivePage('calendar')
              selectCalendarDate(nextDate)
            }}
          />
        )
      case 'calendar':
        return (
          <CalendarPage
            visibleMonth={visibleMonth}
            calendarDays={calendarDays}
            selectedDate={selectedDate}
            selectedDayTasks={selectedDayTasks}
            tasks={tasks}
            categories={categories}
            settings={settings}
            notes={notes}
            draft={taskDraft}
            onDraftChange={setTaskDraft}
            onAddTasks={addTasks}
            onMonthChange={(direction) => setVisibleMonth((current) => addMonths(current, direction))}
            onSelectDate={selectCalendarDate}
            onToggleTask={toggleTask}
            onEditTask={requestEdit}
            onDeleteTask={requestDelete}
          />
        )
      case 'ai':
        return (
          <AiPage
            credits={aiCredits}
            purchaseHistory={purchaseHistory}
            suggestions={aiSuggestions}
            status={aiStatus}
            pendingCost={aiPendingCost}
            onBuyCredits={buyCredits}
            onMockImport={mockAiImport}
            onSuggestionChange={setAiSuggestions}
            onConfirmSuggestions={confirmAiSuggestions}
          />
        )
      case 'settings':
        return (
          <SettingsPage
            settings={settings}
            categories={categories}
            credits={aiCredits}
            purchaseHistory={purchaseHistory}
            onSettingsChange={updateSettings}
            onAddCategory={addCategory}
            onUpdateCategory={updateCategory}
            onDeleteCategory={deleteCategory}
          />
        )
    }
  }

  return (
    <main className={`app-frame page-${activePage}`}>
      <aside className="app-sidebar" aria-label="Main navigation">
        <div className="brand">
          <div className="brand-mark">FG</div>
          <div>
            <strong>FocusGuard</strong>
            <span>Planner workspace</span>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => (
            <button
              className={activePage === item.page ? `active ${item.accent}` : item.accent}
              type="button"
              key={item.page}
              onClick={() => setActivePage(item.page)}
            >
              <span className="nav-dot" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-summary">
          <span>Today</span>
          <strong>{dueTodayTasks.length} due</strong>
          <small>{overdueTasks.length} overdue</small>
        </div>
      </aside>

      <section className="app-content">{renderPage()}</section>

      <nav className="mobile-tabbar" aria-label="Mobile navigation">
        {navItems.map((item) => (
          <button
            className={activePage === item.page ? `active ${item.accent}` : item.accent}
            type="button"
            key={item.page}
            onClick={() => setActivePage(item.page)}
          >
            <span className="nav-dot" />
            {item.label}
          </button>
        ))}
      </nav>

      {scopeDialog ? (
        <ScopeDialog
          task={scopeDialog.task}
          action={scopeDialog.action}
          onSelect={applyScope}
          onClose={() => setScopeDialog(null)}
        />
      ) : null}

      {editing ? (
        <TaskEditorDialog
          editing={editing}
          categories={categories}
          settings={settings}
          onSave={saveEdit}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </main>
  )
}

function DashboardPage({
  settings,
  tasks,
  categories,
  notes,
  dueTodayTasks,
  overdueTasks,
  upcomingTasks,
  openCount,
  completedCount,
  onSettingsChange,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onOpenCalendar,
}: {
  settings: PlannerSettings
  tasks: PlannerTaskItem[]
  categories: PlannerCategory[]
  notes: Record<string, string>
  dueTodayTasks: PlannerTaskItem[]
  overdueTasks: PlannerTaskItem[]
  upcomingTasks: PlannerTaskItem[]
  openCount: number
  completedCount: number
  onSettingsChange: (patch: Partial<PlannerSettings>) => void
  onToggleTask: (taskId: string) => void
  onEditTask: (task: PlannerTaskItem) => void
  onDeleteTask: (task: PlannerTaskItem) => void
  onOpenCalendar: (date: string) => void
}) {
  const notebookTasks = notebookFilteredTasks(tasks, settings.notebookSort)
  const oneTimeTasks = notebookTasks.filter((task) => task.seriesID === null)
  const recurringTasks = notebookTasks.filter((task) => task.seriesID !== null)

  return (
    <div className="page">
      <PageHeader
        eyebrow="Dashboard"
        title="Today"
        detail={homeDateFormatter.format(today())}
      />

      <section className="metric-strip" aria-label="Planner summary">
        <MetricCard label="Open tasks" value={openCount} />
        <MetricCard label="Completed" value={completedCount} />
        <MetricCard label="Due today" value={dueTodayTasks.length} />
        <MetricCard label="Overdue" value={overdueTasks.length} tone={overdueTasks.length > 0 ? 'danger' : 'normal'} />
      </section>

      <section className="dashboard-grid">
        {overdueTasks.length > 0 ? (
          <Panel title="Overdue" detail={`${overdueTasks.length} needs attention`} tone="danger">
            <TaskStack
              tasks={overdueTasks}
              categories={categories}
              settings={settings}
              notes={notes}
              onToggleTask={onToggleTask}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              onOpenCalendar={onOpenCalendar}
            />
          </Panel>
        ) : null}

        <Panel title="Due today" detail={`${dueTodayTasks.length} tasks`}>
          <TaskStack
            tasks={dueTodayTasks}
            categories={categories}
            settings={settings}
            notes={notes}
            emptyTitle="No open tasks due today"
            emptyDetail="Add a task with today as its deadline when something comes up."
            onToggleTask={onToggleTask}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            onOpenCalendar={onOpenCalendar}
          />
        </Panel>

        <Panel title="Upcoming" detail="Next deadlines">
          <TaskStack
            tasks={upcomingTasks}
            categories={categories}
            settings={settings}
            notes={notes}
            emptyTitle="No scheduled upcoming work"
            emptyDetail="Tasks with deadlines will appear here after today."
            onToggleTask={onToggleTask}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            onOpenCalendar={onOpenCalendar}
          />
        </Panel>

        <section className={`notebook-panel ${settings.notebookFontStyle} ${settings.notebookFontSize}`}>
          <div className="notebook-toolbar">
            <div>
              <p className="eyebrow">Notebook overview</p>
              <h2>{homeDateFormatter.format(today())}</h2>
            </div>
            <div className="control-cluster">
              <SelectField
                label="Sort"
                value={settings.notebookSort}
                onChange={(value) => onSettingsChange({ notebookSort: value as NotebookSort })}
                options={[
                  ['dateAscending', 'Date ascending'],
                  ['dateDescending', 'Date descending'],
                  ['category', 'Category'],
                  ['today', 'Today'],
                  ['tomorrow', 'Tomorrow'],
                  ['thisWeek', 'This week'],
                  ['nextWeek', 'Next week'],
                  ['thisMonth', 'This month'],
                  ['nextMonth', 'Next month'],
                ]}
              />
              <SelectField
                label="Font"
                value={settings.notebookFontStyle}
                onChange={(value) => onSettingsChange({ notebookFontStyle: value as NotebookFontStyle })}
                options={[
                  ['system', 'System'],
                  ['rounded', 'Rounded'],
                  ['serif', 'Serif'],
                ]}
              />
              <SelectField
                label="Size"
                value={settings.notebookFontSize}
                onChange={(value) => onSettingsChange({ notebookFontSize: value as NotebookFontSize })}
                options={[
                  ['compact', 'Compact'],
                  ['medium', 'Medium'],
                  ['large', 'Large'],
                ]}
              />
            </div>
          </div>

          <NotebookSection
            title="One-Time"
            tasks={oneTimeTasks}
            categories={categories}
            settings={settings}
            notes={notes}
            emptyTitle="No one-time tasks in this view"
            onToggleTask={onToggleTask}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
          />
          <NotebookSection
            title="Recurring"
            tasks={recurringTasks}
            categories={categories}
            settings={settings}
            notes={notes}
            emptyTitle="No recurring tasks in this view"
            onToggleTask={onToggleTask}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
          />
        </section>
      </section>
    </div>
  )
}

function TasklistPage({
  categories,
  settings,
  draft,
  filteredTasks,
  notes,
  statusFilter,
  specialFilter,
  categoryFilter,
  onDraftChange,
  onAddTasks,
  onStatusFilterChange,
  onSpecialFilterChange,
  onCategoryFilterChange,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onOpenCalendar,
}: {
  categories: PlannerCategory[]
  settings: PlannerSettings
  draft: TaskDraft
  filteredTasks: PlannerTaskItem[]
  notes: Record<string, string>
  statusFilter: TaskStatusFilter
  specialFilter: TaskSpecialFilter
  categoryFilter: string
  onDraftChange: (draft: TaskDraft) => void
  onAddTasks: (draft: TaskDraft) => void
  onStatusFilterChange: (filter: TaskStatusFilter) => void
  onSpecialFilterChange: (filter: TaskSpecialFilter) => void
  onCategoryFilterChange: (filter: string) => void
  onToggleTask: (taskId: string) => void
  onEditTask: (task: PlannerTaskItem) => void
  onDeleteTask: (task: PlannerTaskItem) => void
  onOpenCalendar: (date: string) => void
}) {
  return (
    <div className="page">
      <PageHeader eyebrow="Tasklist" title="Task manager" detail={`${filteredTasks.length} shown`} />

      <section className="tasks-layout">
        <Panel title="Add task" detail="Manual planning">
          <TaskForm
            draft={draft}
            categories={categories}
            settings={settings}
            submitLabel={draft.repeats ? 'Add repeats' : 'Add task'}
            onDraftChange={onDraftChange}
            onSubmit={onAddTasks}
          />
        </Panel>

        <Panel title="Tasks" detail="Create, edit, complete, delete" className="task-browser">
          <div className="filters-bar">
            <Segmented
              value={statusFilter}
              onChange={(value) => onStatusFilterChange(value as TaskStatusFilter)}
              items={[
                ['open', 'Open'],
                ['completed', 'Completed'],
                ['all', 'All'],
              ]}
            />
            <SelectField
              label="Filter"
              value={specialFilter}
              onChange={(value) => onSpecialFilterChange(value as TaskSpecialFilter)}
              options={[
                ['all', 'All tasks'],
                ['dueToday', 'Due today'],
                ['overdue', 'Overdue'],
                ['noDeadline', 'No deadline'],
              ]}
            />
            {settings.categoriesEnabled ? (
              <SelectField
                label="Category"
                value={categoryFilter}
                onChange={onCategoryFilterChange}
                options={[['All', 'All categories'], ...categories.map((category) => [category.title, category.title] as const)]}
              />
            ) : null}
          </div>

          <TaskStack
            tasks={filteredTasks}
            categories={categories}
            settings={settings}
            notes={notes}
            emptyTitle="No tasks match these filters"
            emptyDetail="Change the filters or add a task from the form."
            onToggleTask={onToggleTask}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            onOpenCalendar={onOpenCalendar}
          />
        </Panel>
      </section>
    </div>
  )
}

function CalendarPage({
  visibleMonth,
  calendarDays,
  selectedDate,
  selectedDayTasks,
  tasks,
  categories,
  settings,
  notes,
  draft,
  onDraftChange,
  onAddTasks,
  onMonthChange,
  onSelectDate,
  onToggleTask,
  onEditTask,
  onDeleteTask,
}: {
  visibleMonth: Date
  calendarDays: Date[]
  selectedDate: string
  selectedDayTasks: PlannerTaskItem[]
  tasks: PlannerTaskItem[]
  categories: PlannerCategory[]
  settings: PlannerSettings
  notes: Record<string, string>
  draft: TaskDraft
  onDraftChange: (draft: TaskDraft) => void
  onAddTasks: (draft: TaskDraft) => void
  onMonthChange: (direction: -1 | 1) => void
  onSelectDate: (date: string) => void
  onToggleTask: (taskId: string) => void
  onEditTask: (task: PlannerTaskItem) => void
  onDeleteTask: (task: PlannerTaskItem) => void
}) {
  return (
    <div className="page">
      <PageHeader
        eyebrow={`${visibleMonth.getFullYear()}`}
        title={monthFormatter.format(visibleMonth)}
        detail="Month calendar"
        action={
          <div className="month-controls">
            <button type="button" onClick={() => onMonthChange(-1)} aria-label="Previous month">
              Previous
            </button>
            <button type="button" onClick={() => onMonthChange(1)} aria-label="Next month">
              Next
            </button>
          </div>
        }
      />

      <section className="calendar-workspace">
        <div className="calendar-surface">
          <div className="weekday-row" aria-hidden="true">
            {weekdays.map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {calendarDays.map((day) => {
              const key = dateKey(day)
              const dayTasks = sortTasks(tasks.filter((task) => task.deadline !== null && dateKey(new Date(task.deadline)) === key))
              const isSelected = key === selectedDate
              const isToday = key === dateKey(today())
              const isOutside = day.getMonth() !== visibleMonth.getMonth()
              return (
                <button
                  className={[
                    'day-cell',
                    isSelected ? 'selected' : '',
                    isToday ? 'today' : '',
                    isOutside ? 'outside-month' : '',
                  ].join(' ')}
                  type="button"
                  key={key}
                  onClick={() => onSelectDate(key)}
                >
                  <span className="day-topline">
                    <span className="mobile-weekday">{shortWeekdays[day.getDay()]}</span>
                    <span className="day-number">{day.getDate()}</span>
                  </span>
                  <span className="task-chip-stack">
                    {dayTasks.slice(0, 3).map((task) => {
                      const category = categoryForTask(categories, task)
                      return (
                        <span className="task-chip" style={{ backgroundColor: category.color }} key={task.id}>
                          {calendarChipLabel(task.title)}
                        </span>
                      )
                    })}
                    {dayTasks.length > 3 ? <span className="task-chip overflow">+{dayTasks.length - 3}</span> : null}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <aside className="selected-day-panel">
          <Panel title={fullDateFormatter.format(parseDateKey(selectedDate))} detail={`${selectedDayTasks.length} tasks`}>
            <TaskForm
              draft={draft}
              categories={categories}
              settings={settings}
              compact
              submitLabel="Add to date"
              onDraftChange={onDraftChange}
              onSubmit={onAddTasks}
            />
            <TaskStack
              tasks={selectedDayTasks}
              categories={categories}
              settings={settings}
              notes={notes}
              emptyTitle="Nothing scheduled"
              emptyDetail="Use the form above to add a task to this date."
              onToggleTask={onToggleTask}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
            />
          </Panel>
        </aside>
      </section>
    </div>
  )
}

function AiPage({
  credits,
  purchaseHistory,
  suggestions,
  status,
  pendingCost,
  onBuyCredits,
  onMockImport,
  onSuggestionChange,
  onConfirmSuggestions,
}: {
  credits: number
  purchaseHistory: PurchaseRecord[]
  suggestions: AiSuggestion[]
  status: string
  pendingCost: number
  onBuyCredits: (pack: (typeof creditPacks)[number]) => void
  onMockImport: (kind: 'photo' | 'pdf' | 'cleanup' | 'dayPlan') => void
  onSuggestionChange: (suggestions: AiSuggestion[]) => void
  onConfirmSuggestions: () => void
}) {
  return (
    <div className="page">
      <PageHeader eyebrow="AI" title="Credits and import" detail={`${credits} credits available`} />

      <section className="ai-grid">
        <Panel title="Credit balance" detail="Paid AI only">
          <div className="credit-balance">
            <span>Current balance</span>
            <strong>{credits}</strong>
            <p>Free users get manual planning. AI actions require purchased credits and no browser-side OpenAI key.</p>
          </div>
        </Panel>

        <Panel title="Buy credits" detail="$5 minimum" className="wide-panel">
          <div className="pricing-grid">
            {creditPacks.map((pack) => (
              <article className="price-card" key={pack.label}>
                <span>{pack.label}</span>
                <strong>${pack.price}</strong>
                <p>{pack.credits} credits</p>
                <button type="button" onClick={() => onBuyCredits(pack)}>
                  Stripe checkout later
                </button>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="AI import actions" detail="Mock backend response">
          <div className="action-list">
            <ActionButton title="Import screenshot/photo" detail="10 credits minimum" onClick={() => onMockImport('photo')} />
            <ActionButton title="Import PDF" detail="Scales by file size/pages, capped" onClick={() => onMockImport('pdf')} />
            <ActionButton title="Schedule cleanup" detail="15 credits" onClick={() => onMockImport('cleanup')} />
            <ActionButton title="Day plan" detail="8 credits" onClick={() => onMockImport('dayPlan')} />
          </div>
          <StatusBlock>{status}</StatusBlock>
        </Panel>

        <Panel title="Review suggestions" detail={`${pendingCost} credits on confirm`}>
          {suggestions.length === 0 ? (
            <EmptyState title="No suggestions waiting" detail="Run an import action to review extracted task suggestions before adding them." />
          ) : (
            <div className="suggestion-list">
              {suggestions.map((suggestion) => (
                <label className="suggestion-row" key={suggestion.id}>
                  <input
                    type="checkbox"
                    checked={suggestion.selected}
                    onChange={(event) =>
                      onSuggestionChange(
                        suggestions.map((item) =>
                          item.id === suggestion.id ? { ...item, selected: event.target.checked } : item,
                        ),
                      )
                    }
                  />
                  <span>
                    <strong>{suggestion.title}</strong>
                    <small>
                      {shortDateFormatter.format(parseDateKey(suggestion.deadlineDate))} at {suggestion.deadlineTime}
                    </small>
                  </span>
                </label>
              ))}
              <button className="primary-button" type="button" onClick={onConfirmSuggestions}>
                Add selected tasks
              </button>
            </div>
          )}
        </Panel>

        <Panel title="Architecture" detail="Production path" className="wide-panel">
          <div className="architecture-grid">
            <RuleItem title="Browser" value="Calls serverless function" />
            <RuleItem title="Function" value="Checks auth and credits" />
            <RuleItem title="OpenAI" value="Server-side only" />
            <RuleItem title="Credits" value="Deduct after accepted result" />
          </div>
        </Panel>

        <Panel title="Payments" detail="Purchase history">
          {purchaseHistory.length === 0 ? (
            <EmptyState title="No local purchases yet" detail="MVP purchases are stored locally until Stripe Checkout is wired." />
          ) : (
            <div className="history-list">
              {purchaseHistory.slice(0, 5).map((record) => (
                <div className="history-row" key={record.id}>
                  <span>{record.label}</span>
                  <strong>
                    ${record.price} / {record.credits}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </section>
    </div>
  )
}

function SettingsPage({
  settings,
  categories,
  credits,
  purchaseHistory,
  onSettingsChange,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
}: {
  settings: PlannerSettings
  categories: PlannerCategory[]
  credits: number
  purchaseHistory: PurchaseRecord[]
  onSettingsChange: (patch: Partial<PlannerSettings>) => void
  onAddCategory: (category: PlannerCategory) => void
  onUpdateCategory: (category: PlannerCategory) => void
  onDeleteCategory: (category: PlannerCategory) => void
}) {
  const [categoryDraft, setCategoryDraft] = useState({
    title: '',
    symbol: 'tag.fill',
    color: paletteOptions[0],
  })

  function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = categoryDraft.title.trim().slice(0, 32)
    if (title.length === 0 || categories.length >= 8) return
    onAddCategory({
      id: crypto.randomUUID(),
      title,
      symbol: categoryDraft.symbol,
      color: categoryDraft.color,
      isDefault: false,
    })
    setCategoryDraft({ title: '', symbol: 'tag.fill', color: categoryDraft.color })
  }

  return (
    <div className="page">
      <PageHeader eyebrow="Settings" title="Preferences" detail={settings.themeMode === 'system' ? 'System theme' : `${settings.themeMode} theme`} />

      <section className="settings-grid">
        <Panel title="Account" detail="Supabase later">
          <div className="account-box">
            <strong>Local profile</strong>
            <span>Auth is intentionally not mocked as a real login. Supabase auth will own sessions, users, and server-checked credits.</span>
          </div>
        </Panel>

        <Panel title="Notifications" detail="Reminders">
          <ToggleRow
            label="Enable reminders"
            checked={settings.notificationsEnabled}
            onChange={(value) => onSettingsChange({ notificationsEnabled: value })}
          />
          <ToggleRow
            label="Device feedback"
            checked={settings.deviceFeedbackEnabled}
            disabled={!settings.notificationsEnabled}
            onChange={(value) => onSettingsChange({ deviceFeedbackEnabled: value })}
          />
          <ToggleRow
            label="Due-time notification"
            checked={settings.taskNotifyAtStart}
            disabled={!settings.notificationsEnabled}
            onChange={(value) => onSettingsChange({ taskNotifyAtStart: value })}
          />
          <ToggleRow
            label="Email reminders"
            checked={settings.emailReminders}
            disabled={!settings.notificationsEnabled}
            onChange={(value) => onSettingsChange({ emailReminders: value })}
          />
          <SelectField
            label="Reminder 1"
            value={settings.reminderOffset1}
            onChange={(value) => onSettingsChange({ reminderOffset1: value as ReminderOffset })}
            options={reminderOffsets.map((offset) => [offset, offset])}
          />
          <SelectField
            label="Reminder 2"
            value={settings.reminderOffset2}
            onChange={(value) => onSettingsChange({ reminderOffset2: value as ReminderOffset })}
            options={reminderOffsets.map((offset) => [offset, offset])}
          />
        </Panel>

        <Panel title="Categories" detail={`${categories.length}/8`}>
          <ToggleRow
            label="Enable categories"
            checked={settings.categoriesEnabled}
            onChange={(value) => onSettingsChange({ categoriesEnabled: value })}
          />
          <form className="category-form" onSubmit={submitCategory}>
            <input
              aria-label="Category title"
              placeholder="Category title"
              value={categoryDraft.title}
              onChange={(event) => setCategoryDraft((current) => ({ ...current, title: event.target.value }))}
              maxLength={32}
            />
            <select
              aria-label="Category symbol"
              value={categoryDraft.symbol}
              onChange={(event) => setCategoryDraft((current) => ({ ...current, symbol: event.target.value }))}
            >
              <option value="tag.fill">Tag</option>
              <option value="book.fill">Book</option>
              <option value="briefcase.fill">Work</option>
              <option value="calendar">Calendar</option>
            </select>
            <div className="palette-row">
              {paletteOptions.map((color) => (
                <button
                  className={categoryDraft.color === color ? 'selected' : ''}
                  type="button"
                  key={color}
                  aria-label={`Use ${color}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setCategoryDraft((current) => ({ ...current, color }))}
                />
              ))}
            </div>
            <button className="primary-button" type="submit" disabled={categories.length >= 8}>
              Add category
            </button>
          </form>
          <div className="category-list">
            {categories.map((category) => (
              <div className="category-row" key={category.id}>
                <span className="category-swatch" style={{ backgroundColor: category.color }} />
                <input
                  aria-label={`${category.title} title`}
                  value={category.title}
                  disabled={category.isDefault}
                  onChange={(event) => onUpdateCategory({ ...category, title: event.target.value.slice(0, 32) })}
                />
                <input
                  aria-label={`${category.title} color`}
                  type="color"
                  value={category.color}
                  onChange={(event) => onUpdateCategory({ ...category, color: event.target.value })}
                />
                <button type="button" disabled={category.isDefault} onClick={() => onDeleteCategory(category)}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Task cleanup" detail="Completed retention">
          <SelectField
            label="Keep completed tasks"
            value={String(settings.completedTaskRetentionDays)}
            onChange={(value) =>
              onSettingsChange({ completedTaskRetentionDays: Number(value) as CompletedTaskRetentionDays })
            }
            options={[
              ['7', '7 days'],
              ['30', '30 days'],
              ['60', '60 days'],
              ['90', '90 days'],
              ['-1', 'Never'],
            ]}
          />
          <StatusBlock>Completed tasks are pruned automatically unless retention is set to Never.</StatusBlock>
        </Panel>

        <Panel title="Appearance" detail="Theme">
          <Segmented
            value={settings.themeMode}
            onChange={(value) => onSettingsChange({ themeMode: value as PlannerSettings['themeMode'] })}
            items={[
              ['system', 'System'],
              ['light', 'Light'],
              ['dark', 'Dark'],
            ]}
          />
          <SelectField
            label="Background"
            value={settings.backgroundStyle}
            onChange={(value) => onSettingsChange({ backgroundStyle: value as PlannerSettings['backgroundStyle'] })}
            options={[
              ['automatic', 'Automatic'],
              ['prism', 'Prism'],
              ['lattice', 'Lattice'],
              ['rings', 'Rings'],
            ]}
          />
        </Panel>

        <Panel title="Payments" detail="Stripe later">
          <StatusRow label="Current credits" value={String(credits)} />
          <StatusRow label="Local purchases" value={String(purchaseHistory.length)} />
          <StatusBlock>Stripe Checkout and webhook fulfillment should run server-side before adding production credits.</StatusBlock>
        </Panel>
      </section>
    </div>
  )
}

function TaskForm({
  draft,
  categories,
  settings,
  submitLabel,
  compact = false,
  onDraftChange,
  onSubmit,
}: {
  draft: TaskDraft
  categories: PlannerCategory[]
  settings: PlannerSettings
  submitLabel: string
  compact?: boolean
  onDraftChange: (draft: TaskDraft) => void
  onSubmit: (draft: TaskDraft) => void
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(draft)
  }

  return (
    <form className={`task-form ${compact ? 'compact' : ''}`} onSubmit={submit}>
      <label className="field full">
        <span>Title</span>
        <input
          value={draft.title}
          maxLength={120}
          placeholder="Task title"
          onChange={(event) => onDraftChange({ ...draft, title: event.target.value.slice(0, 120) })}
        />
      </label>

      {settings.categoriesEnabled ? (
        <label className="field">
          <span>Category</span>
          <select
            value={draft.categoryTitle}
            onChange={(event) => onDraftChange({ ...draft, categoryTitle: event.target.value })}
          >
            {categories.map((category) => (
              <option key={category.id}>{category.title}</option>
            ))}
          </select>
        </label>
      ) : null}

      <ToggleRow
        label="Deadline"
        checked={draft.usesDeadline}
        onChange={(value) => onDraftChange({ ...draft, usesDeadline: value })}
      />

      {draft.usesDeadline ? (
        <>
          <label className="field">
            <span>Date</span>
            <input
              type="date"
              value={draft.deadlineDate}
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  deadlineDate: event.target.value,
                  startDate: draft.usesDuration ? event.target.value : draft.startDate,
                  repeatEndDate: draft.repeatEndDate < event.target.value ? event.target.value : draft.repeatEndDate,
                })
              }
            />
          </label>
          <ToggleRow
            label="Specific time"
            checked={draft.hasSpecificTime}
            onChange={(value) => onDraftChange({ ...draft, hasSpecificTime: value, usesDuration: value ? draft.usesDuration : false })}
          />
          {draft.hasSpecificTime ? (
            <label className="field">
              <span>Due time</span>
              <input
                type="time"
                value={draft.deadlineTime}
                onChange={(event) => onDraftChange({ ...draft, deadlineTime: event.target.value })}
              />
            </label>
          ) : null}
          <ToggleRow
            label="Duration"
            checked={draft.usesDuration}
            onChange={(value) => onDraftChange({ ...draft, usesDuration: value, hasSpecificTime: value ? true : draft.hasSpecificTime })}
          />
          {draft.usesDuration ? (
            <>
              <label className="field">
                <span>Start date</span>
                <input
                  type="date"
                  value={draft.startDate}
                  onChange={(event) => onDraftChange({ ...draft, startDate: event.target.value })}
                />
              </label>
              <label className="field">
                <span>Start time</span>
                <input
                  type="time"
                  value={draft.startTime}
                  onChange={(event) => onDraftChange({ ...draft, startTime: event.target.value })}
                />
              </label>
            </>
          ) : null}
          <ToggleRow
            label="Repeating"
            checked={draft.repeats}
            onChange={(value) => onDraftChange({ ...draft, repeats: value })}
          />
          {draft.repeats ? (
            <>
              <div className="weekday-picker">
                {weekdays.map((weekday, index) => (
                  <button
                    className={draft.repeatWeekdays.includes(index) ? 'active' : ''}
                    type="button"
                    key={weekday}
                    onClick={() => {
                      const next = draft.repeatWeekdays.includes(index)
                        ? draft.repeatWeekdays.filter((day) => day !== index)
                        : [...draft.repeatWeekdays, index].sort()
                      onDraftChange({ ...draft, repeatWeekdays: next.length === 0 ? [index] : next })
                    }}
                  >
                    {weekday}
                  </button>
                ))}
              </div>
              <label className="field">
                <span>Repeat until</span>
                <input
                  type="date"
                  value={draft.repeatEndDate}
                  min={draft.deadlineDate}
                  onChange={(event) => onDraftChange({ ...draft, repeatEndDate: event.target.value })}
                />
              </label>
            </>
          ) : null}
        </>
      ) : null}

      <label className="field full">
        <span>Note</span>
        <textarea
          value={draft.note}
          rows={compact ? 2 : 3}
          placeholder="Notes for this task"
          onChange={(event) => onDraftChange({ ...draft, note: event.target.value })}
        />
      </label>

      <button className="primary-button full" type="submit">
        {submitLabel}
      </button>
    </form>
  )
}

function TaskStack({
  tasks,
  categories,
  settings,
  notes,
  emptyTitle = 'No tasks',
  emptyDetail = 'Tasks appear here when they match this view.',
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onOpenCalendar,
}: {
  tasks: PlannerTaskItem[]
  categories: PlannerCategory[]
  settings: PlannerSettings
  notes: Record<string, string>
  emptyTitle?: string
  emptyDetail?: string
  onToggleTask: (taskId: string) => void
  onEditTask: (task: PlannerTaskItem) => void
  onDeleteTask: (task: PlannerTaskItem) => void
  onOpenCalendar?: (date: string) => void
}) {
  if (tasks.length === 0) return <EmptyState title={emptyTitle} detail={emptyDetail} />

  return (
    <div className="task-stack">
      {tasks.map((task) => {
        const category = categoryForTask(categories, task)
        const calendarDate = task.deadline === null ? null : dateKey(new Date(task.deadline))
        return (
          <article className={`task-row ${task.isCompleted ? 'completed' : ''}`} key={task.id}>
            <label className="task-check">
              <input type="checkbox" checked={task.isCompleted} onChange={() => onToggleTask(task.id)} />
              <span />
            </label>
            <button className="task-main" type="button" onClick={() => onEditTask(task)}>
              <strong>{task.title}</strong>
              <small>
                {formatTaskTime(task.deadline, task.startDate)}
                {settings.categoriesEnabled ? ` / ${task.categoryTitle}` : ''}
                {task.seriesID !== null ? ' / Repeats' : ''}
              </small>
              {notes[task.id] ? <em>{notes[task.id]}</em> : null}
            </button>
            {settings.categoriesEnabled ? <span className="category-chip" style={{ color: category.color }}>{category.title}</span> : null}
            <div className="task-actions">
              {calendarDate && onOpenCalendar ? (
                <button type="button" onClick={() => onOpenCalendar(calendarDate)}>
                  Calendar
                </button>
              ) : null}
              <button type="button" onClick={() => onEditTask(task)}>
                Edit
              </button>
              <button className="danger-button" type="button" onClick={() => onDeleteTask(task)}>
                Delete
              </button>
            </div>
          </article>
        )
      })}
    </div>
  )
}

function NotebookSection({
  title,
  tasks,
  categories,
  settings,
  notes,
  emptyTitle,
  onToggleTask,
  onEditTask,
  onDeleteTask,
}: {
  title: string
  tasks: PlannerTaskItem[]
  categories: PlannerCategory[]
  settings: PlannerSettings
  notes: Record<string, string>
  emptyTitle: string
  onToggleTask: (taskId: string) => void
  onEditTask: (task: PlannerTaskItem) => void
  onDeleteTask: (task: PlannerTaskItem) => void
}) {
  return (
    <section className="notebook-section">
      <h3>{title}</h3>
      <TaskStack
        tasks={tasks}
        categories={categories}
        settings={settings}
        notes={notes}
        emptyTitle={emptyTitle}
        emptyDetail="Adjust the notebook sort controls to inspect another date range."
        onToggleTask={onToggleTask}
        onEditTask={onEditTask}
        onDeleteTask={onDeleteTask}
      />
    </section>
  )
}

function TaskEditorDialog({
  editing,
  categories,
  settings,
  onSave,
  onClose,
}: {
  editing: EditingState
  categories: PlannerCategory[]
  settings: PlannerSettings
  onSave: (draft: TaskDraft) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(editing.draft)
  return (
    <Modal title={editing.scope === 'thisAndLaterRepeats' ? 'Edit this and later repeats' : 'Edit task'} onClose={onClose}>
      <TaskForm
        draft={draft}
        categories={categories}
        settings={settings}
        submitLabel="Save task"
        onDraftChange={setDraft}
        onSubmit={onSave}
      />
    </Modal>
  )
}

function ScopeDialog({
  task,
  action,
  onSelect,
  onClose,
}: {
  task: PlannerTaskItem
  action: 'edit' | 'delete'
  onSelect: (scope: EditScope) => void
  onClose: () => void
}) {
  return (
    <Modal title={`${action === 'edit' ? 'Edit' : 'Delete'} repeated task`} onClose={onClose}>
      <p className="dialog-copy">Choose how much of "{task.title}" to {action}.</p>
      <div className="dialog-actions">
        <button type="button" onClick={() => onSelect('onlyThisTask')}>
          Only this task
        </button>
        <button type="button" onClick={() => onSelect('thisAndLaterRepeats')}>
          This and later repeats
        </button>
      </div>
    </Modal>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>
        {children}
      </section>
    </div>
  )
}

function PageHeader({
  eyebrow,
  title,
  detail,
  action,
}: {
  eyebrow: string
  title: string
  detail: string
  action?: React.ReactNode
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <span>{detail}</span>
      </div>
      {action ? <div className="page-action">{action}</div> : null}
    </header>
  )
}

function Panel({
  title,
  detail,
  tone,
  className = '',
  children,
}: {
  title: string
  detail: string
  tone?: 'danger'
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={`panel ${tone ?? ''} ${className}`}>
      <div className="panel-header">
        <h2>{title}</h2>
        <span>{detail}</span>
      </div>
      {children}
    </section>
  )
}

function MetricCard({ label, value, tone = 'normal' }: { label: string; value: number; tone?: 'normal' | 'danger' }) {
  return (
    <article className={`metric-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  )
}

function ToggleRow({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string
  checked: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className={`toggle-row ${disabled ? 'disabled' : ''}`}>
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Array<readonly [string, string]>
  onChange: (value: string) => void
}) {
  return (
    <label className="field select-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => (
          <option value={optionValue} key={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  )
}

function Segmented({
  value,
  items,
  onChange,
}: {
  value: string
  items: Array<readonly [string, string]>
  onChange: (value: string) => void
}) {
  return (
    <div className="segmented">
      {items.map(([itemValue, label]) => (
        <button className={value === itemValue ? 'active' : ''} type="button" key={itemValue} onClick={() => onChange(itemValue)}>
          {label}
        </button>
      ))}
    </div>
  )
}

function ActionButton({ title, detail, onClick }: { title: string; detail: string; onClick: () => void }) {
  return (
    <button className="action-row" type="button" onClick={onClick}>
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <b>Run</b>
    </button>
  )
}

function RuleItem({ title, value }: { title: string; value: string }) {
  return (
    <div className="rule-item">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  )
}

function StatusBlock({ children }: { children: React.ReactNode }) {
  return <p className="status-block">{children}</p>
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="status-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export default App
