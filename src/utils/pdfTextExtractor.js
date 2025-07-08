import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import { cleanTextFromHTML } from './aiDetectionApi';

// Set up the worker for PDF.js - using CDN for simplicity and reliability
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Extract text from a PDF file with fallback methods
 * @param {File} file - The PDF file to extract text from
 * @param {Function} onProgress - Progress callback function
 * @returns {Promise<string>} - Extracted text content
 */
export const extractTextFromPDF = async (file, onProgress) => {
    try {
        // First try the enhanced method
        return await extractTextFromPDFEnhanced(file, onProgress);
    } catch (error) {
        console.warn('Enhanced extraction failed, trying basic method:', error);

        // Fallback to basic method
        try {
            return await extractTextFromPDFBasic(file, onProgress);
        } catch (basicError) {
            console.error('Both extraction methods failed:', basicError);
            throw new Error('Gagal mengekstrak teks dari PDF. File mungkin rusak atau berisi hanya gambar.');
        }
    }
};

/**
 * Basic PDF text extraction (original method)
 * @param {File} file - The PDF file to extract text from
 * @param {Function} onProgress - Progress callback function
 * @returns {Promise<string>} - Extracted text content
 */
const extractTextFromPDFBasic = async (file, onProgress) => {
    try {
        if (!file || file.type !== 'application/pdf') {
            throw new Error('File yang dipilih bukan PDF atau file tidak valid.');
        }

        onProgress?.({ step: 'reading', message: 'Membaca file PDF...' });

        // Use FileReader to read the file as ArrayBuffer (same as your example)
        const reader = new FileReader();

        return new Promise((resolve, reject) => {
            reader.onload = async function () {
                try {
                    onProgress?.({ step: 'loading', message: 'Memuat dokumen PDF...' });

                    // Convert to Uint8Array (same as your example)
                    const typedarray = new Uint8Array(this.result);

                    // Load the PDF document
                    const pdf = await pdfjsLib.getDocument(typedarray).promise;
                    const totalPages = pdf.numPages;

                    onProgress?.({ step: 'extracting', message: `Mengekstrak teks dari ${totalPages} halaman...` });

                    let allText = '';

                    // Extract text from each page (same logic as your example)
                    for (let i = 1; i <= totalPages; i++) {
                        try {
                            const page = await pdf.getPage(i);
                            const content = await page.getTextContent();

                            // Combine all text items from the page with proper spacing
                            const strings = content.items.map(item => item.str).join(' ');
                            allText += strings + '\n';

                            // Update progress
                            const progress = Math.round((i / totalPages) * 100);
                            onProgress?.({
                                step: 'extracting',
                                message: `Mengekstrak teks... ${progress}% (${i}/${totalPages} halaman)`
                            });

                        } catch (pageError) {
                            console.warn(`Error extracting text from page ${i}:`, pageError);
                            // Continue with other pages even if one fails
                        }
                    }

                    // Clean up the extracted text
                    const cleanedText = cleanExtractedText(allText);

                    if (!cleanedText || cleanedText.trim().length === 0) {
                        throw new Error('Tidak dapat mengekstrak teks dari PDF. PDF mungkin berupa gambar scan atau tidak mengandung teks yang dapat dibaca.');
                    }

                    onProgress?.({ step: 'completed', message: 'Ekstraksi teks selesai!' });
                    resolve(cleanedText);

                } catch (error) {
                    console.error('PDF processing error:', error);

                    if (error.message.includes('Invalid PDF')) {
                        reject(new Error('File PDF tidak valid atau rusak.'));
                    } else if (error.message.includes('password')) {
                        reject(new Error('PDF dilindungi password. Silakan gunakan PDF yang tidak dilindungi.'));
                    } else if (error.message.includes('Tidak dapat mengekstrak teks')) {
                        reject(error); // Re-throw our custom error
                    } else {
                        reject(new Error('Gagal mengekstrak teks dari PDF. Pastikan file PDF mengandung teks yang dapat dibaca.'));
                    }
                }
            };

            reader.onerror = function () {
                reject(new Error('Gagal membaca file PDF.'));
            };

            // Read the file as ArrayBuffer (same as your example)
            reader.readAsArrayBuffer(file);
        });

    } catch (error) {
        console.error('PDF text extraction error:', error);
        throw error;
    }
};

