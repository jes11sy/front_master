/**
 * Компонент для загрузки нескольких файлов
 */

import React from 'react';
import { X, Download, ArrowUpFromLine } from 'lucide-react';
import { useDesignStore } from '@/store/design.store';

interface FileWithPreview {
  file: File | null;
  preview: string;
  id: string;
}

interface MultipleFileUploadProps {
  label: string;
  files: FileWithPreview[];
  dragOver: boolean;
  setDragOver: (value: boolean) => void;
  handleFiles: (files: FileList | File[]) => void;
  removeFile: (id: string) => void;
  disabled: boolean;
  canAddMore: boolean;
}

export const MultipleFileUpload: React.FC<MultipleFileUploadProps> = ({
  label,
  files,
  dragOver,
  setDragOver,
  handleFiles,
  removeFile,
  disabled,
  canAddMore,
}) => {
  const { theme } = useDesignStore();
  const isDark = theme === 'dark';

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (!disabled && canAddMore) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && canAddMore) {
      handleFiles(e.target.files);
    }
  };

  const handleDownload = (fileWithPreview: FileWithPreview) => {
    const link = document.createElement('a');
    link.href = fileWithPreview.preview;
    link.download = fileWithPreview.file?.name || `file_${fileWithPreview.id}`;
    link.target = '_blank';
    link.click();
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          {label}
        </label>
        {files.length > 0 && (
          <span className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500'}`}>
            {files.length}
          </span>
        )}
      </div>

      <div
        className={`relative border border-dashed rounded-lg transition-colors ${
          dragOver
            ? 'border-blue-400'
            : isDark ? 'border-gray-600' : 'border-gray-300'
        } ${files.length > 0 ? 'p-3' : 'p-8'}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && canAddMore) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {files.length === 0 && (
          <input
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            multiple
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={disabled || !canAddMore}
            onChange={handleFileChange}
          />
        )}

        {files.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {files.map((fileWithPreview) => (
              <div key={fileWithPreview.id} className="relative group aspect-square">
                <img
                  src={fileWithPreview.preview}
                  alt={fileWithPreview.file?.name || 'Файл'}
                  className="w-full h-full object-cover rounded cursor-pointer"
                  onClick={() => handleDownload(fileWithPreview)}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded transition-all duration-150" />
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDownload(fileWithPreview); }}
                    className="w-6 h-6 bg-white/90 hover:bg-white text-gray-700 rounded flex items-center justify-center transition-colors"
                    title="Скачать"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeFile(fileWithPreview.id); }}
                      className="w-6 h-6 bg-white/90 hover:bg-white text-gray-700 rounded flex items-center justify-center transition-colors"
                      title="Удалить"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {!disabled && canAddMore && (
              <label className={`relative aspect-square border border-dashed rounded flex items-center justify-center cursor-pointer transition-colors ${isDark ? 'border-gray-600 hover:border-gray-400' : 'border-gray-300 hover:border-gray-400'}`}>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  multiple
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileChange}
                />
                <ArrowUpFromLine className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              </label>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            <ArrowUpFromLine className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {dragOver ? 'Отпустите файлы' : 'Перетащите фото или нажмите для выбора'}
            </span>
            {!canAddMore && (
              <span className="text-xs text-red-400">Достигнут лимит файлов</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
