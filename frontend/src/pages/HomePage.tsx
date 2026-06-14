export default function HomePage() {
  return (
    <div className="homepage">
      <header className="hero">
        <div className="hero-inner">
          <img src="/logo.png.jpeg" alt="A+ Academy Tutors" className="hero-logo-img" />
          <div className="hero-divider">
            <span className="hero-diamond" />
          </div>
          <p className="hero-subtitle">Premium GCSE &amp; A-Level Tuition for Top Grades</p>
        </div>
      </header>

      <div className="homepage-content">
        {/* About Us / What We Offer */}
        <section id="offer" className="about-section">
          <h2>What we offer</h2>
          <p className="about-intro">
            At A+ Academy Tutors, we provide personalised, high-quality tuition designed to help
            students reach their full potential at GCSE and A-Level. Every student receives
            dedicated one-to-one support tailored to their individual needs, learning style, and
            exam board — so no two sessions are ever the same.
          </p>
          <ul className="offerings-list">
            <li className="offering-item">
              <span className="offering-icon">◷</span>
              <div>
                <strong>Free 45-Minute Trial Session</strong>
                <p>See if we're the right fit — no commitment needed.</p>
              </div>
            </li>
            <li className="offering-item">
              <span className="offering-icon">⊙</span>
              <div>
                <strong>Weekly 1-to-1 Lessons</strong>
                <p>Focused, distraction-free sessions built around your goals.</p>
              </div>
            </li>
            <li className="offering-item">
              <span className="offering-icon">≡</span>
              <div>
                <strong>Personalised Revision Schedule</strong>
                <p>A structured plan so you always know what to revise and when.</p>
              </div>
            </li>
            <li className="offering-item">
              <span className="offering-icon">✦</span>
              <div>
                <strong>Exam-Specific Questions &amp; Predicted Papers</strong>
                <p>Practice with targeted material matched to your exact exam board.</p>
              </div>
            </li>
            <li className="offering-item">
              <span className="offering-icon">◈</span>
              <div>
                <strong>Homework Support Between Lessons</strong>
                <p>We're here when questions come up outside of sessions too.</p>
              </div>
            </li>
            <li className="offering-item">
              <span className="offering-icon">✦</span>
              <div>
                <strong>Refer a Friend, Earn a Free Lesson</strong>
                <p>Know someone who'd benefit? A successful referral earns you a free lesson.</p>
              </div>
            </li>
          </ul>
        </section>

        {/* Contact */}
        <section id="contact" className="contact-section">
          <h2>Get in touch</h2>
          <p className="about-intro">
            Ready to get started or have a question? Reach out through any of the options below.
          </p>
          <div className="contact-cards">
            <a href="mailto:emaeesa@gmail.com" className="contact-card">
              <span className="contact-icon">✉</span>
              <div>
                <span className="contact-label">Email</span>
                <span className="contact-value">emaeesa@gmail.com</span>
              </div>
            </a>
            <a href="https://wa.me/447541409741" target="_blank" rel="noreferrer" className="contact-card">
              <span className="whatsapp-icon"><img src="/whatsapp.png"></img></span>
              <div>
                <span className="contact-label">WhatsApp</span>
                <span className="contact-value">07541 409741</span>
              </div>
            </a>
            <a href="tel:+447450147031" className="contact-card">
              <span className="contact-icon">✆</span>
              <div>
                <span className="contact-label">Phone</span>
                <span className="contact-value">07450 147031</span>
              </div>
            </a>
          </div>
        </section>

      </div>
    </div>
  );
}
