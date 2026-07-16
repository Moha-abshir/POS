import React, { useState, useRef } from 'react';
import { UploadCloud, X, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ value, onChange, label }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setIsUploading(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const uploadedUrl = res.data.data.imageUrl;
      onChange(uploadedUrl);
      toast.success('Image uploaded and compressed successfully');
    } catch (err: any) {
      console.error(err);
      const serverMessage = err.response?.data?.error?.message || 'Failed to upload image';
      setErrorMsg(serverMessage);
      toast.error(serverMessage);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)]">
          {label}
        </label>
      )}

      {value ? (
        // Preview State
        <div className="relative border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-bg-sunken)] p-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img 
              src={value} 
              alt="Preview" 
              className="w-12 h-12 object-cover rounded-[var(--radius-sm)] border border-[var(--color-border)]/50 shrink-0" 
            />
            <span className="text-[var(--text-sm)] text-[var(--color-text-primary)] truncate max-w-[240px]">
              {value}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onChange('')}
            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-[var(--radius-sm)] transition-colors shrink-0 cursor-pointer"
            title="Remove Image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : isUploading ? (
        // Uploading State
        <div className="border border-dashed border-[var(--color-border)] rounded-[var(--radius-md)] p-6 bg-[var(--color-bg-sunken)]/50 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
          <span className="text-[var(--text-sm)] text-[var(--color-text-secondary)] font-medium animate-pulse">
            Uploading & Compressing...
          </span>
        </div>
      ) : (
        // Upload / Input State
        <div className="space-y-2">
          <label
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="border border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] rounded-[var(--radius-md)] p-6 bg-[var(--color-bg-sunken)]/30 hover:bg-[var(--color-bg-sunken)]/80 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 block"
          >
            <UploadCloud className="w-8 h-8 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors" />
            <div className="text-center">
              <p className="text-[var(--text-sm)] font-medium text-[var(--color-text-primary)]">
                Click to upload or drag and drop
              </p>
              <p className="text-[var(--text-xs)] text-[var(--color-text-secondary)] mt-0.5">
                PNG, JPG, WEBP (will be compressed to WebP)
              </p>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </label>
          
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-xs)] text-[var(--color-text-secondary)] whitespace-nowrap">Or paste URL:</span>
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full h-8 px-2 bg-[var(--color-bg-inset)] border border-[var(--color-border)] rounded-[var(--radius-sm)] text-[var(--color-text-primary)] text-[var(--text-xs)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>
      )}

      {errorMsg && (
        <p className="text-[var(--text-xs)] text-red-500 font-medium mt-1">
          {errorMsg}
        </p>
      )}
    </div>
  );
};
