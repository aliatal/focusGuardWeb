import './App.css'

const supportEmail = 'atali772@gmail.com'
const siteUrl = 'https://focusguardweb.netlify.app'

function App() {
  return (
    <main className="site-shell">
      <section className="hero" aria-labelledby="page-title">
        <div className="hero-copy">
          <p className="eyebrow">FocusGuard Support</p>
          <h1 id="page-title">Task planning, reminders, and privacy information.</h1>
          <p className="hero-text">
            FocusGuard helps users create tasks, add notes, organize reminders, and review their schedule in one place.
            This page provides support details and the privacy policy required for the App Store.
          </p>
          <div className="hero-actions" aria-label="Quick links">
            <a className="primary-link" href={`mailto:${supportEmail}`}>
              Contact Support
            </a>
            <a className="secondary-link" href="#privacy">
              Privacy Policy
            </a>
          </div>
        </div>

        <aside className="status-card" aria-label="Support summary">
          <span>Support Email</span>
          <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
          <span>Privacy Policy URL</span>
          <a href={`${siteUrl}/#privacy`}>{siteUrl}/#privacy</a>
        </aside>
      </section>

      <section className="content-grid" aria-label="Support and privacy details">
        <article className="panel" id="support">
          <p className="section-kicker">Support</p>
          <h2>Need help with FocusGuard?</h2>
          <p>
            Email support with a short description of the issue, the device model, iOS version, and any steps needed to
            reproduce the problem.
          </p>
          <a className="text-link" href={`mailto:${supportEmail}`}>
            {supportEmail}
          </a>
        </article>

        <article className="panel">
          <p className="section-kicker">App Details</p>
          <h2>What FocusGuard Does</h2>
          <ul>
            <li>Create one-time and recurring tasks.</li>
            <li>Add notes and optional photos to task details.</li>
            <li>Use reminders and calendar views to track upcoming work.</li>
            <li>Customize task categories, sorting, and display preferences.</li>
          </ul>
        </article>

        <article className="panel wide" id="privacy">
          <p className="section-kicker">Privacy Policy</p>
          <h2>FocusGuard Privacy Policy</h2>
          <p className="updated">Last updated: May 26, 2026</p>

          <h3>Data Collection</h3>
          <p>
            FocusGuard does not collect, sell, or share personal data with the developer. Task titles, notes, reminder
            settings, categories, and photos are stored on the user&apos;s device.
          </p>

          <h3>Optional Apple Services</h3>
          <p>
            If a user chooses to use Apple features such as Sign in with Apple, notifications, iCloud, or Apple Calendar,
            those features are handled by Apple according to the user&apos;s device settings and Apple&apos;s privacy
            policies.
          </p>

          <h3>Photos and Attachments</h3>
          <p>
            Photos added to tasks are used only for the task note experience inside the app. FocusGuard does not upload
            these photos to the developer.
          </p>

          <h3>Contact</h3>
          <p>
            For privacy questions or support requests, contact{' '}
            <a className="text-link" href={`mailto:${supportEmail}`}>
              {supportEmail}
            </a>
            .
          </p>
        </article>
      </section>
    </main>
  )
}

export default App
