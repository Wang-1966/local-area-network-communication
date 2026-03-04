import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileSelector } from './FileSelector';

describe('FileSelector Component', () => {
  const mockOnFileSelected = vi.fn();

  beforeEach(() => {
    mockOnFileSelected.mockClear();
    vi.clearAllMocks();
  });

  describe('File Selection Button Rendering and Interaction', () => {
    it('should render file selection button', () => {
      render(
        <FileSelector
          onFileSelected={mockOnFileSelected}
          isUploading={false}
          disabled={false}
        />
      );

      const button = screen.getByRole('button', { name: /选择文件/i });
      expect(button).toBeInTheDocument();
    });

    it('should open file dialog when button is clicked', () => {
      render(
        <FileSelector
          onFileSelected={mockOnFileSelected}
          isUploading={false}
          disabled={false}
        />
      );

      const button = screen.getByRole('button', { name: /选择文件/i });
      const fileInput = screen.getByDisplayValue('') as HTMLInputElement;

      fireEvent.click(button);
      expect(fileInput).toHaveAttribute('type', 'file');
    });

    it('should disable button when disabled prop is true', () => {
      render(
        <FileSelector
          onFileSelected={mockOnFileSelected}
          isUploading={false}
          disabled={true}
        />
      );

      const button = screen.getByRole('button', { name: /选择文件/i });
      expect(button).toBeDisabled();
    });

    it('should disable button when isUploading is true', () => {
      render(
        <FileSelector
          onFileSelected={mockOnFileSelected}
          isUploading={true}
          disabled={false}
        />
      );

      const button = screen.getByRole('button', { name: /上传中/i });
      expect(button).toBeDisabled();
    });

    it('should show uploading text when isUploading is true', () => {
      render(
        <FileSelector
          onFileSelected={mockOnFileSelected}
          isUploading={true}
          disabled={false}
        />
      );

      expect(screen.getByText(/上传中/i)).toBeInTheDocument();
    });
  });

  describe('File Validation Feedback Display', () => {
    it('should reject unsupported file format', async () => {
      render(
        <FileSelector
          onFileSelected={mockOnFileSelected}
          isUploading={false}
          disabled={false}
          acceptedTypes={['image/jpeg', 'image/png']}
        />
      );

      const fileInput = screen.getByDisplayValue('') as HTMLInputElement;
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/不支持的文件格式/i)).toBeInTheDocument();
      });

      expect(mockOnFileSelected).not.toHaveBeenCalled();
    });

    it('should reject file exceeding size limit', async () => {
      render(
        <FileSelector
          onFileSelected={mockOnFileSelected}
          isUploading={false}
          disabled={false}
          maxFileSize={1024} // 1KB
        />
      );

      const fileInput = screen.getByDisplayValue('') as HTMLInputElement;
      const largeContent = new Array(2048).fill('a').join('');
      const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/文件大小超过限制/i)).toBeInTheDocument();
      });

      expect(mockOnFileSelected).not.toHaveBeenCalled();
    });

    it('should accept valid image file', async () => {
      mockOnFileSelected.mockResolvedValue(undefined);

      render(
        <FileSelector
          onFileSelected={mockOnFileSelected}
          isUploading={false}
          disabled={false}
          acceptedTypes={['image/jpeg', 'image/png']}
          maxFileSize={10 * 1024 * 1024}
        />
      );

      const fileInput = screen.getByDisplayValue('') as HTMLInputElement;
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockOnFileSelected).toHaveBeenCalledWith(file);
      });
    });

    it('should accept valid video file', async () => {
      mockOnFileSelected.mockResolvedValue(undefined);

      render(
        <FileSelector
          onFileSelected={mockOnFileSelected}
          isUploading={false}
          disabled={false}
          acceptedTypes={['video/mp4', 'video/quicktime']}
          maxFileSize={10 * 1024 * 1024}
        />
      );

      const fileInput = screen.getByDisplayValue('') as HTMLInputElement;
      const file = new File(['content'], 'test.mp4', { type: 'video/mp4' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockOnFileSelected).toHaveBeenCalledWith(file);
      });
    });

    it('should display validation error message with supported formats', async () => {
      render(
        <FileSelector
          onFileSelected={mockOnFileSelected}
          isUploading={false}
          disabled={false}
          acceptedTypes={['image/jpeg', 'image/png', 'video/mp4']}
        />
      );

      const fileInput = screen.getByDisplayValue('') as HTMLInputElement;
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        const errorMessage = screen.getByText(/不支持的文件格式/i);
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage.textContent).toContain('JPEG');
        expect(errorMessage.textContent).toContain('PNG');
        expect(errorMessage.textContent).toContain('MP4');
      });
    });
  });

  describe('Upload Progress and Error States', () => {
    it('should display upload progress', async () => {
      mockOnFileSelected.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 500))
      );

      render(
        <FileSelector
          onFileSelected={mockOnFileSelected}
          isUploading={true}
          disabled={false}
        />
      );

      const fileInput = screen.getByDisplayValue('') as HTMLInputElement;
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/上传:/i)).toBeInTheDocument();
      });
    });

    it('should display error when file upload fails', async () => {
      const errorMessage = '网络连接失败';
      mockOnFileSelected.mockRejectedValue(new Error(errorMessage));

      render(
        <FileSelector
          onFileSelected={mockOnFileSelected}
          isUploading={false}
          disabled={false}
        />
      );

      const fileInput = screen.getByDisplayValue('') as HTMLInputElement;
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should clear error message after successful upload', async () => {
      mockOnFileSelected.mockResolvedValue(undefined);

      const { rerender } = render(
        <FileSelector
          onFileSelected={mockOnFileSelected}
          isUploading={false}
          disabled={false}
        />
      );

      // First upload with error
      mockOnFileSelected.mockRejectedValueOnce(new Error('Upload failed'));

      let fileInput = screen.getByDisplayValue('') as HTMLInputElement;
      let file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/Upload failed/i)).toBeInTheDocument();
      });

      // Second upload successful
      mockOnFileSelected.mockResolvedValueOnce(undefined);

      rerender(
        <FileSelector
          onFileSelected={mockOnFileSelected}
          isUploading={false}
          disabled={false}
        />
      );

      fileInput = screen.getByDisplayValue('') as HTMLInputElement;
      file = new File(['content'], 'test2.jpg', { type: 'image/jpeg' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.queryByText(/Upload failed/i)).not.toBeInTheDocument();
      });
    });

    it('should handle multiple file selection', async () => {
      mockOnFileSelected.mockResolvedValue(undefined);

      render(
        <FileSelector
          onFileSelected={mockOnFileSelected}
          isUploading={false}
          disabled={false}
        />
      );

      const fileInput = screen.getByDisplayValue('') as HTMLInputElement;
      const file1 = new File(['content1'], 'test1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['content2'], 'test2.jpg', { type: 'image/jpeg' });

      fireEvent.change(fileInput, { target: { files: [file1, file2] } });

      await waitFor(() => {
        expect(mockOnFileSelected).toHaveBeenCalledTimes(2);
        expect(mockOnFileSelected).toHaveBeenNthCalledWith(1, file1);
        expect(mockOnFileSelected).toHaveBeenNthCalledWith(2, file2);
      });
    });

    it('should display help text with supported formats', () => {
      render(
        <FileSelector
          onFileSelected={mockOnFileSelected}
          isUploading={false}
          disabled={false}
        />
      );

      expect(screen.getByText(/支持格式/i)).toBeInTheDocument();
      expect(screen.getByText(/最大 10MB/i)).toBeInTheDocument();
    });

    it('should reset file input after successful upload', async () => {
      mockOnFileSelected.mockResolvedValue(undefined);

      render(
        <FileSelector
          onFileSelected={mockOnFileSelected}
          isUploading={false}
          disabled={false}
        />
      );

      const fileInput = screen.getByDisplayValue('') as HTMLInputElement;
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockOnFileSelected).toHaveBeenCalled();
      });

      // File input should be reset
      expect(fileInput.value).toBe('');
    });
  });

  describe('File Type Acceptance', () => {
    it('should accept only specified file types', async () => {
      mockOnFileSelected.mockResolvedValue(undefined);

      render(
        <FileSelector
          onFileSelected={mockOnFileSelected}
          isUploading={false}
          disabled={false}
          acceptedTypes={['image/jpeg']}
        />
      );

      const fileInput = screen.getByDisplayValue('') as HTMLInputElement;

      // PNG should be rejected
      const pngFile = new File(['content'], 'test.png', { type: 'image/png' });
      fireEvent.change(fileInput, { target: { files: [pngFile] } });

      await waitFor(() => {
        expect(screen.getByText(/不支持的文件格式/i)).toBeInTheDocument();
      });

      expect(mockOnFileSelected).not.toHaveBeenCalled();
    });

    it('should accept all default supported formats', async () => {
      mockOnFileSelected.mockResolvedValue(undefined);

      render(
        <FileSelector
          onFileSelected={mockOnFileSelected}
          isUploading={false}
          disabled={false}
        />
      );

      const fileInput = screen.getByDisplayValue('') as HTMLInputElement;

      const formats = [
        { name: 'test.jpg', type: 'image/jpeg' },
        { name: 'test.png', type: 'image/png' },
        { name: 'test.gif', type: 'image/gif' },
        { name: 'test.mp4', type: 'video/mp4' },
        { name: 'test.mov', type: 'video/quicktime' },
      ];

      for (const format of formats) {
        mockOnFileSelected.mockClear();
        const file = new File(['content'], format.name, { type: format.type });
        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => {
          expect(mockOnFileSelected).toHaveBeenCalledWith(file);
        });
      }
    });
  });
});
