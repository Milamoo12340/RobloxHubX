import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { useBot } from '@/context/BotContext';
import { useToast } from '@/hooks/use-toast';

export interface UseFileUploadOptions {
  onSuccess?: (file: any) => void;
  onError?: (error: Error) => void;
  maxSizeMB?: number;
  acceptedTypes?: string[]; // File extensions without dot
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const { 
    maxSizeMB = 10, 
    acceptedTypes = ['rbxm', 'rbxl', 'lua', 'png', 'jpg', 'jpeg', 'obj', 'fbx', 'mp3', 'wav', 'txt', 'json', 'xml'],
    onSuccess,
    onError
  } = options;
  
  const { uploadFile } = useBot();
  const { toast } = useToast();
  
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processFile(files[0]);
    }
  };
  
  const handleFileInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFile(e.target.files[0]);
      // Reset input value to allow uploading the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file size
    if (file.size > maxSizeBytes) {
      return { 
        valid: false, 
        error: `File too large. Maximum size is ${maxSizeMB}MB.` 
      };
    }
    
    // Check file type
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !acceptedTypes.includes(extension)) {
      return { 
        valid: false, 
        error: `Invalid file type. Accepted types are: ${acceptedTypes.join(', ')}` 
      };
    }
    
    return { valid: true };
  };
  
  const processFile = async (file: File) => {
    const validation = validateFile(file);
    
    if (!validation.valid) {
      toast({
        title: "Upload Error",
        description: validation.error,
        variant: "destructive"
      });
      
      if (onError) {
        onError(new Error(validation.error));
      }
      return;
    }
    
    try {
      setIsUploading(true);
      const result = await uploadFile(file);
      
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      if (onError && error instanceof Error) {
        onError(error);
      }
    } finally {
      setIsUploading(false);
    }
  };
  
  const openFileSelector = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  return {
    isDragging,
    isUploading,
    fileInputRef,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileInputChange,
    openFileSelector
  };
}
