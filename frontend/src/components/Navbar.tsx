import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const close = () => setMenuOpen(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    close();
  };

  return (
    <nav className="site-nav">
      <Link to={user ? '/dashboard' : '/'} className="site-logo" onClick={close}>
        <span className="logo-aplus">A<sup>+</sup></span>
        <span className="logo-name">Academy Tutors</span>
      </Link>

      {/* Desktop links */}
      <div className="nav-actions nav-desktop">
        {!user && (
          <>
            <a href="/#offer" className="nav-link">What We Offer</a>
            <a href="/#contact" className="nav-link">Get in Touch</a>
            <Link to="/apply" className="nav-link">Apply</Link>
            <Link to="/testimonials" className="nav-link">Testimonials</Link>
          </>
        )}
        {user && (
          <Link to="/meetings" className="nav-link">Meetings</Link>
        )}
        {role === 'owner' && (
          <Link to="/dashboard/owner" className="nav-btn nav-btn-secondary">Owner Portal</Link>
        )}
        {user ? (
          <button className="nav-btn" onClick={handleLogout}>Log out</button>
        ) : (
          <Link to="/login" className="nav-btn">Log in</Link>
        )}
      </div>

      {/* Hamburger button — mobile/tablet only */}
      <button
        className={`hamburger${menuOpen ? ' hamburger-open' : ''}`}
        onClick={() => setMenuOpen((o) => !o)}
        aria-label="Toggle menu"
      >
        <span />
        <span />
        <span />
      </button>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="mobile-menu">
          {!user && (
            <>
              <a href="/#offer" className="mobile-link" onClick={close}>What We Offer</a>
              <a href="/#contact" className="mobile-link" onClick={close}>Contact</a>
              <Link to="/apply" className="mobile-link" onClick={close}>Apply</Link>
              <Link to="/testimonials" className="mobile-link" onClick={close}>Testimonials</Link>
            </>
          )}
          {user && (
            <Link to="/meetings" className="mobile-link" onClick={close}>Meetings</Link>
          )}
          {role === 'owner' && (
            <Link to="/dashboard/owner" className="mobile-link" onClick={close}>Owner Portal</Link>
          )}
          {user ? (
            <button className="mobile-link mobile-link-btn" onClick={handleLogout}>Log out</button>
          ) : (
            <Link to="/login" className="mobile-link mobile-link-primary" onClick={close}>Log in</Link>
          )}
        </div>
      )}
    </nav>
  );
}
