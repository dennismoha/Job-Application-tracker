export default function About() {
  return (
    <main className="public-content-page">
      <div className="public-content-card">
        <p>About JobIntel</p>
        <h1 style={{ margin: '12px 0 20px', fontSize: '2.5rem' }}>
          A clearer way to manage your job search
        </h1>

        <p>
          This page gives you a quick overview of the Job Application Tracker and the
          purpose behind it. The app is designed to help job seekers stay organized,
          focused, and confident while managing applications, follow-ups, and interview
          progress.
        </p>

        <div className="about-card-grid">
          <div className="about-card">
            <h3>Purpose</h3>
            <p>
              Keep all application details in one place so you can track where you
              applied, what stage you are in, and what actions are still needed.
            </p>
          </div>

          <div className="about-card">
            <h3>Why It Helps</h3>
            <p>
              Reduce stress, avoid missed follow-ups, and maintain a clear view of your
              job search progress over time.
            </p>
          </div>

          <div className="about-card">
            <h3>Built for Focus</h3>
            <p>
              The tracker helps you stay organized with a simple workflow, so you can spend
              less time searching for details and more time preparing for opportunities.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