/**
 * Enhanced PDF text extraction with better text item handling
 * @param {File} file - The PDF file to extract text from
 * @param {Function} onProgress - Progress callback function
 * @returns {Promise<string>} - Extracted text content
 */
export const extractTextFromPDFEnhanced = async (file, onProgress) => {
    try {
        if (!file || file.type !== 'application/pdf') {
            throw new Error('File yang dipilih bukan PDF atau file tidak valid.');
        }

        onProgress?.({ step: 'reading', message: 'Membaca file PDF...' });

        const reader = new FileReader();

        return new Promise((resolve, reject) => {
            reader.onload = async function () {
                try {
                    onProgress?.({ step: 'loading', message: 'Memuat dokumen PDF...' });

                    const typedarray = new Uint8Array(this.result);
                    const pdf = await pdfjsLib.getDocument(typedarray).promise;
                    const totalPages = pdf.numPages;

                    onProgress?.({ step: 'extracting', message: `Mengekstrak teks dari ${totalPages} halaman...` });

                    let allText = '';

                    for (let i = 1; i <= totalPages; i++) {
                        try {
                            const page = await pdf.getPage(i);
                            const content = await page.getTextContent();

                            // Enhanced text extraction with better positioning
                            const textItems = content.items.filter(item => item.str && item.str.trim());

                            // Sort by vertical position, then horizontal
                            textItems.sort((a, b) => {
                                const yDiff = Math.abs(b.transform[5] - a.transform[5]);
                                if (yDiff > 5) { // Different lines
                                    return b.transform[5] - a.transform[5]; // Top to bottom
                                }
                                return a.transform[4] - b.transform[4]; // Left to right
                            });

                            // Group items by line
                            const lines = [];
                            let currentLine = [];
                            let lastY = null;

                            for (const item of textItems) {
                                const y = item.transform[5];

                                if (lastY !== null && Math.abs(y - lastY) > 5) {
                                    // New line
                                    if (currentLine.length > 0) {
                                        lines.push(currentLine);
                                        currentLine = [];
                                    }
                                }

                                currentLine.push(item);
                                lastY = y;
                            }

                            if (currentLine.length > 0) {
                                lines.push(currentLine);
                            }

                            // Build text with proper spacing
                            const pageText = lines.map(line => {
                                return line.map(item => item.str).join(' ');
                            }).join('\n');

                            allText += pageText + '\n\n';

                            // Update progress
                            const progress = Math.round((i / totalPages) * 100);
                            onProgress?.({
                                step: 'extracting',
                                message: `Mengekstrak teks... ${progress}% (${i}/${totalPages} halaman)`
                            });

                        } catch (pageError) {
                            console.warn(`Error extracting text from page ${i}:`, pageError);
                            // Continue with other pages even if one fails
                        }
                    }

                    // Clean up the extracted text
                    const cleanedText = cleanExtractedText(allText);

                    if (!cleanedText || cleanedText.trim().length === 0) {
                        throw new Error('Tidak dapat mengekstrak teks dari PDF. PDF mungkin berupa gambar scan atau tidak mengandung teks yang dapat dibaca.');
                    }

                    onProgress?.({ step: 'completed', message: 'Ekstraksi teks selesai!' });
                    resolve(cleanedText);

                } catch (error) {
                    console.error('PDF processing error:', error);

                    if (error.message.includes('Invalid PDF')) {
                        reject(new Error('File PDF tidak valid atau rusak.'));
                    } else if (error.message.includes('password')) {
                        reject(new Error('PDF dilindungi password. Silakan gunakan PDF yang tidak dilindungi.'));
                    } else if (error.message.includes('Tidak dapat mengekstrak teks')) {
                        reject(error);
                    } else {
                        reject(new Error('Gagal mengekstrak teks dari PDF. Pastikan file PDF mengandung teks yang dapat dibaca.'));
                    }
                }
            };

            reader.onerror = function () {
                reject(new Error('Gagal membaca file PDF.'));
            };

            reader.readAsArrayBuffer(file);
        });

    } catch (error) {
        console.error('PDF text extraction error:', error);
        throw error;
    }
};

