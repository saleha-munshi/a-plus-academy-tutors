import { useState } from 'react';
import { Resource, ResourceType, Test, UserProfile, Assignment, AssignmentItemType } from '../types';
import { api } from '../services/api';

interface AssignmentLibraryProps {
  resources: Resource[];
  tests: Test[];
  students: UserProfile[];
  assignments: Assignment[];
  onChange: () => void;
  showOnly?: 'resources' | 'tests';
  resourceTypeFilter?: ResourceType;
}

export default function AssignmentLibrary({
  resources,
  tests,
  students,
  assignments,
  onChange,
  showOnly,
  resourceTypeFilter,
}: AssignmentLibraryProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.uid ?? '');
  const [error, setError] = useState<string | null>(null);

  const selectedStudent = students.find((s) => s.uid === selectedStudentId);
  const studentSubjects = selectedStudent?.subjects ?? [];
  const visibleResources = studentSubjects.length > 0
    ? resources.filter((r) => studentSubjects.includes(r.subject))
    : resources;
  const visibleTests = studentSubjects.length > 0
    ? tests.filter((t) => studentSubjects.includes(t.subject))
    : tests;

  const isAssigned = (itemId: string, itemType: AssignmentItemType) =>
    assignments.some(
      (a) => a.studentId === selectedStudentId && a.itemId === itemId && a.itemType === itemType
    );

  const findAssignment = (itemId: string, itemType: AssignmentItemType) =>
    assignments.find(
      (a) => a.studentId === selectedStudentId && a.itemId === itemId && a.itemType === itemType
    );

  const toggle = async (itemId: string, itemType: AssignmentItemType) => {
    if (!selectedStudentId) return;
    setError(null);

    try {
      if (isAssigned(itemId, itemType)) {
        const assignment = findAssignment(itemId, itemType);
        if (assignment) {
          await api.delete(`/assignments/${assignment.id}`);
        }
      } else {
        await api.post('/assignments', {
          studentIds: [selectedStudentId],
          itemId,
          itemType,
        });
      }
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update assignment');
    }
  };

  if (students.length === 0) {
    return <p>No students available to assign work to.</p>;
  }

  return (
    <div className="assignment-library">
      <label>
        Student
        <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
          {students.map((s) => (
            <option key={s.uid} value={s.uid}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="error">{error}</p>}

      {(!showOnly || showOnly === 'resources') && (
        <>
          <h3>Resources</h3>
          {(() => {
            const filtered = resourceTypeFilter
              ? visibleResources.filter((r) => r.resourceType === resourceTypeFilter)
              : visibleResources;
            if (filtered.length === 0) return <p>No resources uploaded yet.</p>;
            const grouped: Record<string, Record<string, Record<string, Resource[]>>> = {};
            for (const r of filtered) {
              const gl = r.gradeLevel ?? 'Uncategorised';
              const sub = r.subject ?? 'Unknown';
              const top = r.topic ?? 'Unknown';
              if (!grouped[gl]) grouped[gl] = {};
              if (!grouped[gl][sub]) grouped[gl][sub] = {};
              if (!grouped[gl][sub][top]) grouped[gl][sub][top] = [];
              grouped[gl][sub][top].push(r);
            }
            const formatGL = (gl: string) => gl === 'a-level' ? 'A Level' : gl === 'gcse' ? 'GCSE' : gl;
            const capitalize = (s: string) => s.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            return Object.entries(grouped).map(([gl, subjects]) => (
              <div key={gl} className="resource-group">
                <h4>{formatGL(gl)}</h4>
                {Object.entries(subjects).map(([sub, topics]) => (
                  <div key={sub} className="resource-subgroup">
                    <h5>{capitalize(sub)}</h5>
                    {Object.entries(topics).map(([top, items]) => (
                      <div key={top} className="resource-topic-group">
                        <p className="topic-label">{top}</p>
                        <ul>
                          {items.map((resource) => (
                            <li key={resource.id}>
                              <label>
                                <input
                                  type="checkbox"
                                  checked={isAssigned(resource.id, 'resource')}
                                  onChange={() => toggle(resource.id, 'resource')}
                                />
                                {resource.title}
                              </label>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ));
          })()}
        </>
      )}

      {(!showOnly || showOnly === 'tests') && (
        <>
          <h3>Tests</h3>
          {visibleTests.length === 0 ? (
            <p>No tests available.</p>
          ) : (
            (() => {
              const grouped: Record<string, Record<string, Record<string, Test[]>>> = {};
              for (const t of visibleTests) {
                const gl = t.gradeLevel ?? 'Uncategorised';
                const sub = t.subject ?? 'Unknown';
                const top = t.topic ?? 'Unknown';
                if (!grouped[gl]) grouped[gl] = {};
                if (!grouped[gl][sub]) grouped[gl][sub] = {};
                if (!grouped[gl][sub][top]) grouped[gl][sub][top] = [];
                grouped[gl][sub][top].push(t);
              }
              const formatGL = (gl: string) => gl === 'a-level' ? 'A Level' : gl === 'gcse' ? 'GCSE' : gl;
              const capitalize = (s: string) => s.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
              return Object.entries(grouped).map(([gl, subjects]) => (
                <div key={gl} className="resource-group">
                  <h4>{formatGL(gl)}</h4>
                  {Object.entries(subjects).map(([sub, topics]) => (
                    <div key={sub} className="resource-subgroup">
                      <h5>{capitalize(sub)}</h5>
                      {Object.entries(topics).map(([top, items]) => (
                        <div key={top} className="resource-topic-group">
                          <p className="topic-label">{top}</p>
                          <ul>
                            {items.map((test) => (
                              <li key={test.id}>
                                <label>
                                  <input
                                    type="checkbox"
                                    checked={isAssigned(test.id, 'test')}
                                    onChange={() => toggle(test.id, 'test')}
                                  />
                                  {test.title}
                                </label>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ));
            })()
          )}
        </>
      )}
    </div>
  );
}
