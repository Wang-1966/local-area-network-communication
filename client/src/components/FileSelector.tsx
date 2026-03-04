import React, { useState, useRef } from 'react';

/**
 * Props for FileSelector component
 */
export interface FileSelectorProps {
  onFileSelected: (file: File) => Promise<void>;
  isUploading: boolean;
  disabled: boolean;
  acceptedTypes?: string[];
  maxFileSize?: number;
}

/**
 * File validation result
 */
export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * FileSelector component provides file selection and upload functionality
 * 
 * Features:
 * - File selection button with dialog
 * - File validation feedback (format and size)
 * - Upload progress display
 * - Error handling and user feedback
 * - Support for multiple file selection
 * - Responsive design with Tailwind CSS
 * 
 * Requirements: 1.1, 1.2, 1.5, 2.2, 2.3, 2.5
 */
export function FileSelector({
  onFileSelected,
  isUploading,
  disabled,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime'],
  maxFileSize = 10 * 1024 * 1024, // 10MB default
}: FileSelectorProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Validate file format and size
   */
  const validateFile = (file: File): FileValidationResult => {
    // Check file format
    if (!acceptedTypes.includes(file.type)) {
      const supportedFormats = acceptedTypes
        .map(type => type.split('/')[1].toUpperCase())
        .join(', ');
      return {
        isValid: false,
        error: `不支持的文件格式。支持的格式: ${supportedFormats}`,
      };
    }

    // Check file size
    if (file.size > maxFileSize) {
      const maxSizeMB = (maxFileSize / (1024 * 1024)).toFixed(1);
      return {
        isValid: false,
        error: `文件大小超过限制。最大允许大小: ${maxSizeMB}MB`,
      };
    }

    return { isValid: true };
  };

  /**
   * Handle file selection
   */
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    // Process each selected file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Clear previous error
      setError(null);
      setSelectedFileName(file.name);

      // Validate file
      const validation = validateFile(file);
      if (!validation.isValid) {
        setError(validation.error || '文件验证失败');
        setSelectedFileName(null);
        continue;
      }

      // Upload file
      try {
        setUploadProgress(0);
        
        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return prev;
            }
            return prev + Math.random() * 30;
          });
        }, 200);

        await onFileSelected(file);

        clearInterval(progressInterval);
        setUploadProgress(100);
        
        // Reset after successful upload
        setTimeout(() => {
          setUploadProgress(0);
          setSelectedFileName(null);
        }, 1000);
      } catch (err) {
        setError(err instanceof Error ? err.message : '文件上传失败');
        setUploadProgress(0);
        setSelectedFileName(null);
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Handle button click to open file dialog
   */
  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  /**
   * Get accepted file types for input element
   */
  const getAcceptAttribute = (): string => {
    return acceptedTypes.join(',');
  };

  return (
    <div className="space-y-2">
      {/* File Selection Button */}
      <button
        onClick={handleButtonClick}
        disabled={disabled || isUploading}
        className={`w-full px-4 py-2.5 rounded-md font-medium transition-colors duration-150 text-sm flex items-center justify-center space-x-2 ${
          disabled || isUploading
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-green-600 hover:bg-green-700 text-white'
        }`}
      >
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
            d="M12 4v16m8-8H4"
          />
        </svg>
        <span>
          {isUploading ? '上传中...' : '选择文件'}
        </span>
      </button>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={getAcceptAttribute()}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {/* Upload Progress */}
      {isUploading && uploadProgress > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">
              {selectedFileName && `上传: ${selectedFileName}`}
            </span>
            <span className="text-xs text-gray-600">{Math.round(uploadProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <svg
            className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-xs text-red-700">{error}</span>
        </div>
      )}

      {/* File Format Help Text */}
      <div className="text-xs text-gray-500 text-center">
        支持格式: 图片 (JPG, PNG, GIF) 和视频 (MP4, MOV)，最大 10MB
      </div>
    </div>
  );
}

export default FileSelector;
