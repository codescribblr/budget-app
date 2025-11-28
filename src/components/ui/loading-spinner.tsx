interface LoadingSpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function LoadingSpinner({ className = '', size = 'md', showText = true }: LoadingSpinnerProps = {}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  // If className is provided, assume it's an inline spinner (no full screen wrapper)
  if (className) {
    return (
      <div className={`animate-spin rounded-full border-b-2 border-primary ${sizeClasses[size]} ${className}`}></div>
    );
  }

  // Default full-screen spinner
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className={`animate-spin rounded-full border-b-2 border-primary ${sizeClasses[size]}`}></div>
        {showText && <p className="text-muted-foreground">Loading...</p>}
      </div>
    </div>
  );
}

