import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type Task = {
  id: string
  title: string
  date: string
  time: string
  category: 'Study' | 'Work' | 'Personal' | 'Health'
  done: boolean
}

type CreditPack = {
  label: string
  credits: number
  price: string
  note: string
}

const today = new Date()
const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

const seedTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Submit economics reflection',
    date: toDateInputValue(today),
    time: '09:30',
    category: 'Study',
    done: false,
  },
  {
    id: 'task-2',
    title: 'Gym',
    date: toDateInputValue(today),
    time: '18:00',
    category: 'Health',
    done: false,
  },
  {
    id: 'task-3',
    title: 'Portfolio wireframe',
    date: toDateInputValue(addDays(today, 2)),
    time: '14:00',
    category: 'Work',
    done: false,
  },
  {
    id: 'task-4',
    title: 'Mother day gift',
    date: toDateInputValue(new Date(today.getFullYear(), today.getMonth(), 11)),
    time: '11:00',
    category: 'Personal',
    done: true,
  },
  {
    id: 'task-5',
    title: 'National Victoria prep',
    date: toDateInputValue(new Date(today.getFullYear(), today.getMonth(), 18)),
    time: '10:30',
    category: 'Study',
    done: false,
  },
]

const creditPacks: CreditPack[] = [
  { label: 'Starter', credits: 100, price: '$3', note: 'Good for light AI imports' },
  { label: 'Plus', credits: 250, price: '$6', note: 'Best for weekly planning' },
  { label: 'Heavy', credits: 600, price: '$12', note: 'For frequent AI cleanup' },
]

const weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const tasksStorageKey = 'focusguard.tasks'
const monthFormatter = new Intl.DateTimeFormat('en', { month: 'long' })
const longDateFormatter = new Intl.DateTimeFormat('en', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})

