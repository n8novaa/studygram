import { Link } from 'react-router-dom';
import RecentActivityFeed from '../components/home/RecentActivityFeed';
import '../styles/pages/home.css';

export default function ActivityHistory() {
  return (
    <main className="home-page activity-history-page">
      <header className="home-hero">
        <div className="home-hero-text">
          <h1>Message history</h1>
          <p className="home-subtitle">Recent messages from other members in your workspaces.</p>
        </div>
        <Link to="/app" className="home-section-link">Back to home</Link>
      </header>
      <section className="home-section home-activity-section">
        <RecentActivityFeed view="history" />
      </section>
    </main>
  );
}
