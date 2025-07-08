/**
 * File validation utilities
 */

export const validateFile = (file) => {
    const errors = [];

    // Check file type
    if (file.type !== 'application/pdf') {
        errors.push('Hanya file PDF yang diperbolehkan');
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
        errors.push('Ukuran file maksimal 10MB');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const createFilePreview = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
    });
};
