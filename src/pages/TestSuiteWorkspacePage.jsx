import { ArrowLeft, FlaskConical } from 'lucide-react';
import { useApp } from '../context/AppContext';
import TestCaseSuitePanel from '../components/TestCaseSuitePanel';
import './TestSuiteWorkspacePage.css';

export default function TestSuiteWorkspacePage() {
  const { dispatch } = useApp();
  const back = () => {
    window.location.hash = '#/editor';
    dispatch({ type: 'NAVIGATE_PAGE', payload: 'editor' });
  };

  return (
    <main className="test-suite-workspace-page">
      <header className="test-suite-workspace-header">
        <button type="button" onClick={back}><ArrowLeft size={16} /> Editor</button>
        <div className="test-suite-workspace-heading">
          <FlaskConical size={20} />
          <div><h1>Test Suite Workspace</h1><p>Build, run, and inspect custom test cases for your active program.</p></div>
        </div>
      </header>
      <section className="test-suite-workspace-content"><TestCaseSuitePanel /></section>
    </main>
  );
}
