import { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, View, SlotInfo } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Meeting, MeetingStatus, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmModal from '../components/ConfirmModal';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

interface CalEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Meeting;
}

type ModalState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; meeting: Meeting }
  | { type: 'view'; meeting: Meeting }
  | { type: 'propose'; meeting: Meeting };

function toLocalDT(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fmtRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const date = s.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const startT = s.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const endT = e.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${startT} – ${endT}`;
}

const STATUS_LABELS: Record<MeetingStatus, string> = {
  pending: 'Awaiting response',
  confirmed: 'Confirmed',
  student_proposed: 'New time proposed',
  declined: 'Declined',
};

const STATUS_COLORS: Record<MeetingStatus, { bg: string; border: string }> = {
  pending:          { bg: '#8a6d00', border: 'var(--gold)' },
  confirmed:        { bg: 'var(--navy)', border: 'var(--gold)' },
  student_proposed: { bg: '#9a3412', border: '#f97316' },
  declined:         { bg: '#6b7280', border: '#9ca3af' },
};

export default function MeetingsPage() {
  const { role } = useAuth();
  const canEdit = role === 'tutor' || role === 'owner';
  const isStudent = role === 'student';

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [calView, setCalView] = useState<View>(window.innerWidth < 640 ? 'agenda' : 'week');
  const [calDate, setCalDate] = useState(new Date());
  const [calHeight, setCalHeight] = useState(() => {
    const w = window.innerWidth;
    return w < 640 ? '52vh' : w < 1024 ? '65vh' : '72vh';
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [saving, setSaving] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<{ type: 'delete-meeting' | 'decline-proposal'; id: string } | null>(null);

  const [form, setForm] = useState({ title: '', studentId: '', start: '', end: '', meetLink: '', notes: '' });
  const [proposeForm, setProposeForm] = useState({ proposedStart: '', proposedEnd: '', proposalNotes: '' });

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      setCalHeight(w < 640 ? '52vh' : w < 1024 ? '65vh' : '72vh');
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [meetingsData, studentsData] = await Promise.all([
        api.get<Meeting[]>('/meetings'),
        canEdit ? api.get<UserProfile[]>('/students') : Promise.resolve<UserProfile[]>([]),
      ]);
      setMeetings(meetingsData);
      setStudents(studentsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [canEdit]);

  useEffect(() => { load(); }, [load]);

  const events: CalEvent[] = meetings.map((m) => {
    const status = m.status ?? 'pending';
    const suffix = status !== 'confirmed' ? ` · ${STATUS_LABELS[status]}` : '';
    return { id: m.id, title: m.title + suffix, start: new Date(m.start), end: new Date(m.end), resource: m };
  });

  /* ── Modal openers ── */
  const openCreate = (slot: SlotInfo) => {
    if (!canEdit) return;
    const s = slot.start;
    const e = slot.end <= slot.start ? new Date(slot.start.getTime() + 60 * 60 * 1000) : slot.end;
    setForm({ title: '', studentId: '', start: toLocalDT(s), end: toLocalDT(e), meetLink: '', notes: '' });
    setModal({ type: 'create' });
    setError(null);
  };

  const openView = (event: CalEvent) => { setModal({ type: 'view', meeting: event.resource }); };

  const openEdit = (meeting: Meeting) => {
    setForm({ title: meeting.title, studentId: meeting.studentId, start: toLocalDT(meeting.start),
      end: toLocalDT(meeting.end), meetLink: meeting.meetLink || '', notes: meeting.notes || '' });
    setModal({ type: 'edit', meeting });
    setError(null);
  };

  const openPropose = (meeting: Meeting) => {
    setProposeForm({ proposedStart: toLocalDT(meeting.start), proposedEnd: toLocalDT(meeting.end), proposalNotes: '' });
    setModal({ type: 'propose', meeting });
    setError(null);
  };

  const closeModal = () => { setModal({ type: 'none' }); setError(null); };

  /* ── Actions ── */
  const save = async () => {
    if (!form.title.trim() || !form.studentId || !form.start || !form.end) {
      setError('Title, student, start and end are all required.'); return;
    }
    const startDate = new Date(form.start);
    const endDate = new Date(form.end);
    if (endDate <= startDate) { setError('End must be after start.'); return; }
    setSaving(true); setError(null);
    try {
      const student = students.find((s) => s.uid === form.studentId);
      const payload = { title: form.title.trim(), studentId: form.studentId, studentName: student?.name || '',
        start: startDate.toISOString(), end: endDate.toISOString(), meetLink: form.meetLink.trim(), notes: form.notes.trim() };
      if (modal.type === 'create') await api.post('/meetings', payload);
      if (modal.type === 'edit') await api.patch(`/meetings/${modal.meeting.id}`, payload);
      await load(); closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally { setSaving(false); }
  };

  const deleteMeeting = (id: string) => setPendingConfirm({ type: 'delete-meeting', id });

  const handleAccept = async (id: string) => {
    try { await api.post(`/meetings/${id}/accept`, {}); await load(); closeModal(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to accept'); }
  };

  const handleSubmitProposal = async () => {
    if (!proposeForm.proposedStart || !proposeForm.proposedEnd) {
      setError('Please select a start and end time.'); return;
    }
    const s = new Date(proposeForm.proposedStart);
    const e = new Date(proposeForm.proposedEnd);
    if (e <= s) { setError('End must be after start.'); return; }
    if (modal.type !== 'propose') return;
    setSaving(true); setError(null);
    try {
      await api.post(`/meetings/${modal.meeting.id}/propose`, {
        proposedStart: s.toISOString(), proposedEnd: e.toISOString(), proposalNotes: proposeForm.proposalNotes.trim(),
      });
      await load(); closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally { setSaving(false); }
  };

  const handleAcceptProposal = async (id: string) => {
    try { await api.post(`/meetings/${id}/accept-proposal`, {}); await load(); closeModal(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to accept proposal'); }
  };

  const handleDeclineProposal = (id: string) => setPendingConfirm({ type: 'decline-proposal', id });

  const handleConfirmAction = async () => {
    if (!pendingConfirm) return;
    const { type, id } = pendingConfirm;
    setPendingConfirm(null);
    try {
      if (type === 'delete-meeting') { await api.delete(`/meetings/${id}`); await load(); closeModal(); }
      if (type === 'decline-proposal') { await api.post(`/meetings/${id}/decline-proposal`, {}); await load(); closeModal(); }
    } catch (err) { setError(err instanceof Error ? err.message : 'Action failed'); }
  };

  if (loading) return <LoadingSpinner message="Loading meetings…" />;

  const isFormModal = modal.type === 'create' || modal.type === 'edit';

  return (
    <div className="meetings-page">
      <div className="meetings-header">
        <h1>Meetings</h1>
        {canEdit && (
          <button className="meet-btn-primary" onClick={() => {
            const now = new Date();
            const later = new Date(now.getTime() + 60 * 60 * 1000);
            setForm({ title: '', studentId: '', start: toLocalDT(now), end: toLocalDT(later), meetLink: '', notes: '' });
            setModal({ type: 'create' }); setError(null);
          }}>
            + New meeting
          </button>
        )}
      </div>

      {error && !isFormModal && modal.type === 'none' && <p className="error">{error}</p>}

      {/* Calendar legend */}
      <div className="cal-legend">
        {(Object.entries(STATUS_COLORS) as [MeetingStatus, { bg: string; border: string }][]).map(([s, c]) => (
          <span key={s} className="cal-legend-item">
            <span className="cal-legend-dot" style={{ background: c.bg }} />
            {STATUS_LABELS[s]}
          </span>
        ))}
      </div>

      <div className="cal-wrapper">
        <Calendar<CalEvent>
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: calHeight }}
          view={calView}
          onView={(v: View) => setCalView(v)}
          date={calDate}
          onNavigate={(d: Date) => setCalDate(d)}
          selectable={canEdit}
          onSelectSlot={openCreate}
          onSelectEvent={openView}
          eventPropGetter={(event: CalEvent) => {
            const status: MeetingStatus = event.resource.status ?? 'pending';
            const c = STATUS_COLORS[status];
            return { style: { backgroundColor: c.bg, borderLeft: `3px solid ${c.border}`, color: '#fff', borderRadius: '4px', fontSize: '0.82rem' } };
          }}
        />
      </div>

      {/* ── View modal ── */}
      {modal.type === 'view' && (() => {
        const m = modal.meeting;
        const status: MeetingStatus = m.status ?? 'pending';
        return (
          <div className="meet-overlay" onClick={closeModal}>
            <div className="meet-modal" onClick={(e) => e.stopPropagation()}>
              <button className="meet-close" onClick={closeModal}>✕</button>

              <span className={`meet-status-badge meet-status-${status}`}>{STATUS_LABELS[status]}</span>
              <h2 className="meet-title">{m.title}</h2>
              <p className="meet-time">{fmtRange(m.start, m.end)}</p>

              <div className="meet-detail"><span className="meet-label">Student</span><span>{m.studentName || '—'}</span></div>
              {m.tutorName && <div className="meet-detail"><span className="meet-label">Tutor</span><span>{m.tutorName}</span></div>}
              {m.notes && <div className="meet-detail"><span className="meet-label">Notes</span><span>{m.notes}</span></div>}

              {/* Join link — only for confirmed */}
              {status === 'confirmed' && (
                m.meetLink
                  ? <a href={m.meetLink} target="_blank" rel="noopener noreferrer" className="meet-join-btn">Join Google Meet</a>
                  : <p className="meet-no-link">No Google Meet link added yet.</p>
              )}

              {/* Student: pending → accept or propose */}
              {isStudent && status === 'pending' && (
                <div className="meet-student-actions">
                  <p className="meet-hint">Please confirm or suggest a different time.</p>
                  <div className="meet-modal-actions">
                    <button className="meet-btn-primary" onClick={() => handleAccept(m.id)}>Accept</button>
                    <button className="meet-btn-outline" onClick={() => openPropose(m)}>Propose new time</button>
                  </div>
                </div>
              )}

              {/* Student: waiting on tutor */}
              {isStudent && status === 'student_proposed' && m.proposedStart && m.proposedEnd && (
                <div className="meet-proposal-box">
                  <p className="meet-proposal-label">Your proposed time</p>
                  <p className="meet-proposal-time">{fmtRange(m.proposedStart, m.proposedEnd)}</p>
                  {m.proposalNotes && <p className="meet-hint">"{m.proposalNotes}"</p>}
                  <p className="meet-hint" style={{ marginTop: '0.5rem' }}>Waiting for your tutor to respond.</p>
                </div>
              )}

              {/* Student: declined */}
              {isStudent && status === 'declined' && (
                <div className="meet-proposal-box meet-declined-box">
                  <p>Your proposed time was declined. Contact your tutor to reschedule.</p>
                </div>
              )}

              {/* Tutor: student proposed a new time */}
              {canEdit && status === 'student_proposed' && m.proposedStart && m.proposedEnd && (
                <div className="meet-proposal-box">
                  <p className="meet-proposal-label">Student proposed a new time</p>
                  <p className="meet-proposal-time">{fmtRange(m.proposedStart, m.proposedEnd)}</p>
                  {m.proposalNotes && <p className="meet-hint">"{m.proposalNotes}"</p>}
                  <div className="meet-modal-actions" style={{ marginTop: '0.75rem' }}>
                    <button className="meet-btn-primary" onClick={() => handleAcceptProposal(m.id)}>Accept proposal</button>
                    <button className="meet-btn-danger" onClick={() => handleDeclineProposal(m.id)}>Decline</button>
                  </div>
                </div>
              )}

              {/* Tutor: edit / delete always available */}
              {canEdit && (
                <div className="meet-modal-actions" style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                  <button className="meet-btn-outline" onClick={() => openEdit(m)}>Edit</button>
                  <button className="meet-btn-danger" onClick={() => deleteMeeting(m.id)}>Delete</button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Propose new time modal ── */}
      {modal.type === 'propose' && (
        <div className="meet-overlay" onClick={closeModal}>
          <div className="meet-modal meet-form-modal" onClick={(e) => e.stopPropagation()}>
            <button className="meet-close" onClick={closeModal}>✕</button>
            <h2>Propose a new time</h2>
            <p className="meet-hint">Original: {fmtRange(modal.meeting.start, modal.meeting.end)}</p>

            {error && <p className="error">{error}</p>}

            <div className="meet-datetime-row">
              <label>
                New start
                <input type="datetime-local" value={proposeForm.proposedStart}
                  onChange={(e) => setProposeForm({ ...proposeForm, proposedStart: e.target.value })} />
              </label>
              <label>
                New end
                <input type="datetime-local" value={proposeForm.proposedEnd}
                  onChange={(e) => setProposeForm({ ...proposeForm, proposedEnd: e.target.value })} />
              </label>
            </div>

            <label>
              Message (optional)
              <textarea rows={2} value={proposeForm.proposalNotes} placeholder="Reason for the change…"
                onChange={(e) => setProposeForm({ ...proposeForm, proposalNotes: e.target.value })} />
            </label>

            <div className="meet-modal-actions">
              <button className="meet-btn-primary" onClick={handleSubmitProposal} disabled={saving}>
                {saving ? 'Sending…' : 'Send proposal'}
              </button>
              <button className="meet-btn-outline" onClick={closeModal} disabled={saving}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit modal ── */}
      {isFormModal && (
        <div className="meet-overlay" onClick={closeModal}>
          <div className="meet-modal meet-form-modal" onClick={(e) => e.stopPropagation()}>
            <button className="meet-close" onClick={closeModal}>✕</button>
            <h2>{modal.type === 'create' ? 'New meeting' : 'Edit meeting'}</h2>

            {error && <p className="error">{error}</p>}

            <label>
              Title
              <input type="text" value={form.title} placeholder="e.g. GCSE Maths — Algebra session"
                onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>

            <label>
              Student
              <select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}>
                <option value="">— Select student —</option>
                {students.map((s) => <option key={s.uid} value={s.uid}>{s.name}</option>)}
              </select>
            </label>

            <div className="meet-datetime-row">
              <label>
                Start
                <input type="datetime-local" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
              </label>
              <label>
                End
                <input type="datetime-local" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
              </label>
            </div>

            <label>
              Google Meet link
              <div className="meet-link-row">
                <input type="url" value={form.meetLink} placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  onChange={(e) => setForm({ ...form, meetLink: e.target.value })} />
                <a href="https://meet.google.com/new" target="_blank" rel="noopener noreferrer" className="meet-create-btn">
                  Create Meet
                </a>
              </div>
              <span className="meet-hint">Click "Create Meet" → copy the link → paste it above.</span>
            </label>

            <label>
              Notes
              <textarea rows={3} value={form.notes} placeholder="Topics to cover, homework to review…"
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </label>

            <div className="meet-modal-actions">
              <button className="meet-btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              <button className="meet-btn-outline" onClick={closeModal} disabled={saving}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!pendingConfirm}
        title={pendingConfirm?.type === 'delete-meeting' ? 'Delete meeting?' : 'Decline proposal?'}
        message={
          pendingConfirm?.type === 'delete-meeting'
            ? 'This meeting will be permanently removed.'
            : 'The student will be notified that their proposed time was declined.'
        }
        confirmLabel={pendingConfirm?.type === 'delete-meeting' ? 'Delete' : 'Decline'}
        danger
        onConfirm={handleConfirmAction}
        onCancel={() => setPendingConfirm(null)}
      />
    </div>
  );
}
