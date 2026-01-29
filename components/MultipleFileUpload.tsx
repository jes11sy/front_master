/**
 * Компонент для загрузки нескольких файлов
 */

import React from 'react';
import { X, Download, UploadCloud } from 'lucide-react';

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

  const handleDownload = (fileWithPreview: FileWithPreview) => {
    const link = document.createElement('a');
    link.href = fileWithPreview.preview;
    link.download = fileWithPreview.file?.name || `file_${fileWithPreview.id}`;
    link.target = '_blank';
    link.click();
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} ({files.length} фото)
      </label>

      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver
            ? 'border-blue-400 bg-blue-50'
            : files.length > 0
              ? 'border-green-400 bg-green-50'
              : 'border-gray-300 bg-gray-50'
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
        />

        {files.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {files.map((fileWithPreview) => (
              <div key={fileWithPreview.id} className="relative group">
                <img
                  src={fileWithPreview.preview}
                  alt={fileWithPreview.file?.name || 'Файл'}
                  className="w-full h-24 object-cover rounded-lg shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => handleDownload(fileWithPreview)}
                />
                <div className="absolute top-1 right-1 flex gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(fileWithPreview);
                    }}
                    className="w-7 h-7 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-all shadow-lg"
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
                      className="w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all shadow-lg"
                      title="Удалить файл"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {fileWithPreview.file && (
                  <div className="text-xs text-gray-600 text-center mt-1 truncate px-1">
                    {fileWithPreview.file.name}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <UploadCloud className="w-16 h-16 text-gray-400 mx-auto" />
            <div className="text-gray-700 font-medium">
              {dragOver ? 'Отпустите файлы' : 'Перетащите файлы сюда'}
            </div>
            <div className="text-sm text-gray-500">или нажмите для выбора (можно несколько)</div>
            {!canAddMore && (
              <div className="text-sm text-red-500 font-medium">Достигнут лимит файлов</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

