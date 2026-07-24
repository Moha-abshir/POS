import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle, AlertCircle, RefreshCw, Download } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';

export interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  templateHeaders: string[];
  sampleRow: string[];
  importUrl: string;
  onSuccess: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  title,
  templateHeaders,
  sampleRow,
  importUrl,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    successCount: number;
    failureCount: number;
    errors: { row: number; name: string; message: string }[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile);
      setResult(null);
    } else {
      toast.error('Please upload a valid CSV file');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setResult(null);
      } else {
        toast.error('Please upload a valid CSV file');
      }
    }
  };

  const downloadTemplate = () => {
    const csvContent = [
      templateHeaders.join(','),
      sampleRow.join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${title.toLowerCase().replace(/\s+/g, '_')}_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = async () => {
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const csvText = e.target?.result as string;
        const { data } = await api.post(importUrl, { csvText });
        
        setResult({
          successCount: data.successCount,
          failureCount: data.failureCount,
          errors: data.errors,
        });

        if (data.successCount > 0) {
          toast.success(`Successfully imported ${data.successCount} items!`);
          onSuccess();
        } else {
          toast.error('Import failed. Please check the errors below.');
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || err.message || 'Failed to parse or upload CSV file');
      } finally {
        setIsLoading(false);
      }
    };

    reader.readAsText(file);
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-2xl border border-gray-100 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">Upload a CSV file to bulk import records</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          
          {/* Template download header card */}
          {!result && (
            <div className="bg-amber-50/50 border border-amber-200/50 rounded-xl p-4 flex items-start gap-3">
              <FileSpreadsheet className="text-[#D97706] w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <span className="font-bold text-amber-900">Need a template file?</span>
                <p className="text-amber-700 mt-1 leading-normal">
                  To ensure headers and values align perfectly with our validator, download the template CSV file. Fill in your data, then upload it here.
                </p>
                <button 
                  onClick={downloadTemplate}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-amber-800 hover:bg-amber-50 font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Download size={13} />
                  Download CSV Template
                </button>
              </div>
            </div>
          )}

          {/* Upload Drop Zone */}
          {!result && (
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                file 
                  ? 'border-green-300 bg-green-50/10' 
                  : 'border-gray-200 hover:border-[#D97706] hover:bg-amber-50/5'
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv"
                className="hidden"
              />
              
              {file ? (
                <>
                  <div className="p-3 bg-green-50 rounded-full text-green-600 mb-3">
                    <FileSpreadsheet size={32} />
                  </div>
                  <span className="font-bold text-sm text-gray-900 truncate max-w-[280px]">{file.name}</span>
                  <span className="text-[11px] text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB</span>
                </>
              ) : (
                <>
                  <div className="p-3 bg-gray-50 rounded-full text-gray-400 mb-3">
                    <Upload size={32} />
                  </div>
                  <span className="font-bold text-sm text-gray-800">Drag and drop your CSV file here</span>
                  <span className="text-xs text-gray-400 mt-1">or click to browse local files</span>
                  <span className="text-[10px] text-gray-300 mt-2">Only .csv files are supported</span>
                </>
              )}
            </div>
          )}

          {/* Result Card */}
          {result && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-green-100 bg-green-50/20 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle className="text-green-600 w-8 h-8 shrink-0" />
                  <div>
                    <span className="block text-2xl font-black text-green-700 leading-none">{result.successCount}</span>
                    <span className="text-[11px] font-bold text-green-600 uppercase tracking-wider mt-1 block">Imported Successfully</span>
                  </div>
                </div>
                
                <div className={`border rounded-xl p-4 flex items-center gap-3 ${
                  result.failureCount > 0 ? 'border-red-100 bg-red-50/20' : 'border-gray-100 bg-gray-50/30'
                }`}>
                  <AlertCircle className={result.failureCount > 0 ? 'text-red-600 w-8 h-8 shrink-0' : 'text-gray-400 w-8 h-8 shrink-0'} />
                  <div>
                    <span className={`block text-2xl font-black leading-none ${
                      result.failureCount > 0 ? 'text-red-700' : 'text-gray-500'
                    }`}>{result.failureCount}</span>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1 block">Failed Rows</span>
                  </div>
                </div>
              </div>

              {/* Scrollable Errors Feed */}
              {result.errors.length > 0 && (
                <div className="border border-red-100 rounded-xl overflow-hidden">
                  <div className="bg-red-50/50 px-4 py-2 border-b border-red-100 text-xs font-bold text-red-950 uppercase tracking-wider">
                    Error Log details
                  </div>
                  <div className="max-h-52 overflow-y-auto divide-y divide-red-50 text-xs">
                    {result.errors.map((err, idx) => (
                      <div key={idx} className="p-3 bg-red-50/5 flex items-start gap-2.5">
                        <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[10px]">
                          Row {err.row}
                        </span>
                        <div className="flex-1">
                          <span className="font-bold text-gray-900 block">{err.name}</span>
                          <span className="text-gray-500 mt-0.5 block">{err.message}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button 
            onClick={onClose} 
            className="px-4 py-2 border border-gray-300 hover:bg-gray-100 rounded-lg text-sm font-semibold text-gray-700 transition-colors cursor-pointer"
          >
            {result ? 'Close' : 'Cancel'}
          </button>
          
          {result ? (
            <button 
              onClick={handleReset}
              className="px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={15} />
              Import Another File
            </button>
          ) : (
            <button 
              onClick={handleImport}
              disabled={!file || isLoading}
              className="px-5 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Upload size={15} />
                  <span>Start Import</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