function App() {
  const [visibleMonth, setVisibleMonth] = useState(monthStart)
  const [selectedDate, setSelectedDate] = useState(toDateInputValue(today))
  const [tasks, setTasks] = useState<Task[]>(() => loadStoredTasks())
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('12:00')
  const [category, setCategory] = useState<Task['category']>('Study')

  const selectedTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.date === selectedDate)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [selectedDate, tasks],
  )

  const upcomingTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.done === false)
        .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
        .slice(0, 4),
    [tasks],
  )

  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth])

  useEffect(() => {
    localStorage.setItem(tasksStorageKey, JSON.stringify(tasks))
  }, [tasks])

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanTitle = title.trim()
    if (cleanTitle.length === 0) return

    setTasks((currentTasks) => [
      ...currentTasks,
      {
        id: crypto.randomUUID(),
        title: cleanTitle,
        date: selectedDate,
        time,
        category,
        done: false,
      },
    ])
    setTitle('')
  }

  function toggleTask(taskId: string) {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId ? { ...task, done: !task.done } : task,
      ),
    )
  }

  function changeMonth(direction: -1 | 1) {
    setVisibleMonth(
      (currentMonth) => new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1),
    )
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">FG</div>
          <div>
            <p className="eyebrow">FocusGuard Web</p>
            <h1>Plan the work. Keep the day clear.</h1>
          </div>
        </div>

        <section className="panel">
          <div className="panel-header">
            <p className="eyebrow">Today</p>
            <span>{selectedTasks.filter((task) => task.done === false).length} open</span>
          </div>
          <div className="stat-grid">
            <div>
              <strong>{tasks.filter((task) => task.done === false).length}</strong>
              <span>Active</span>
            </div>
            <div>
              <strong>{tasks.filter((task) => task.done).length}</strong>
              <span>Done</span>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <p className="eyebrow">AI Credits</p>
            <span>Paid only</span>
          </div>
          <p className="muted">
            Free users can plan manually. Credits unlock AI import, cleanup, and schedule suggestions.
          </p>
          <div className="credit-list">
            {creditPacks.map((pack) => (
              <button className="credit-pack" type="button" key={pack.label}>
                <span>
                  <strong>{pack.label}</strong>
                  <small>{pack.credits} credits</small>
                </span>
                <span>
                  <strong>{pack.price}</strong>
                  <small>{pack.note}</small>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <p className="eyebrow">Next Up</p>
            <span>{upcomingTasks.length}</span>
          </div>
          <div className="mini-list">
            {upcomingTasks.map((task) => (
              <button
                className="mini-task"
                type="button"
                key={task.id}
                onClick={() => setSelectedDate(task.date)}
              >
                <span>{task.title}</span>
                <small>{formatShortDate(task.date)} at {task.time}</small>
              </button>
            ))}
          </div>
        </section>
      </aside>

      <section className="workspace">
        <header className="toolbar">
          <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month">
            &lt;
          </button>
          <div>
            <p className="eyebrow">{visibleMonth.getFullYear()}</p>
            <h2>{monthFormatter.format(visibleMonth)}</h2>
          </div>
          <button type="button" onClick={() => changeMonth(1)} aria-label="Next month">
            &gt;
          </button>
          <button
            className="today-button"
            type="button"
            onClick={() => {
              setVisibleMonth(monthStart)
              setSelectedDate(toDateInputValue(today))
            }}
          >
            Today
          </button>
        </header>

        <div className="calendar-layout">
          <section className="calendar-panel" aria-label="Month calendar">
            <div className="weekday-row">
              {weekdayLabels.map((weekday, index) => (
                <span key={`${weekday}-${index}`}>{weekday}</span>
              ))}
            </div>

            <div className="calendar-grid">
              {calendarDays.map((date) => {
                const dateKey = toDateInputValue(date)
                const dayTasks = tasks
                  .filter((task) => task.date === dateKey)
                  .sort((a, b) => a.time.localeCompare(b.time))
                const isSelected = dateKey === selectedDate
                const isToday = dateKey === toDateInputValue(today)
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
                    onClick={() => setSelectedDate(dateKey)}
                  >
                    <span className="day-number">{date.getDate()}</span>
                    <span className="task-chip-stack">
                      {dayTasks.slice(0, 3).map((task) => (
                        <span className={`task-chip ${task.category.toLowerCase()}`} key={task.id}>
                          {task.title.slice(0, 4)}
                        </span>
                      ))}
                      {dayTasks.length > 3 ? (
                        <span className="task-chip more">+{dayTasks.length - 3}</span>
                      ) : null}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          <aside className="day-panel">
            <div className="day-panel-header">
              <div>
                <p className="eyebrow">Selected Day</p>
                <h2>{longDateFormatter.format(parseDateValue(selectedDate))}</h2>
              </div>
              <span>{selectedTasks.length} tasks</span>
            </div>

            <form className="task-form" onSubmit={addTask}>
              <input
                aria-label="Task title"
                placeholder="Add a task"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
              <div className="form-row">
                <input
                  aria-label="Task time"
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                />
                <select
                  aria-label="Task category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value as Task['category'])}
                >
                  <option>Study</option>
                  <option>Work</option>
                  <option>Personal</option>
                  <option>Health</option>
                </select>
                <button type="submit">Add</button>
              </div>
            </form>

            <div className="task-list">
              {selectedTasks.length === 0 ? (
                <div className="empty-state">
                  <strong>No tasks yet</strong>
                  <span>Pick a time, add a task, and it appears on the calendar.</span>
                </div>
              ) : (
                selectedTasks.map((task) => (
                  <label className={`task-row ${task.done ? 'done' : ''}`} key={task.id}>
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={() => toggleTask(task.id)}
                    />
                    <span>
                      <strong>{task.title}</strong>
                      <small>{task.time} - {task.category}</small>
                    </span>
                  </label>
                ))
              )}
            </div>
          </aside>
        </div>
      </section>
    </main>
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

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(parseDateValue(value))
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
