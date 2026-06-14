import { FormEvent, useState } from 'react';
import { api } from '../services/api';

export default function ApplyPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg(null);

    try {
      await api.post('/applications', { name, email, phone, message });
      setStatus('success');
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  return (
    <div className="public-page">
      <h1>Apply to join</h1>
      <p className="page-subtitle">
        We don't offer a tradtional open sign-up.Submit your details below and we'll be in touch to set up your account.
      </p>

      <div className="apply-card">
        {status === 'success' ? (
          <p className="success">Thanks! Your application has been received — we'll be in touch soon.</p>
        ) : (
          <form onSubmit={handleSubmit}>
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
              Phone number
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </label>
            <label>
              Message (optional)
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} />
            </label>
            {status === 'error' && <p className="error">{errorMsg}</p>}
            <button type="submit" disabled={status === 'submitting'}>
              {status === 'submitting' ? 'Submitting…' : 'Submit application'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
