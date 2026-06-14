import { useEffect, useState, useCallback } from 'react';
import { Resource, Test } from '../types';
import { api } from '../services/api';
import ResourceUploadForm from '../components/ResourceUploadForm';
import TestBuilder from '../components/TestBuilder';
import UserManagementPanel from '../components/UserManagementPanel';
import TestimonialsManager from '../components/TestimonialsManager';
import LoadingSpinner from '../components/LoadingSpinner';

type Tab = 'resources' | 'tests' | 'users' | 'testimonials';

const formatGL = (gl: string) => (gl === 'a-level' ? 'A Level' : gl === 'gcse' ? 'GCSE' : gl);
const capitalize = (s: string) =>
  s.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

function groupByNested<T>(
  items: T[],
  k1: (i: T) => string,
  k2: (i: T) => string,
  k3: (i: T) => string,
): Record<string, Record<string, Record<string, T[]>>> {
  const result: Record<string, Record<string, Record<string, T[]>>> = {};
  for (const item of items) {
    const a = k1(item), b = k2(item), c = k3(item);
    if (!result[a]) result[a] = {};
    if (!result[a][b]) result[a][b] = {};
    if (!result[a][b][c]) result[a][b][c] = [];
    result[a][b][c].push(item);
  }
  return result;
}

export default function OwnerDashboard() {
  const [tab, setTab] = useState<Tab>('resources');
  const [resources, setResources] = useState<Resource[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [resourcesData, testsData] = await Promise.all([
        api.get<Resource[]>('/resources'),
        api.get<Test[]>('/tests'),
      ]);
      setResources(resourcesData);
      setTests(testsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const deleteResource = async (id: string) => {
    if (!confirm('Delete this resource?')) return;
    try {
      await api.delete(`/resources/${id}`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete resource');
    }
  };

  const deleteTest = async (id: string) => {
    if (!confirm('Delete this test?')) return;
    try {
      await api.delete(`/tests/${id}`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete test');
    }
  };

  return (
    <div className="owner-dashboard">
      <h1>Owner Portal</h1>

      <select
        className="tab-select"
        value={tab}
        onChange={(e) => setTab(e.target.value as Tab)}
      >
        <option value="resources">Add Resources</option>
        <option value="tests">Add Tests</option>
        <option value="users">Manage Users</option>
        <option value="testimonials">Manage Testimonials</option>
      </select>

      <nav className="tabs">
        <button onClick={() => setTab('resources')} disabled={tab === 'resources'}>
          Add Resources
        </button>
        <button onClick={() => setTab('tests')} disabled={tab === 'tests'}>
          Add Tests
        </button>
        <button onClick={() => setTab('users')} disabled={tab === 'users'}>
          Manage Users
        </button>
        <button onClick={() => setTab('testimonials')} disabled={tab === 'testimonials'}>
          Manage Testimonials
        </button>
      </nav>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <LoadingSpinner message="Loading…" />
      ) : (
        <>
          {tab === 'resources' && (
            <div>
              <h2>Upload Resource</h2>
              <ResourceUploadForm resources={resources} onUploaded={loadData} />

              <h2>Existing Resources</h2>
              {resources.length === 0 ? (
                <p>No resources uploaded yet.</p>
              ) : (
                Object.entries(
                  groupByNested(
                    resources,
                    (r) => r.gradeLevel ?? 'Uncategorised',
                    (r) => r.subject ?? 'Unknown',
                    (r) => r.topic ?? 'Unknown',
                  )
                ).map(([gl, subjects]) => (
                  <div key={gl} className="resource-group">
                    <h3>{formatGL(gl)}</h3>
                    {Object.entries(subjects).map(([sub, topics]) => (
                      <div key={sub} className="resource-subgroup">
                        <h4>{capitalize(sub)}</h4>
                        {Object.entries(topics).map(([top, items]) => (
                          <div key={top} className="resource-topic-group">
                            <h5>{top}</h5>
                            <ul>
                              {items.map((resource) => (
                                <li key={resource.id}>
                                  {resource.title}
                                  <button onClick={() => deleteResource(resource.id)}>Delete</button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'tests' && (
            <div>
              <h2>Create Test</h2>
              <TestBuilder resources={resources} onCreated={loadData} />

              <h2>Existing Tests</h2>
              {tests.length === 0 ? (
                <p>No tests created yet.</p>
              ) : (
                Object.entries(
                  groupByNested(
                    tests,
                    (t) => t.gradeLevel ?? 'Uncategorised',
                    (t) => t.subject ?? 'Unknown',
                    (t) => t.topic ?? 'Unknown',
                  )
                ).map(([gl, subjects]) => (
                  <div key={gl} className="resource-group">
                    <h3>{formatGL(gl)}</h3>
                    {Object.entries(subjects).map(([sub, topics]) => (
                      <div key={sub} className="resource-subgroup">
                        <h4>{capitalize(sub)}</h4>
                        {Object.entries(topics).map(([top, items]) => (
                          <div key={top} className="resource-topic-group">
                            <h5>{top}</h5>
                            <ul>
                              {items.map((test) => (
                                <li key={test.id}>
                                  {test.title} ({test.questions.length} questions)
                                  <button onClick={() => deleteTest(test.id)}>Delete</button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'users' && <UserManagementPanel />}

          {tab === 'testimonials' && <TestimonialsManager />}
        </>
      )}
    </div>
  );
}
