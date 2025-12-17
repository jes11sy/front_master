/**
 * Custom hook для работы с загрузкой нескольких файлов
 */

import { useState, useCallback } from 'react';

interface FileWithPreview {
  file: File;
  preview: string;
  id: string;
}

export function useMultipleFileUpload(maxFiles: number = 10) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const createFilePreview = useCallback((file: File): string => {
    return URL.createObjectURL(file);
  }, []);

  const clearPreview = useCallback((url: string) => {
    URL.revokeObjectURL(url);
  }, []);

  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    const filesArray = Array.from(newFiles);
    
    // Проверяем лимит файлов
    const availableSlots = maxFiles - files.length;
    const filesToAdd = filesArray.slice(0, availableSlots);
    
    if (filesToAdd.length === 0) {
      console.warn(`Достигнут лимит файлов: ${maxFiles}`);
      return;
    }
    
    const newFilesWithPreviews: FileWithPreview[] = filesToAdd.map(file => ({
      file,
      preview: createFilePreview(file),
      id: `${Date.now()}-${Math.random()}`,
    }));
    
    setFiles(prev => [...prev, ...newFilesWithPreviews]);
  }, [files.length, maxFiles, createFilePreview]);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove && fileToRemove.preview.startsWith('blob:')) {
        clearPreview(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  }, [clearPreview]);

  const removeAllFiles = useCallback(() => {
    files.forEach(f => {
      if (f.preview.startsWith('blob:')) {
        clearPreview(f.preview);
      }
    });
    setFiles([]);
  }, [files, clearPreview]);

  const setExistingPreviews = useCallback((urls: string[]) => {
    const existingFiles: FileWithPreview[] = urls.map((url, index) => ({
      file: null as any, // Для существующих файлов нет объекта File
      preview: url,
      id: `existing-${index}`,
    }));
    setFiles(existingFiles);
  }, []);

  // Cleanup при размонтировании
  const cleanup = useCallback(() => {
    files.forEach(f => {
      if (f.preview.startsWith('blob:')) {
        clearPreview(f.preview);
      }
    });
  }, [files, clearPreview]);

  return {
    files,
    dragOver,
    setDragOver,
    handleFiles,
    removeFile,
    removeAllFiles,
    setExistingPreviews,
    cleanup,
    canAddMore: files.length < maxFiles,
    remainingSlots: maxFiles - files.length,
  };
}