/**
 * Clean and format extracted text with better encoding handling
 * @param {string} text - Raw extracted text
 * @returns {string} - Cleaned text
 */
const cleanExtractedText = (text) => {
    if (!text) return '';

    // First clean HTML tags if any
    let cleanedText = cleanTextFromHTML(text);

    // Fix common encoding issues
    cleanedText = cleanedText
        // Handle Unicode replacement characters
        .replace(/\uFFFD/g, ' ')
        // Fix smart quotes and dashes
        .replace(/â€™/g, "'")
        .replace(/â€œ/g, '"')
        .replace(/â€/g, '"')
        .replace(/â€¢/g, '•')
        .replace(/â€"/g, '–')
        .replace(/â€"/g, '—')
        // Remove null bytes and control characters
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
        // Handle common PDF artifacts
        .replace(/\s*\|\s*/g, ' ')
        .replace(/\s*\\\s*/g, ' ')
        // Remove sequences of non-printable characters that look like gibberish
        .replace(/[^\w\s.,!?;:'"()\-\u00C0-\u017F\u2010-\u2027\u2030-\u205E]{2,}/g, ' ');

    // Split into lines and filter out gibberish
    const lines = cleanedText.split('\n').map(line => line.trim()).filter(line => {
        if (line.length < 3) return false;

        // Check if line contains readable text
        const readableChars = line.match(/[a-zA-Z0-9\s.,!?;:'"()\-]/g);
        const readableCount = readableChars ? readableChars.length : 0;
        const totalChars = line.length;

        // Keep lines that are at least 60% readable characters
        const readableRatio = readableCount / totalChars;

        // Also check for common patterns that indicate gibberish
        const hasCommonWords = /\b(the|and|or|of|to|in|for|with|on|at|by|from|as|is|was|are|were|be|been|have|has|had|do|does|did|will|would|could|should|may|might|can|shall)\b/i.test(line);

        return readableRatio >= 0.6 || (readableRatio >= 0.4 && hasCommonWords);
    });

    // Rejoin the lines
    cleanedText = lines.join('\n');

    // Final cleanup
    cleanedText = cleanedText
        // Remove excessive whitespace
        .replace(/\s+/g, ' ')
        // Remove excessive line breaks
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        // Trim
        .trim();

    return cleanedText;
};

/**
 * Get PDF metadata and basic info
 * @param {File} file - The PDF file
 * @returns {Promise<Object>} - PDF metadata
 */
export const getPDFInfo = async (file) => {
    try {
        const reader = new FileReader();

        return new Promise((resolve, reject) => {
            reader.onload = async function () {
                try {
                    const typedarray = new Uint8Array(this.result);
                    const pdf = await pdfjsLib.getDocument(typedarray).promise;

                    const metadata = await pdf.getMetadata();

                    resolve({
                        numPages: pdf.numPages,
                        title: metadata.info?.Title || file.name,
                        author: metadata.info?.Author || 'Unknown',
                        creator: metadata.info?.Creator || 'Unknown',
                        producer: metadata.info?.Producer || 'Unknown',
                        creationDate: metadata.info?.CreationDate || null,
                        modificationDate: metadata.info?.ModDate || null,
                        fileSize: file.size,
                        fileName: file.name
                    });
                } catch (error) {
                    console.error('Error getting PDF info:', error);
                    resolve({
                        numPages: 0,
                        title: file.name,
                        author: 'Unknown',
                        creator: 'Unknown',
                        producer: 'Unknown',
                        creationDate: null,
                        modificationDate: null,
                        fileSize: file.size,
                        fileName: file.name
                    });
                }
            };

            reader.onerror = function () {
                reject(new Error('Gagal membaca file PDF untuk mendapatkan info.'));
            };

            reader.readAsArrayBuffer(file);
        });
    } catch (error) {
        console.error('Error getting PDF info:', error);
        return {
            numPages: 0,
            title: file.name,
            author: 'Unknown',
            creator: 'Unknown',
            producer: 'Unknown',
            creationDate: null,
            modificationDate: null,
            fileSize: file.size,
            fileName: file.name
        };
    }
};

/**
 * Validate if file is a valid PDF with detailed error messages
 * @param {File} file - File to validate
 * @returns {Object} - Validation result with detailed error info
 */
export const validatePDFFile = async (file) => {
    if (!file) {
        return { valid: false, error: 'Tidak ada file yang dipilih.' };
    }

    // Check file type
    if (file.type !== 'application/pdf') {
        return { valid: false, error: 'File harus berformat PDF.' };
    }

    // Check file extension
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.pdf')) {
        return { valid: false, error: 'File harus memiliki ekstensi .pdf' };
    }

    // Check file size
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
        return { valid: false, error: 'Ukuran file terlalu besar. Maksimal 50MB.' };
    }

    if (file.size === 0) {
        return { valid: false, error: 'File PDF kosong.' };
    }

    // Check if PDF is likely scanned
    try {
        const isScanned = await isPDFScanned(file);
        if (isScanned) {
            return {
                valid: true,
                warning: 'PDF ini tampaknya hasil scan. Ekstraksi teks mungkin tidak optimal. Untuk hasil terbaik, gunakan PDF yang berisi teks asli.'
            };
        }
    } catch (error) {
        console.warn('Could not check if PDF is scanned:', error);
    }

    return { valid: true };
};

/**
 * Legacy compatibility function
 * @param {File} file - File to validate
 * @returns {boolean} - True if valid PDF
 */
export const isValidPDF = (file) => {
    if (!file) return false;
    if (file.type !== 'application/pdf') return false;
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.pdf')) return false;
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) return false;
    return true;
};

/**
 * Estimate text extraction time based on file size
 * @param {File} file - PDF file
 * @returns {number} - Estimated time in seconds
 */
export const estimateExtractionTime = (file) => {
    if (!file) return 0;

    // Rough estimation: 1MB = 2-3 seconds
    const sizeMB = file.size / (1024 * 1024);
    return Math.ceil(sizeMB * 2.5);
};

/**
 * Detect if PDF contains mostly scanned images rather than text
 * @param {File} file - PDF file to analyze
 * @returns {Promise<boolean>} - True if PDF appears to be scanned
 */
export const isPDFScanned = async (file) => {
    try {
        const reader = new FileReader();

        return new Promise((resolve) => {
            reader.onload = async function () {
                try {
                    const typedarray = new Uint8Array(this.result);
                    const pdf = await pdfjsLib.getDocument(typedarray).promise;

                    // Check first few pages for text content
                    const pagesToCheck = Math.min(3, pdf.numPages);
                    let totalTextLength = 0;

                    for (let i = 1; i <= pagesToCheck; i++) {
                        const page = await pdf.getPage(i);
                        const content = await page.getTextContent();
                        const pageText = content.items.map(item => item.str).join('');
                        totalTextLength += pageText.trim().length;
                    }

                    // If very little text found, likely scanned
                    const avgTextPerPage = totalTextLength / pagesToCheck;
                    resolve(avgTextPerPage < 50); // Less than 50 chars per page suggests scan

                } catch (error) {
                    resolve(false); // Default to not scanned if can't analyze
                }
            };

            reader.onerror = () => resolve(false);
            reader.readAsArrayBuffer(file);
        });
    } catch (error) {
        return false;
    }
};
