import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="not-found">
      <div className="not-found-inner">
        <div className="not-found-code">404</div>
        <h1 className="not-found-title">Page not found</h1>
        <p className="not-found-message">
          The page you're looking for doesn't exist or may have been moved.
        </p>
        <Link to="/" className="not-found-btn">Back to home</Link>
      </div>
    </div>
  );
}
