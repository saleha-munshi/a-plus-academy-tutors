import { FormEvent, useEffect, useState, useCallback } from 'react';
import { Application, Role, UserProfile } from '../types';
import { api } from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import ConfirmModal from './ConfirmModal';

const ALL_SUBJECTS = [
  'biology', 'business', 'chemistry', 'citizenship', 'computer science',
  'economics', 'english', 'english language', 'english literature',
  'french', 'geography', 'history', 'maths', 'physics',
  'psychology', 'religious studies', 'sociology',
].sort();

const capitalize = (s: string) =>
  s.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export default function UserManagementPanel() {
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [tutors, setTutors] = useState<UserProfile[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteUid, setPendingDeleteUid] = useState<string | null>(null);

  // New account form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Exclude<Role, 'owner'>>('student');
  const [assignedTutorId, setAssignedTutorId] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [studentsData, tutorsData, applicationsData] = await Promise.all([
        api.get<UserProfile[]>('/students'),
        api.get<UserProfile[]>('/tutors'),
        api.get<Application[]>('/applications'),
      ]);
      setStudents(studentsData);
      setTutors(tutorsData);
      setApplications(applicationsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await api.post('/auth/createUser', {
        name,
        email,
        password,
        role,
        assignedTutorId: role === 'student' ? assignedTutorId || undefined : undefined,
        subjects: role === 'student' ? selectedSubjects : undefined,
      });

      setName('');
      setEmail('');
      setPassword('');
      setAssignedTutorId('');
      setSelectedSubjects([]);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!pendingDeleteUid) return;
    setError(null);
    try {
      await api.delete(`/auth/deleteUser/${pendingDeleteUid}`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setPendingDeleteUid(null);
    }
  };

  const handleApplicationAction = async (id: string, status: 'pending' | 'onboarded' | 'rejected') => {
    setError(null);
    try {
      await api.patch(`/applications/${id}`, { status });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update application');
    }
  };

  const handleReassign = async (studentId: string, tutorId: string) => {
    setError(null);
    try {
      await api.patch(`/students/${studentId}/tutor`, { tutorId });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reassign student');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="user-management-panel">
      {error && <p className="error">{error}</p>}

      <section>
        <h2>Create Account</h2>
        <form onSubmit={handleCreateUser}>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>
          <label>
            Role
            <select value={role} onChange={(e) => setRole(e.target.value as Exclude<Role, 'owner'>)}>
              <option value="student">Student</option>
              <option value="tutor">Tutor</option>
            </select>
          </label>
          {role === 'student' && (
            <>
              <label>
                Assign to tutor (optional)
                <select value={assignedTutorId} onChange={(e) => setAssignedTutorId(e.target.value)}>
                  <option value="">None</option>
                  {tutors.map((t) => (
                    <option key={t.uid} value={t.uid}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset className="subject-picker">
                <legend>Subjects</legend>
                <div className="subject-picker-grid">
                  {ALL_SUBJECTS.map((sub) => (
                    <label key={sub} className="subject-picker-item">
                      <input
                        type="checkbox"
                        checked={selectedSubjects.includes(sub)}
                        onChange={(e) =>
                          setSelectedSubjects((prev) =>
                            e.target.checked ? [...prev, sub] : prev.filter((s) => s !== sub)
                          )
                        }
                      />
                      {capitalize(sub)}
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          )}
          <button type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create account'}
          </button>
        </form>
      </section>

      <section>
        <h2>Applications</h2>
        {applications.length === 0 ? (
          <p>No applications yet.</p>
        ) : (
          <div className="applications-table-wrap">
            <table className="applications-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Message</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id}>
                    <td>{app.name}</td>
                    <td>{app.email}</td>
                    <td>{app.phone || '—'}</td>
                    <td className="app-message">{app.message || '—'}</td>
                    <td className="app-actions">
                      <select
                        className={`app-status-select app-status-${app.status}`}
                        value={app.status}
                        onChange={(e) =>
                          handleApplicationAction(app.id, e.target.value as 'onboarded' | 'rejected')
                        }
                      >
                        <option value="pending">Pending</option>
                        <option value="onboarded">Onboarded</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2>Tutors</h2>
        <ul>
          {tutors.map((tutor) => (
            <li key={tutor.uid} className="user-row">
              <span className="user-row-name">{tutor.name} <span className="user-row-email">({tutor.email})</span></span>
              <div className="user-row-controls">
                {tutor.role !== 'owner' && (
                  <button onClick={() => setPendingDeleteUid(tutor.uid)}>Delete</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Students</h2>
        <ul>
          {students.map((student) => (
            <li key={student.uid} className="user-row">
              <span className="user-row-name">{student.name} <span className="user-row-email">({student.email})</span></span>
              <div className="user-row-controls">
                <span className="user-row-label">Tutor</span>
                <select
                  value={student.assignedTutorId ?? ''}
                  onChange={(e) => handleReassign(student.uid, e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {tutors.map((t) => (
                    <option key={t.uid} value={t.uid}>{t.name}</option>
                  ))}
                </select>
                {student.role !== 'owner' && (
                  <button onClick={() => setPendingDeleteUid(student.uid)}>Delete</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <ConfirmModal
        open={!!pendingDeleteUid}
        title="Delete user?"
        message="This will permanently delete the account. This cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteUser}
        onCancel={() => setPendingDeleteUid(null)}
      />
    </div>
  );
}
