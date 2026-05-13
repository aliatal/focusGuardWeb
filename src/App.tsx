import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type Page = 'dashboard' | 'calendar' | 'tasks' | 'ai' | 'settings'
type Category = 'Study' | 'Work' | 'Personal' | 'Health'
type Priority = 'Low' | 'Medium' | 'High'

type Task = {
  id: string
  title: string
  date: string
  time: string
  category: Category
  priority: Priority
  done: boolean
}

type TaskDraft = {
  title: string
  date: string
  time: string
  category: Category
  priority: Priority
}

type CreditPack = {
  label: string
  credits: number
  price: number
  description: string
}

const today = new Date()
const todayKey = toDateInputValue(today)
const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
const tasksStorageKey = 'focusguard.tasks'

const navItems: Array<{ page: Page; label: string }> = [
  { page: 'dashboard', label: 'Dashboard' },
  { page: 'calendar', label: 'Calendar' },
  { page: 'tasks', label: 'Tasks' },
  { page: 'ai', label: 'AI Credits' },
  { page: 'settings', label: 'Settings' },
]

const creditPacks: CreditPack[] = [
  {
    label: 'Starter',
    credits: 250,
    price: 5,
    description: 'For occasional imports and quick planning cleanup.',
  },
  {
    label: 'Plus',
    credits: 600,
    price: 10,
    description: 'Best fit for weekly planning and school workload cleanup.',
  },
  {
    label: 'Power',
    credits: 1500,
    price: 20,
    description: 'For frequent AI import, sorting, and schedule suggestions.',
  },
]

const categoryMeta: Record<Category, { color: string; tone: string }> = {
  Study: { color: '#6d28d9', tone: 'study' },
  Work: { color: '#0369a1', tone: 'work' },
  Personal: { color: '#be123c', tone: 'personal' },
  Health: { color: '#15803d', tone: 'health' },
}

const priorityRank: Record<Priority, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
}

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const shortWeekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const monthFormatter = new Intl.DateTimeFormat('en', { month: 'long' })
const compactDateFormatter = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' })
const fullDateFormatter = new Intl.DateTimeFormat('en', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})

const seedTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Submit economics reflection',
    date: todayKey,
    time: '09:30',
    category: 'Study',
    priority: 'High',
    done: false,
  },
  {
    id: 'task-2',
    title: 'Gym',
    date: todayKey,
    time: '18:00',
    category: 'Health',
    priority: 'Low',
    done: false,
  },
  {
    id: 'task-3',
    title: 'Portfolio wireframe',
    date: toDateInputValue(addDays(today, 2)),
    time: '14:00',
    category: 'Work',
    priority: 'Medium',
    done: false,
  },
  {
    id: 'task-4',
    title: 'Mother day gift',
    date: toDateInputValue(new Date(today.getFullYear(), today.getMonth(), 11)),
    time: '11:00',
    category: 'Personal',
    priority: 'Medium',
    done: true,
  },
  {
    id: 'task-5',
    title: 'National Victoria prep',
    date: toDateInputValue(new Date(today.getFullYear(), today.getMonth(), 18)),
    time: '10:30',
    category: 'Study',
    priority: 'High',
    done: false,
  },
  {
    id: 'task-6',
    title: 'Review Netlify deployment',
    date: toDateInputValue(addDays(today, 4)),
    time: '16:00',
    category: 'Work',
    priority: 'Medium',
    done: false,
  },
]

