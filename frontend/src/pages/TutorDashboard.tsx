import { useEffect, useState, useCallback } from 'react';
import { Assignment, Resource, Test, TestResult, UserProfile } from '../types';
import { api } from '../services/api';
import AssignmentLibrary from '../components/AssignmentLibrary';
import LoadingSpinner from '../components/LoadingSpinner';
import TestResultDetail from '../components/TestResultDetail';

type Tab = 'notes' | 'homework' | 'tests' | 'results';

const formatGL = (gl: string) => (gl === 'a-level' ? 'A Level' : gl === 'gcse' ? 'GCSE' : gl);

function groupBy<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of items) {
    const k = key(item);
    if (!result[k]) result[k] = [];
    result[k].push(item);
  }
  return result;
}

export default function TutorDashboard() {
  const [tab, setTab] = useState<Tab>('notes');
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allResults, setAllResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedResult, setSelectedResult] = useState<{
    result: TestResult;
    test: Test;
    student: UserProfile;
  } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [studentsData, resourcesData, testsData, resultsData] = await Promise.all([
        api.get<UserProfile[]>('/students'),
        api.get<Resource[]>('/resources'),
        api.get<Test[]>('/tests'),
        api.get<TestResult[]>('/test-results'),
      ]);

      setStudents(studentsData);
      setResources(resourcesData);
      setTests(testsData);
      setAllResults(resultsData);

      const assignmentLists = await Promise.all(
        studentsData.map((s) => api.get<Assignment[]>(`/assignments/student/${s.uid}`))
      );
      setAssignments(assignmentLists.flat());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (selectedResult) {
    return (
      <div className="tutor-dashboard">
        <TestResultDetail
          result={selectedResult.result}
          test={selectedResult.test}
          student={selectedResult.student}
          onClose={() => setSelectedResult(null)}
        />
      </div>
    );
  }

  if (loading) return <LoadingSpinner message="Loading your dashboard…" />;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="tutor-dashboard">
      <h1>Tutor Dashboard</h1>

      <select
        className="tab-select"
        value={tab}
        onChange={(e) => setTab(e.target.value as Tab)}
      >
        <option value="notes">Assign Subject Notes</option>
        <option value="homework">Assign Homework</option>
        <option value="tests">Assign Tests</option>
        <option value="results">View Test Results</option>
      </select>

      <nav className="tabs">
        <button onClick={() => setTab('notes')} disabled={tab === 'notes'}>
          Assign Subject Notes
        </button>
        <button onClick={() => setTab('homework')} disabled={tab === 'homework'}>
          Assign Homework
        </button>
        <button onClick={() => setTab('tests')} disabled={tab === 'tests'}>
          Assign Tests
        </button>
        <button onClick={() => setTab('results')} disabled={tab === 'results'}>
          View Test Results
        </button>
      </nav>

      {tab === 'notes' && (
        <AssignmentLibrary
          resources={resources}
          tests={tests}
          students={students}
          assignments={assignments}
          onChange={loadData}
          showOnly="resources"
          resourceTypeFilter="subject-notes"
        />
      )}

      {tab === 'homework' && (
        <AssignmentLibrary
          resources={resources}
          tests={tests}
          students={students}
          assignments={assignments}
          onChange={loadData}
          showOnly="resources"
          resourceTypeFilter="homework"
        />
      )}

      {tab === 'tests' && (
        <AssignmentLibrary
          resources={resources}
          tests={tests}
          students={students}
          assignments={assignments}
          onChange={loadData}
          showOnly="tests"
        />
      )}

      {tab === 'results' && (
        <div>
          <h2>Test Results</h2>
          {allResults.length === 0 ? (
            <p>No results yet.</p>
          ) : (
            Object.entries(groupBy(allResults, (r) => r.studentId)).map(([studentId, results]) => {
              const student = students.find((s) => s.uid === studentId);
              if (!student) return null;
              return (
                <div key={studentId} className="student-results-group">
                  <h3>{student.name}</h3>
                  <ul className="result-list">
                    {results.map((result) => {
                      const test = tests.find((t) => t.id === result.testId);
                      if (!test) return null;
                      const scoreClass =
                        result.score >= 80 ? 'score-high' : result.score >= 60 ? 'score-mid' : 'score-low';
                      return (
                        <li key={result.id} className="result-row">
                          <div className="result-row-info">
                            <span className="result-test-title">{test.title}</span>
                            <span className="result-path">
                              {formatGL(test.gradeLevel)} / {test.subject} / {test.topic}
                            </span>
                            <span className="result-date">
                              {new Date(result.completedAt).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                          <div className="result-row-right">
                            <span className={`result-score ${scoreClass}`}>{result.score}%</span>
                            <span className="result-fraction">
                              {result.correctCount}/{result.totalQuestions}
                            </span>
                            <button onClick={() => setSelectedResult({ result, test, student })}>
                              View
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
