export default function MobileShell({ children, className = '' }) {
  return (
    <div className="mobile-viewport">
      <div className={`mobile-shell ${className}`}>{children}</div>
    </div>
  );
}