function App() {
  const [activePage, setActivePage] = useState<Page>('dashboard')
  const [visibleMonth, setVisibleMonth] = useState(monthStart)
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [tasks, setTasks] = useState<Task[]>(() => loadStoredTasks())
  const [draft, setDraft] = useState<TaskDraft>(() => createEmptyDraft(todayKey))
  const [taskFilter, setTaskFilter] = useState<'Open' | 'Done' | 'All'>('Open')
  const [remindersEnabled, setRemindersEnabled] = useState(true)
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [pushEnabled, setPushEnabled] = useState(false)

  const openTasks = tasks.filter((task) => task.done === false)
  const doneTasks = tasks.filter((task) => task.done)
  const dueTodayTasks = openTasks
    .filter((task) => task.date === todayKey)
    .sort(compareTasks)
  const overdueTasks = openTasks.filter((task) => task.date < todayKey).sort(compareTasks)
  const upcomingTasks = openTasks
    .filter((task) => task.date >= todayKey)
    .sort(compareTasks)
    .slice(0, 6)

  const selectedTasks = useMemo(
    () => tasks.filter((task) => task.date === selectedDate).sort(compareTasks),
    [selectedDate, tasks],
  )

  const filteredTasks = useMemo(() => {
    const visibleTasks = tasks.filter((task) => {
      if (taskFilter === 'Open') return task.done === false
      if (taskFilter === 'Done') return task.done
      return true
    })
    return visibleTasks.sort(compareTasks)
  }, [taskFilter, tasks])

  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth])

  useEffect(() => {
    localStorage.setItem(tasksStorageKey, JSON.stringify(tasks))
  }, [tasks])

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = draft.title.trim()
    if (title.length === 0) return

    setTasks((currentTasks) => [
      ...currentTasks,
      {
        ...draft,
        id: crypto.randomUUID(),
        title,
        done: false,
      },
    ])
    setDraft(createEmptyDraft(draft.date))
  }

  function toggleTask(taskId: string) {
    setTasks((currentTasks) =>
      currentTasks.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task)),
    )
  }

  function deleteTask(taskId: string) {
    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId))
  }

  function selectCalendarDate(dateKey: string) {
    setSelectedDate(dateKey)
    setDraft((currentDraft) => ({ ...currentDraft, date: dateKey }))
  }

  function changeMonth(direction: -1 | 1) {
    setVisibleMonth(
      (currentMonth) => new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1),
    )
  }

  function renderPage() {
    switch (activePage) {
      case 'dashboard':
        return (
          <DashboardPage
            dueTodayTasks={dueTodayTasks}
            overdueTasks={overdueTasks}
            upcomingTasks={upcomingTasks}
            openCount={openTasks.length}
            doneCount={doneTasks.length}
            onOpenCalendar={(dateKey) => {
              setActivePage('calendar')
              selectCalendarDate(dateKey)
            }}
            onToggleTask={toggleTask}
          />
        )
      case 'calendar':
        return (
          <CalendarPage
            calendarDays={calendarDays}
            visibleMonth={visibleMonth}
            selectedDate={selectedDate}
            selectedTasks={selectedTasks}
            tasks={tasks}
            draft={draft}
            onDraftChange={setDraft}
            onAddTask={addTask}
            onChangeMonth={changeMonth}
            onSelectDate={selectCalendarDate}
            onToggleTask={toggleTask}
            onDeleteTask={deleteTask}
          />
        )
      case 'tasks':
        return (
          <TasksPage
            filteredTasks={filteredTasks}
            taskFilter={taskFilter}
            draft={draft}
            onDraftChange={setDraft}
            onTaskFilterChange={setTaskFilter}
            onAddTask={addTask}
            onToggleTask={toggleTask}
            onDeleteTask={deleteTask}
            onOpenCalendar={(dateKey) => {
              setActivePage('calendar')
              selectCalendarDate(dateKey)
            }}
          />
        )
      case 'ai':
        return <AiCreditsPage />
      case 'settings':
        return (
          <SettingsPage
            remindersEnabled={remindersEnabled}
            emailEnabled={emailEnabled}
            pushEnabled={pushEnabled}
            onRemindersChange={setRemindersEnabled}
            onEmailChange={setEmailEnabled}
            onPushChange={setPushEnabled}
          />
        )
    }
  }

  return (
    <main className="app-frame">
      <aside className="app-nav" aria-label="Main navigation">
        <div className="brand">
          <div className="brand-mark">FG</div>
          <div>
            <strong>FocusGuard</strong>
            <span>Web planner</span>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => (
            <button
              className={activePage === item.page ? 'active' : ''}
              type="button"
              key={item.page}
              onClick={() => setActivePage(item.page)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <section className="nav-summary">
          <p className="label">Today</p>
          <strong>{dueTodayTasks.length} open</strong>
          <span>{overdueTasks.length} overdue</span>
        </section>
      </aside>

      <section className="app-content">{renderPage()}</section>
    </main>
  )
}

function DashboardPage({
  dueTodayTasks,
  overdueTasks,
  upcomingTasks,
  openCount,
  doneCount,
  onOpenCalendar,
  onToggleTask,
}: {
  dueTodayTasks: Task[]
  overdueTasks: Task[]
  upcomingTasks: Task[]
  openCount: number
  doneCount: number
  onOpenCalendar: (dateKey: string) => void
  onToggleTask: (taskId: string) => void
}) {
  return (
    <div className="page">
      <PageHeader
        eyebrow="Dashboard"
        title="Today at a glance"
        action={<StatusPill>{formatDate(todayKey)}</StatusPill>}
      />

      <section className="metric-strip" aria-label="Planner summary">
        <MetricCard label="Open tasks" value={openCount} />
        <MetricCard label="Finished" value={doneCount} />
        <MetricCard label="Due today" value={dueTodayTasks.length} />
        <MetricCard label="Overdue" value={overdueTasks.length} tone={overdueTasks.length > 0 ? 'danger' : 'normal'} />
      </section>

      <section className="dashboard-grid">
        <div className="surface">
          <SectionHeader title="Due today" detail={`${dueTodayTasks.length} tasks`} />
          <TaskStack
            tasks={dueTodayTasks}
            emptyTitle="No open tasks today"
            emptyDetail="Your day is clear."
            onToggleTask={onToggleTask}
            onOpenCalendar={onOpenCalendar}
          />
        </div>

        <div className="surface">
          <SectionHeader title="Upcoming" detail="Next deadlines" />
          <TaskStack
            tasks={upcomingTasks}
            emptyTitle="No upcoming tasks"
            emptyDetail="Add tasks from Calendar or Tasks."
            onToggleTask={onToggleTask}
            onOpenCalendar={onOpenCalendar}
          />
        </div>

        <div className="surface wide">
          <SectionHeader title="AI credits" detail="Paid usage only" />
          <div className="credit-overview">
            <div>
              <p className="label">Minimum purchase</p>
              <strong>$5</strong>
              <span>Credits are required before AI features run.</span>
            </div>
            <div>
              <p className="label">Margin control</p>
              <strong>Hard caps</strong>
              <span>Each AI action will have a max input size and fixed credit cost.</span>
            </div>
            <div>
              <p className="label">Free users</p>
              <strong>Manual planner</strong>
              <span>Core calendar and tasks remain usable without API spend.</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function CalendarPage({
  calendarDays,
  visibleMonth,
  selectedDate,
  selectedTasks,
  tasks,
  draft,
  onDraftChange,
  onAddTask,
  onChangeMonth,
  onSelectDate,
  onToggleTask,
  onDeleteTask,
}: {
  calendarDays: Date[]
  visibleMonth: Date
  selectedDate: string
  selectedTasks: Task[]
  tasks: Task[]
  draft: TaskDraft
  onDraftChange: (draft: TaskDraft) => void
  onAddTask: (event: FormEvent<HTMLFormElement>) => void
  onChangeMonth: (direction: -1 | 1) => void
  onSelectDate: (dateKey: string) => void
  onToggleTask: (taskId: string) => void
  onDeleteTask: (taskId: string) => void
}) {
  return (
    <div className="page">
      <PageHeader
        eyebrow={`${visibleMonth.getFullYear()}`}
        title={monthFormatter.format(visibleMonth)}
        action={
          <div className="month-controls">
            <button type="button" onClick={() => onChangeMonth(-1)} aria-label="Previous month">
              Back
            </button>
            <button type="button" onClick={() => onChangeMonth(1)} aria-label="Next month">
              Next
            </button>
          </div>
        }
      />

      <section className="calendar-workspace">
        <div className="calendar-surface">
          <div className="weekday-row" aria-hidden="true">
            {weekdayLabels.map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>

          <div className="calendar-grid">
            {calendarDays.map((date) => {
              const dateKey = toDateInputValue(date)
              const dayTasks = tasks.filter((task) => task.date === dateKey).sort(compareTasks)
              const isSelected = dateKey === selectedDate
              const isToday = dateKey === todayKey
              const isCurrentMonth = date.getMonth() === visibleMonth.getMonth()

              return (
                <button
                  type="button"
                  className={[
                    'day-cell',
                    isSelected ? 'selected' : '',
                    isToday ? 'today' : '',
                    isCurrentMonth ? '' : 'outside-month',
                  ].join(' ')}
                  key={dateKey}
                  onClick={() => onSelectDate(dateKey)}
                >
                  <span className="day-topline">
                    <span className="mobile-weekday">{shortWeekdayLabels[date.getDay()]}</span>
                    <span className="day-number">{date.getDate()}</span>
                  </span>
                  <span className="task-chip-stack">
                    {dayTasks.slice(0, 3).map((task) => (
                      <span className={`task-chip ${categoryMeta[task.category].tone}`} key={task.id}>
                        {task.title.slice(0, 4)}
                      </span>
                    ))}
                    {dayTasks.length > 3 ? <span className="task-chip overflow">+{dayTasks.length - 3}</span> : null}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <aside className="selected-day">
          <SectionHeader title={fullDateFormatter.format(parseDateValue(selectedDate))} detail={`${selectedTasks.length} tasks`} />
          <TaskForm draft={draft} onDraftChange={onDraftChange} onAddTask={onAddTask} />
          <TaskStack
            tasks={selectedTasks}
            emptyTitle="Nothing scheduled"
            emptyDetail="Add a task to place it on this date."
            onToggleTask={onToggleTask}
            onDeleteTask={onDeleteTask}
          />
        </aside>
      </section>
    </div>
  )
}

function TasksPage({
  filteredTasks,
  taskFilter,
  draft,
  onDraftChange,
  onTaskFilterChange,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onOpenCalendar,
}: {
  filteredTasks: Task[]
  taskFilter: 'Open' | 'Done' | 'All'
  draft: TaskDraft
  onDraftChange: (draft: TaskDraft) => void
  onTaskFilterChange: (filter: 'Open' | 'Done' | 'All') => void
  onAddTask: (event: FormEvent<HTMLFormElement>) => void
  onToggleTask: (taskId: string) => void
  onDeleteTask: (taskId: string) => void
  onOpenCalendar: (dateKey: string) => void
}) {
  return (
    <div className="page">
      <PageHeader
        eyebrow="Tasks"
        title="Task manager"
        action={
          <div className="segmented">
            {(['Open', 'Done', 'All'] as const).map((filter) => (
              <button
                className={taskFilter === filter ? 'active' : ''}
                type="button"
                key={filter}
                onClick={() => onTaskFilterChange(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        }
      />

      <section className="tasks-layout">
        <div className="surface">
          <SectionHeader title="Add task" detail="Manual entry" />
          <TaskForm draft={draft} onDraftChange={onDraftChange} onAddTask={onAddTask} />
        </div>

        <div className="surface task-browser">
          <SectionHeader title={`${taskFilter} tasks`} detail={`${filteredTasks.length} shown`} />
          <TaskStack
            tasks={filteredTasks}
            emptyTitle="No tasks found"
            emptyDetail="Change the filter or add a new task."
            onToggleTask={onToggleTask}
            onDeleteTask={onDeleteTask}
            onOpenCalendar={onOpenCalendar}
          />
        </div>
      </section>
    </div>
  )
}

function AiCreditsPage() {
  return (
    <div className="page">
      <PageHeader eyebrow="AI Credits" title="Paid AI usage" action={<StatusPill>$5 minimum</StatusPill>} />

      <section className="pricing-grid">
        {creditPacks.map((pack) => (
          <article className="price-card" key={pack.label}>
            <div>
              <p className="label">{pack.label}</p>
              <strong>${pack.price}</strong>
              <span>{pack.credits} credits</span>
            </div>
            <p>{pack.description}</p>
            <button type="button">Buy credits</button>
          </article>
        ))}
      </section>

      <section className="surface">
        <SectionHeader title="Credit rules" detail="Draft pricing model" />
        <div className="rules-grid">
          <RuleItem title="AI import" value="10 credits" detail="Turn pasted notes into dated tasks." />
          <RuleItem title="Schedule cleanup" value="15 credits" detail="Rebalance a busy week without unlimited usage." />
          <RuleItem title="Day plan" value="8 credits" detail="Generate a focused order for one day." />
          <RuleItem title="Failed request" value="0 credits" detail="Credits should only be consumed after a successful response." />
        </div>
      </section>
    </div>
  )
}

function SettingsPage({
  remindersEnabled,
  emailEnabled,
  pushEnabled,
  onRemindersChange,
  onEmailChange,
  onPushChange,
}: {
  remindersEnabled: boolean
  emailEnabled: boolean
  pushEnabled: boolean
  onRemindersChange: (value: boolean) => void
  onEmailChange: (value: boolean) => void
  onPushChange: (value: boolean) => void
}) {
  return (
    <div className="page">
      <PageHeader eyebrow="Settings" title="Preferences" />

      <section className="settings-grid">
        <div className="surface">
          <SectionHeader title="Reminders" detail="Web-first delivery" />
          <ToggleRow label="Enable reminders" checked={remindersEnabled} onChange={onRemindersChange} />
          <ToggleRow label="Email reminders" checked={emailEnabled} onChange={onEmailChange} disabled={!remindersEnabled} />
          <ToggleRow label="PWA push notifications" checked={pushEnabled} onChange={onPushChange} disabled={!remindersEnabled} />
        </div>

        <div className="surface">
          <SectionHeader title="Deployment" detail="Netlify ready" />
          <div className="deployment-list">
            <StatusRow label="Frontend" value="React + Vite" />
            <StatusRow label="Hosting" value="Netlify" />
            <StatusRow label="Auth and data" value="Supabase later" />
            <StatusRow label="Payments" value="Stripe Checkout later" />
          </div>
        </div>
      </section>
    </div>
  )
}

function PageHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string
  title: string
  action?: React.ReactNode
}) {
  return (
    <header className="page-header">
      <div>
        <p className="label">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {action ? <div className="page-action">{action}</div> : null}
    </header>
  )
}

function SectionHeader({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="section-header">
      <h2>{title}</h2>
      <span>{detail}</span>
    </div>
  )
}

function MetricCard({
  label,
  value,
  tone = 'normal',
}: {
  label: string
  value: number
  tone?: 'normal' | 'danger'
}) {
  return (
    <article className={`metric-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function TaskForm({
  draft,
  onDraftChange,
  onAddTask,
}: {
  draft: TaskDraft
  onDraftChange: (draft: TaskDraft) => void
  onAddTask: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form className="task-form" onSubmit={onAddTask}>
      <input
        aria-label="Task title"
        placeholder="Task name"
        value={draft.title}
        onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
      />
      <div className="task-form-grid">
        <input
          aria-label="Task date"
          type="date"
          value={draft.date}
          onChange={(event) => onDraftChange({ ...draft, date: event.target.value })}
        />
        <input
          aria-label="Task time"
          type="time"
          value={draft.time}
          onChange={(event) => onDraftChange({ ...draft, time: event.target.value })}
        />
        <select
          aria-label="Category"
          value={draft.category}
          onChange={(event) => onDraftChange({ ...draft, category: event.target.value as Category })}
        >
          <option>Study</option>
          <option>Work</option>
          <option>Personal</option>
          <option>Health</option>
        </select>
        <select
          aria-label="Priority"
          value={draft.priority}
          onChange={(event) => onDraftChange({ ...draft, priority: event.target.value as Priority })}
        >
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
      </div>
      <button className="primary-button" type="submit">
        Add task
      </button>
    </form>
  )
}

function TaskStack({
  tasks,
  emptyTitle,
  emptyDetail,
  onToggleTask,
  onDeleteTask,
  onOpenCalendar,
}: {
  tasks: Task[]
  emptyTitle: string
  emptyDetail: string
  onToggleTask: (taskId: string) => void
  onDeleteTask?: (taskId: string) => void
  onOpenCalendar?: (dateKey: string) => void
}) {
  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <strong>{emptyTitle}</strong>
        <span>{emptyDetail}</span>
      </div>
    )
  }

  return (
    <div className="task-stack">
      {tasks.map((task) => (
        <article className={`task-row ${task.done ? 'done' : ''}`} key={task.id}>
          <label>
            <input type="checkbox" checked={task.done} onChange={() => onToggleTask(task.id)} />
            <span>
              <strong>{task.title}</strong>
              <small>
                {formatDate(task.date)} at {task.time} - {task.category} - {task.priority}
              </small>
            </span>
          </label>
          <div className="task-actions">
            {onOpenCalendar ? (
              <button type="button" onClick={() => onOpenCalendar(task.date)}>
                Calendar
              </button>
            ) : null}
            {onDeleteTask ? (
              <button type="button" onClick={() => onDeleteTask(task.id)}>
                Delete
              </button>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  )
}

function StatusPill({ children }: { children: React.ReactNode }) {
  return <span className="status-pill">{children}</span>
}

function RuleItem({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="rule-item">
      <span>{title}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
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

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="status-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function buildCalendarDays(month: Date) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1)
  const firstVisibleDate = addDays(start, -start.getDay())
  return Array.from({ length: 42 }, (_, index) => addDays(firstVisibleDate, index))
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

function createEmptyDraft(date: string): TaskDraft {
  return {
    title: '',
    date,
    time: '12:00',
    category: 'Study',
    priority: 'Medium',
  }
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateValue(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatDate(value: string) {
  return compactDateFormatter.format(parseDateValue(value))
}

function compareTasks(a: Task, b: Task) {
  return (
    `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`) ||
    priorityRank[a.priority] - priorityRank[b.priority] ||
    a.title.localeCompare(b.title)
  )
}

function loadStoredTasks() {
  const storedTasks = localStorage.getItem(tasksStorageKey)
  if (storedTasks === null) return seedTasks

  try {
    const parsedTasks = JSON.parse(storedTasks)
    if (Array.isArray(parsedTasks)) return parsedTasks as Task[]
  } catch {
    return seedTasks
  }

  return seedTasks
}

export default App
