import { useEffect, useState, useCallback } from 'react';
import { Testimonial } from '../types';
import { api } from '../services/api';
import ConfirmModal from './ConfirmModal';

type EditState = { mode: 'idle' } | { mode: 'add' } | { mode: 'edit'; item: Testimonial };

export default function TestimonialsManager() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [editState, setEditState] = useState<EditState>({ mode: 'idle' });
  const [quote, setQuote] = useState('');
  const [author, setAuthor] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<Testimonial[]>('/testimonials');
      setTestimonials(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load testimonials');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setQuote('');
    setAuthor('');
    setEditState({ mode: 'add' });
    setError(null);
  };

  const openEdit = (item: Testimonial) => {
    setQuote(item.quote);
    setAuthor(item.author);
    setEditState({ mode: 'edit', item });
    setError(null);
  };

  const cancel = () => {
    setEditState({ mode: 'idle' });
    setError(null);
  };

  const save = async () => {
    if (!quote.trim() || !author.trim()) {
      setError('Both quote and author are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editState.mode === 'add') {
        await api.post('/testimonials', { quote: quote.trim(), author: author.trim() });
      } else if (editState.mode === 'edit') {
        await api.patch(`/testimonials/${editState.item.id}`, {
          quote: quote.trim(),
          author: author.trim(),
        });
      }
      await load();
      setEditState({ mode: 'idle' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!pendingDeleteId) return;
    try {
      await api.delete(`/testimonials/${pendingDeleteId}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setPendingDeleteId(null);
    }
  };

  return (
    <>
    <ConfirmModal
      open={!!pendingDeleteId}
      title="Delete testimonial?"
      message="This testimonial will be permanently removed from the site."
      confirmLabel="Delete"
      danger
      onConfirm={remove}
      onCancel={() => setPendingDeleteId(null)}
    />
    <div className="testimonials-manager">
      <div className="tm-header">
        <h2>Testimonials</h2>
        {editState.mode === 'idle' && (
          <button className="btn-primary" onClick={openAdd}>+ Add testimonial</button>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {editState.mode !== 'idle' && (
        <div className="tm-form">
          <h3>{editState.mode === 'add' ? 'New testimonial' : 'Edit testimonial'}</h3>
          <label>
            Quote
            <textarea
              rows={4}
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder="What did the student say?"
            />
          </label>
          <label>
            Author
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="e.g. GCSE Biology student"
            />
          </label>
          <div className="tm-form-actions">
            <button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={cancel} disabled={saving}>Cancel</button>
          </div>
        </div>
      )}

      {testimonials.length === 0 ? (
        <p>No testimonials yet. Add one above.</p>
      ) : (
        <div className="tm-list">
          {testimonials.map((t) => (
            <div key={t.id} className="tm-card">
              <p className="tm-quote">"{t.quote}"</p>
              <span className="tm-author">— {t.author}</span>
              <div className="tm-actions">
                <button onClick={() => openEdit(t)}>Edit</button>
                <button onClick={() => setPendingDeleteId(t.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  );
}
