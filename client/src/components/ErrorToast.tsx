import { useEffect, useState } from 'react';

/**
 * Props for ErrorToast component
 */
interface ErrorToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
  type?: 'error' | 'warning' | 'info' | 'success';
}

/**
 * ErrorToast component displays error messages with auto-dismiss
 * 
 * Features:
 * - Display various error messages (connection error, send failure, validation error, etc.)
 * - Auto-dismiss after 3-5 seconds
 * - Manual close button
 * - Different styles for different error types
 * - Smooth animations
 * - Tailwind CSS styling
 * 
 * Requirements: 1.6, 6.2, 6.5, 7.2, 9.1, 9.2
 */
export function ErrorToast({
  message,
  onClose,
  duration = 4000,
  type = 'error',
}: ErrorToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  /**
   * Auto-dismiss after duration
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  /**
   * Handle manual close
   */
  const handleClose = () => {
    setIsVisible(false);
    onClose();
  };

  /**
   * Get styling based on error type
   */
  const getStyleClasses = () => {
    switch (type) {
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-600',
          text: 'text-red-800',
          button: 'hover:bg-red-100',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          icon: 'text-yellow-600',
          text: 'text-yellow-800',
          button: 'hover:bg-yellow-100',
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'text-blue-600',
          text: 'text-blue-800',
          button: 'hover:bg-blue-100',
        };
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: 'text-green-600',
          text: 'text-green-800',
          button: 'hover:bg-green-100',
        };
      default:
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-600',
          text: 'text-red-800',
          button: 'hover:bg-red-100',
        };
    }
  };

  /**
   * Get icon based on error type
   */
  const getIcon = () => {
    switch (type) {
      case 'error':
        return (
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'warning':
        return (
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4v2m0 4v2M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'info':
        return (
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'success':
        return (
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  const styles = getStyleClasses();

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`fixed top-4 right-4 max-w-sm w-full ${styles.bg} border ${styles.border} rounded-lg shadow-lg p-4 animate-in fade-in slide-in-from-top-2 duration-300 z-50`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 ${styles.icon}`}>
          {getIcon()}
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${styles.text}`}>
            {message}
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className={`flex-shrink-0 ml-2 inline-flex text-gray-400 ${styles.button} rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent transition-colors duration-150`}
        >
          <span className="sr-only">关闭</span>
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${
            type === 'error'
              ? 'bg-red-600'
              : type === 'warning'
              ? 'bg-yellow-600'
              : type === 'info'
              ? 'bg-blue-600'
              : 'bg-green-600'
          } animate-pulse`}
          style={{
            animation: `shrink ${duration}ms linear forwards`,
          }}
        />
      </div>

      <style>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}

export default ErrorToast;
