import React, { ReactNode, ErrorInfo } from 'react';

/**
 * Props for ErrorBoundary component
 */
interface ErrorBoundaryProps {
  children: ReactNode;
}

/**
 * State for ErrorBoundary component
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary component catches unexpected errors and displays user-friendly error messages
 * 
 * Features:
 * - Catch unexpected errors in child components
 * - Display user-friendly error messages
 * - Provide page refresh option
 * - Log error details for debugging
 * 
 * Requirements: 9.3, 9.4
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Update state so the next render will show the fallback UI
   */
  static getDerivedStateFromError(_error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  /**
   * Log error details for debugging
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  /**
   * Handle page refresh
   */
  handleRefresh = () => {
    window.location.reload();
  };

  /**
   * Handle dismiss error
   */
  handleDismiss = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            {/* Error Icon */}
            <div className="flex justify-center mb-4">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg
                  className="h-6 w-6 text-red-600"
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
              </div>
            </div>

            {/* Error Title */}
            <h1 className="text-center text-xl font-semibold text-gray-900 mb-2">
              应用出错了
            </h1>

            {/* Error Message */}
            <p className="text-center text-gray-600 mb-4">
              抱歉，应用遇到了一个意外错误。请尝试刷新页面或联系管理员。
            </p>

            {/* Error Details (Development only) */}
            {import.meta.env.DEV && this.state.error && (
              <div className="mb-4 p-3 bg-gray-100 rounded text-sm">
                <p className="font-mono text-red-600 break-words">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-2 text-xs text-gray-600">
                    <summary className="cursor-pointer font-semibold">
                      详细信息
                    </summary>
                    <pre className="mt-2 overflow-auto max-h-40 text-xs">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={this.handleRefresh}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-150 font-medium"
              >
                刷新页面
              </button>
              <button
                onClick={this.handleDismiss}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors duration-150 font-medium"
              >
                关闭
              </button>
            </div>

            {/* Help Text */}
            <p className="text-center text-xs text-gray-500 mt-4">
              如果问题持续存在，请清除浏览器缓存或尝试使用其他浏览器
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
