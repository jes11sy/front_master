/**
 * Компонент для загрузки нескольких файлов
 */

import React from 'react';
import { Upload, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

  const getFileNameFromUrl = (url: string): string => {
    try {
      const urlWithoutQuery = url.split('?')[0];
      const fileName = urlWithoutQuery.split('/').pop() || 'файл';
      return decodeURIComponent(fileName);
    } catch {
      return 'файл';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-gray-500">{files.length} файлов</span>
      </div>

      {/* Зона загрузки */}
      {!disabled && canAddMore && (
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragOver ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled && canAddMore) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            multiple
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={disabled || !canAddMore}
            onChange={handleFileChange}
            id={`file-input-${label}`}
          />
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <div className="text-sm text-gray-700">
            {dragOver ? 'Отпустите файлы' : 'Перетащите файлы или нажмите для выбора'}
          </div>
          <div className="text-xs text-gray-500 mt-1">Можно выбрать несколько файлов</div>
        </div>
      )}

      {!canAddMore && (
        <div className="text-sm text-red-500 text-center">
          Достигнут лимит файлов (10 шт.)
        </div>
      )}

      {/* Список файлов */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {files.map((fileWithPreview) => (
            <div
              key={fileWithPreview.id}
              className="relative border-2 border-green-200 bg-green-50 rounded-lg p-2 group"
            >
              <div className="aspect-video bg-gray-200 rounded overflow-hidden mb-2">
                <img
                  src={fileWithPreview.preview}
                  alt={fileWithPreview.file?.name || 'Файл'}
                  className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => window.open(fileWithPreview.preview, '_blank')}
                />
              </div>
              
              <div className="text-xs text-gray-700 truncate text-center px-1">
                {fileWithPreview.file?.name || getFileNameFromUrl(fileWithPreview.preview)}
              </div>
              
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => window.open(fileWithPreview.preview, '_blank')}
                  className="w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg"
                  title="Скачать"
                >
                  <Download className="w-3 h-3" />
                </button>
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(fileWithPreview.id);
                    }}
                    className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg"
                    title="Удалить"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {files.length === 0 && !canAddMore && (
        <div className="text-sm text-gray-500 text-center py-4">
          Файлы не прикреплены
        </div>
      )}
    </div>
  );
};

