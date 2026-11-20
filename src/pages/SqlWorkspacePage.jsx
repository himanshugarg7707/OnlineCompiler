import { ArrowLeft, Database } from 'lucide-react';
import { useApp } from '../context/AppContext';
import DatabasePanel from '../components/DatabasePanel';
import './SqlWorkspacePage.css';

export default function SqlWorkspacePage() {
  const { dispatch } = useApp();
  const back = () => {
    window.location.hash = '#/editor';
    dispatch({ type: 'NAVIGATE_PAGE', payload: 'editor' });
  };

  return <main className="sql-workspace-page">
    <header className="sql-workspace-header">
      <button type="button" onClick={back}><ArrowLeft size={16} /> Editor</button>
      <div className="sql-workspace-heading"><Database size={20} /><div><h1>SQL Studio</h1><p>Manage databases, inspect tables, and explore query results.</p></div></div>
    </header>
    <section className="sql-workspace-content"><DatabasePanel /></section>
  </main>;
}
