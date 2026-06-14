export default function LoadingSpinner({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="loading-screen">
      <div className="loading-spinner" />
      <p className="loading-message">{message}</p>
    </div>
  );
}
