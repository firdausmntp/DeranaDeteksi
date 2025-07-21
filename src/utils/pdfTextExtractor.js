import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import { cleanTextFromHTML } from './aiDetectionApi';

// Initialize PDF.js worker with proper version matching for legacy build
const initializePDFWorker = async () => {
    try {
        // Gunakan worker lokal untuk legacy build juga
        pdfjsLib.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.js`;

        console.log(`PDF.js legacy initialized with local worker: ${import.meta.env.BASE_URL}pdf.worker.min.js`);
    } catch (error) {
        console.warn('Failed to load local PDF worker for legacy, trying CDN:', error);

        try {
            // Fallback ke CDN yang reliable untuk legacy
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.3.93/build/pdf.worker.min.mjs';
        } catch (fallbackError) {
            console.warn('CDN worker failed for legacy, trying unpkg:', fallbackError);
            // Fallback ke unpkg
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '5.3.93'}/build/pdf.worker.min.mjs`;
        }
    }
};

// Initialize worker
initializePDFWorker();

/**
 * Extract text from a PDF file with fallback methods and enhanced CORS handling
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

        // Check if error is worker-related and try to reinitialize
        if (error.message.includes('worker') || error.message.includes('CORS')) {
            console.log('Worker error detected, reinitializing...');
            initializePDFWorker();

            // Wait a bit for worker to initialize
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Fallback to basic method
        try {
            return await extractTextFromPDFBasic(file, onProgress);
        } catch (basicError) {
            console.error('Both extraction methods failed:', basicError);

            if (basicError.message.includes('worker') || basicError.message.includes('CORS')) {
                throw new Error('Gagal memuat PDF worker. Silakan refresh halaman dan coba lagi. Jika masalah berlanjut, coba gunakan browser yang berbeda.');
            }

            throw new Error('Gagal mengekstrak teks dari PDF. File mungkin rusak atau berisi hanya gambar.');
        }
    }
};

/**
 * Basic PDF text extraction with enhanced error handling
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

        const reader = new FileReader();

        return new Promise((resolve, reject) => {
            reader.onload = async function () {
                try {
                    onProgress?.({ step: 'loading', message: 'Memuat dokumen PDF...' });

                    const typedarray = new Uint8Array(this.result);

                    // Enhanced PDF loading with better configuration
                    const loadingTask = pdfjsLib.getDocument({
                        data: typedarray,
                        // Add CORS-friendly configuration
                        cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
                        cMapPacked: true,
                        standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
                        // Disable web fonts to avoid CORS issues
                        disableFontFace: false,
                        // Set maximum image size to avoid memory issues
                        maxImageSize: 1024 * 1024,
                        // Disable auto-fetch to avoid CORS
                        disableAutoFetch: true,
                        // Disable streaming
                        disableStream: true
                    });

                    const pdf = await loadingTask.promise;
                    const totalPages = pdf.numPages;

                    onProgress?.({ step: 'extracting', message: `Mengekstrak teks dari ${totalPages} halaman...` });

                    let allText = '';

                    for (let i = 1; i <= totalPages; i++) {
                        try {
                            const page = await pdf.getPage(i);
                            const content = await page.getTextContent({
                                normalizeWhitespace: true,
                                disableCombineTextItems: false
                            });

                            const strings = content.items.map(item => item.str).join(' ');
                            allText += strings + '\n';

                            const progress = Math.round((i / totalPages) * 100);
                            onProgress?.({
                                step: 'extracting',
                                message: `Mengekstrak teks... ${progress}% (${i}/${totalPages} halaman)`,
                                progress: progress
                            });

                            // Clean up page to free memory
                            await page.cleanup();

                        } catch (pageError) {
                            console.warn(`Error extracting text from page ${i}:`, pageError);
                            // Continue with other pages even if one fails
                        }
                    }

                    // Clean up PDF document
                    await pdf.destroy();

                    const cleanedText = cleanExtractedText(allText);

                    if (!cleanedText || cleanedText.trim().length === 0) {
                        throw new Error('Tidak dapat mengekstrak teks dari PDF. PDF mungkin berupa gambar scan atau tidak mengandung teks yang dapat dibaca.');
                    }

                    onProgress?.({ step: 'completed', message: 'Ekstraksi teks selesai!' });
                    resolve(cleanedText);

                } catch (error) {
                    console.error('PDF processing error:', error);

                    if (error.message.includes('Invalid PDF') || error.name === 'InvalidPDFException') {
                        reject(new Error('File PDF tidak valid atau rusak.'));
                    } else if (error.message.includes('password') || error.name === 'PasswordException') {
                        reject(new Error('PDF dilindungi password. Silakan gunakan PDF yang tidak dilindungi.'));
                    } else if (error.message.includes('worker') || error.message.includes('CORS')) {
                        reject(new Error('Gagal memuat PDF worker. Pastikan koneksi internet stabil dan coba lagi.'));
                    } else if (error.message.includes('Tidak dapat mengekstrak teks')) {
                        reject(error);
                    } else {
                        reject(new Error(`Gagal mengekstrak teks dari PDF: ${error.message}`));
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
 * Enhanced PDF text extraction with better text item handling and CORS-safe configuration
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

                    const loadingTask = pdfjsLib.getDocument({
                        data: typedarray,
                        cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
                        cMapPacked: true,
                        standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
                        disableFontFace: false,
                        maxImageSize: 1024 * 1024,
                        disableAutoFetch: true,
                        disableStream: true,
                        // Add timeout for loading
                        timeout: 30000 // 30 seconds timeout
                    });

                    const pdf = await loadingTask.promise;
                    const totalPages = pdf.numPages;

                    onProgress?.({ step: 'extracting', message: `Mengekstrak teks dari ${totalPages} halaman...` });

                    let allText = '';

                    for (let i = 1; i <= totalPages; i++) {
                        try {
                            const page = await pdf.getPage(i);
                            const content = await page.getTextContent({
                                normalizeWhitespace: true,
                                disableCombineTextItems: false
                            });

                            const textItems = content.items.filter(item => item.str && item.str.trim());

                            // Sort by vertical position, then horizontal
                            textItems.sort((a, b) => {
                                const yDiff = Math.abs(b.transform[5] - a.transform[5]);
                                if (yDiff > 5) {
                                    return b.transform[5] - a.transform[5];
                                }
                                return a.transform[4] - b.transform[4];
                            });

                            // Group items by line
                            const lines = [];
                            let currentLine = [];
                            let lastY = null;

                            for (const item of textItems) {
                                const y = item.transform[5];

                                if (lastY !== null && Math.abs(y - lastY) > 5) {
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

                            const pageText = lines.map(line => {
                                return line.map(item => item.str).join(' ');
                            }).join('\n');

                            allText += pageText + '\n\n';

                            const progress = Math.round((i / totalPages) * 100);
                            onProgress?.({
                                step: 'extracting',
                                message: `Mengekstrak teks... ${progress}% (${i}/${totalPages} halaman)`,
                                progress: progress
                            });

                            // Clean up page
                            await page.cleanup();

                        } catch (pageError) {
                            console.warn(`Error extracting text from page ${i}:`, pageError);
                        }
                    }

                    // Clean up PDF document
                    await pdf.destroy();

                    const cleanedText = cleanExtractedText(allText);

                    if (!cleanedText || cleanedText.trim().length === 0) {
                        throw new Error('Tidak dapat mengekstrak teks dari PDF. PDF mungkin berupa gambar scan atau tidak mengandung teks yang dapat dibaca.');
                    }

                    onProgress?.({ step: 'completed', message: 'Ekstraksi teks selesai!' });
                    resolve(cleanedText);

                } catch (error) {
                    console.error('PDF processing error:', error);

                    if (error.message.includes('Invalid PDF') || error.name === 'InvalidPDFException') {
                        reject(new Error('File PDF tidak valid atau rusak.'));
                    } else if (error.message.includes('password') || error.name === 'PasswordException') {
                        reject(new Error('PDF dilindungi password. Silakan gunakan PDF yang tidak dilindungi.'));
                    } else if (error.message.includes('worker') || error.message.includes('CORS')) {
                        reject(new Error('Gagal memuat PDF worker. Silakan refresh halaman dan coba lagi.'));
                    } else if (error.message.includes('timeout')) {
                        reject(new Error('Timeout saat memuat PDF. File mungkin terlalu besar atau koneksi lambat.'));
                    } else if (error.message.includes('Tidak dapat mengekstrak teks')) {
                        reject(error);
                    } else {
                        reject(new Error(`Gagal mengekstrak teks dari PDF: ${error.message}`));
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

// Rest of your functions remain the same...
const cleanExtractedText = (text) => {
    if (!text) return '';

    let cleanedText = cleanTextFromHTML(text);

    cleanedText = cleanedText
        .replace(/\uFFFD/g, ' ')
        .replace(/â€™/g, "'")
        .replace(/â€œ/g, '"')
        .replace(/â€/g, '"')
        .replace(/â€¢/g, '•')
        .replace(/â€"/g, '–')
        .replace(/â€"/g, '—')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
        .replace(/\s*\|\s*/g, ' ')
        .replace(/\s*\\\s*/g, ' ')
        .replace(/[^\w\s.,!?;:'"()\-\u00C0-\u017F\u2010-\u2027\u2030-\u205E]{2,}/g, ' ');

    const lines = cleanedText.split('\n').map(line => line.trim()).filter(line => {
        if (line.length < 3) return false;

        const readableChars = line.match(/[a-zA-Z0-9\s.,!?;:'"()\-]/g);
        const readableCount = readableChars ? readableChars.length : 0;
        const totalChars = line.length;
        const readableRatio = readableCount / totalChars;
        const hasCommonWords = /\b(the|and|or|of|to|in|for|with|on|at|by|from|as|is|was|are|were|be|been|have|has|had|do|does|did|will|would|could|should|may|might|can|shall)\b/i.test(line);

        return readableRatio >= 0.6 || (readableRatio >= 0.4 && hasCommonWords);
    });

    cleanedText = lines.join('\n');
    cleanedText = cleanedText
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .trim();

    return cleanedText;
};

export const getPDFInfo = async (file) => {
    try {
        const reader = new FileReader();

        return new Promise((resolve, reject) => {
            reader.onload = async function () {
                try {
                    const typedarray = new Uint8Array(this.result);
                    const loadingTask = pdfjsLib.getDocument({
                        data: typedarray,
                        disableAutoFetch: true,
                        disableStream: true
                    });

                    const pdf = await loadingTask.promise;
                    const metadata = await pdf.getMetadata();

                    const result = {
                        numPages: pdf.numPages,
                        title: metadata.info?.Title || file.name,
                        author: metadata.info?.Author || 'Unknown',
                        creator: metadata.info?.Creator || 'Unknown',
                        producer: metadata.info?.Producer || 'Unknown',
                        creationDate: metadata.info?.CreationDate || null,
                        modificationDate: metadata.info?.ModDate || null,
                        fileSize: file.size,
                        fileName: file.name
                    };

                    await pdf.destroy();
                    resolve(result);
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

export const validatePDFFile = async (file) => {
    if (!file) {
        return { valid: false, error: 'Tidak ada file yang dipilih.' };
    }

    if (file.type !== 'application/pdf') {
        return { valid: false, error: 'File harus berformat PDF.' };
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.pdf')) {
        return { valid: false, error: 'File harus memiliki ekstensi .pdf' };
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
        return { valid: false, error: 'Ukuran file terlalu besar. Maksimal 50MB.' };
    }

    if (file.size === 0) {
        return { valid: false, error: 'File PDF kosong.' };
    }

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

export const isValidPDF = (file) => {
    if (!file) return false;
    if (file.type !== 'application/pdf') return false;
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.pdf')) return false;
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) return false;
    return true;
};

export const estimateExtractionTime = (file) => {
    if (!file) return 0;
    const sizeMB = file.size / (1024 * 1024);
    return Math.ceil(sizeMB * 2.5);
};

export const isPDFScanned = async (file) => {
    try {
        const reader = new FileReader();

        return new Promise((resolve) => {
            reader.onload = async function () {
                try {
                    const typedarray = new Uint8Array(this.result);
                    const loadingTask = pdfjsLib.getDocument({
                        data: typedarray,
                        disableAutoFetch: true,
                        disableStream: true
                    });

                    const pdf = await loadingTask.promise;
                    const pagesToCheck = Math.min(3, pdf.numPages);
                    let totalTextLength = 0;

                    for (let i = 1; i <= pagesToCheck; i++) {
                        const page = await pdf.getPage(i);
                        const content = await page.getTextContent();
                        const pageText = content.items.map(item => item.str).join('');
                        totalTextLength += pageText.trim().length;
                        await page.cleanup();
                    }

                    await pdf.destroy();
                    const avgTextPerPage = totalTextLength / pagesToCheck;
                    resolve(avgTextPerPage < 50);

                } catch (error) {
                    resolve(false);
                }
            };

            reader.onerror = () => resolve(false);
            reader.readAsArrayBuffer(file);
        });
    } catch (error) {
        return false;
    }
};