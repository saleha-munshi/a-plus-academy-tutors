import { useEffect, useState } from 'react';
import { Testimonial } from '../types';
import { api } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Testimonial[]>('/testimonials')
      .then(setTestimonials)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="public-page">
      <h1>What our students say</h1>
      <p className="page-subtitle">Real results from real students across GCSE and A-Level.</p>

      {loading ? (
        <LoadingSpinner message="Loading testimonials…" />
      ) : testimonials.length === 0 ? (
        <p style={{ textAlign: 'center' }}>No testimonials yet — check back soon.</p>
      ) : (
        <div className="testimonials-grid">
          {testimonials.map((t) => (
            <div key={t.id} className="review-card">
              <p>"{t.quote}"</p>
              <span>— {t.author}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
