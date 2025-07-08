import { useState, useCallback } from 'react';
import { validateFile } from '../utils/fileUtils';

export const useFileUpload = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const [errors, setErrors] = useState([]);

    const handleFileSelect = useCallback((file) => {
        const validation = validateFile(file);

        if (validation.isValid) {
            setSelectedFile(file);
            setErrors([]);
        } else {
            setSelectedFile(null);
            setErrors(validation.errors);
        }
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    }, [handleFileSelect]);

    const handleFileInputChange = useCallback((e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    }, [handleFileSelect]);

    const clearFile = useCallback(() => {
        setSelectedFile(null);
        setErrors([]);
    }, []);

    return {
        selectedFile,
        dragOver,
        errors,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handleFileInputChange,
        clearFile
    };
};
