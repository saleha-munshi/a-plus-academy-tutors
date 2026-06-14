import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Assignment,
  ProgressRecord,
  Resource,
  Test,
  TestResult,
} from '../types';
import PdfViewer from '../components/PdfViewer';
import TestRunner from '../components/TestRunner';
import LoadingSpinner from '../components/LoadingSpinner';

type Tab = 'notes' | 'homework' | 'tests';

type ViewState =
  | { mode: 'list' }
  | { mode: 'reading'; resource: Resource }
  | { mode: 'testing'; test: Test };

const formatGL = (gl: string) => (gl === 'a-level' ? 'A Level' : 'GCSE');

export default function StudentDashboard() {
  const { user } = useAuth();

  const [tab, setTab] = useState<Tab>('notes');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [progress, setProgress] = useState<ProgressRecord[]>([]);
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewState>({ mode: 'list' });
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [assignmentsData, resourcesData, testsData, progressData, resultsData] =
        await Promise.all([
          api.get<Assignment[]>(`/assignments/student/${user.uid}`),
          api.get<Resource[]>('/resources'),
          api.get<Test[]>('/tests'),
          api.get<ProgressRecord[]>(`/assignments/progress/${user.uid}`),
          api.get<TestResult[]>(`/test-results/${user.uid}`),
        ]);
      setAssignments(assignmentsData);
      setResources(resourcesData);
      setTests(testsData);
      setProgress(progressData);
      setResults(resultsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <LoadingSpinner message="Loading your dashboard…" />;
  if (error) return <div className="error">{error}</div>;

  const resourceAssignments = assignments.filter((a) => a.itemType === 'resource');
  const testAssignments = assignments.filter((a) => a.itemType === 'test');

  const assignedResources = resourceAssignments
    .map((a) => resources.find((r) => r.id === a.itemId))
    .filter((r): r is Resource => Boolean(r));

  const isRead = (resourceId: string) =>
    progress.some((p) => p.resourceId === resourceId && p.status === 'read');

  const hasResult = (testId: string) => results.some((r) => r.testId === testId);

  const assignedTests = testAssignments
    .map((a) => tests.find((t) => t.id === a.itemId))
    .filter((t): t is Test => Boolean(t));

  const availableTests = assignedTests.filter((t) => {
    if (hasResult(t.id)) return false;
    const topicResources = assignedResources.filter(
      (r) => r.gradeLevel === t.gradeLevel && r.subject === t.subject && r.topic === t.topic
    );
    if (topicResources.length === 0) return true;
    return topicResources.some((r) => isRead(r.id));
  });

  const completedTests = assignedTests.filter((t) => hasResult(t.id));

  const noteResources = assignedResources.filter((r) => r.resourceType === 'subject-notes');
  const homeworkResources = assignedResources.filter((r) => r.resourceType === 'homework');

  const openResource = async (resource: Resource) => {
    try {
      const blob = await api.getBlob(`/resources/${resource.id}/view`);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(URL.createObjectURL(blob));
      setView({ mode: 'reading', resource });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PDF');
    }
  };

  const markAsRead = async (resourceId: string) => {
    try {
      await api.post('/assignments/markRead', { resourceId });
      await loadData();
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setView({ mode: 'list' });
      setPdfUrl(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as read');
    }
  };

  const handleTestComplete = async () => {
    await loadData();
    setView({ mode: 'list' });
  };

  const goBack = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setView({ mode: 'list' });
    setPdfUrl(null);
  };

  if (view.mode === 'reading') {
    return (
      <div className="student-dashboard">
        <button onClick={goBack}>&larr; Back</button>
        <h2>{view.resource.title}</h2>
        {pdfUrl && <PdfViewer fileUrl={pdfUrl} />}
        <button onClick={() => markAsRead(view.resource.id)}>
          {view.resource.resourceType === 'homework' ? 'Mark as completed' : 'Mark as read'}
        </button>
      </div>
    );
  }

  if (view.mode === 'testing') {
    return (
      <div className="student-dashboard">
        <button onClick={() => setView({ mode: 'list' })}>&larr; Back</button>
        <TestRunner test={view.test} onComplete={handleTestComplete} />
      </div>
    );
  }

  const renderResourceList = (list: Resource[]) => {
    if (list.length === 0) return <p>Nothing here yet.</p>;
    return (
      <ul>
        {list.map((resource) => (
          <li key={resource.id}>
            <span>
              {resource.title}
              {resource.gradeLevel && (
                <span className="resource-path">
                  {' '}— {formatGL(resource.gradeLevel)} / {resource.subject} / {resource.topic}
                </span>
              )}
              {isRead(resource.id) && <span className="resource-path"> ✓ Completed</span>}
            </span>
            <button onClick={() => openResource(resource)}>
              {isRead(resource.id) ? 'Re-open' : 'Open'}
            </button>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="student-dashboard">
      <h1>My Dashboard</h1>

      <select
        className="tab-select"
        value={tab}
        onChange={(e) => setTab(e.target.value as Tab)}
      >
        <option value="notes">Subject Notes</option>
        <option value="homework">Homework</option>
        <option value="tests">Tests</option>
      </select>

      <nav className="tabs">
        <button onClick={() => setTab('notes')} disabled={tab === 'notes'}>
          Subject Notes
        </button>
        <button onClick={() => setTab('homework')} disabled={tab === 'homework'}>
          Homework
        </button>
        <button onClick={() => setTab('tests')} disabled={tab === 'tests'}>
          Tests
        </button>
      </nav>

      {tab === 'notes' && (
        <section>
          <h2>Subject Notes</h2>
          {renderResourceList(noteResources)}
        </section>
      )}

      {tab === 'homework' && (
        <section>
          <h2>Homework</h2>
          {renderResourceList(homeworkResources)}
        </section>
      )}

      {tab === 'tests' && (
        <section>
          <h2>Available Tests</h2>
          {availableTests.length === 0 ? (
            <p>No tests available yet. Finish your reading to unlock tests.</p>
          ) : (
            <ul>
              {availableTests.map((test) => (
                <li key={test.id}>
                  <span>
                    {test.title}
                    <span className="resource-path">
                      {' '}— {formatGL(test.gradeLevel)} / {test.subject} / {test.topic}
                    </span>
                  </span>
                  <button onClick={() => setView({ mode: 'testing', test })}>Start test</button>
                </li>
              ))}
            </ul>
          )}

          <h2>Completed Tests</h2>
          {completedTests.length === 0 ? (
            <p>No completed tests yet.</p>
          ) : (
            <ul>
              {completedTests.map((test) => {
                const result = results.find((r) => r.testId === test.id);
                return (
                  <li key={test.id}>
                    {test.title} — {result?.score}% ({result?.correctCount}/{result?.totalQuestions})
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
