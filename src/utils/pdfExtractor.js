import * as pdfjs from 'pdfjs-dist';
import { cleanTextFromHTML } from './aiDetectionApi';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

/**
 * Extract text from PDF file
 * @param {File} file - PDF file object
 * @param {Function} onProgress - Progress callback function
 * @returns {Promise<string>} - Extracted text
 */
export const extractTextFromPDF = async (file, onProgress) => {
    try {
        onProgress?.({ step: 'loading', message: 'Memuat file PDF...' });

        // Convert file to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();

        onProgress?.({ step: 'parsing', message: 'Memproses dokumen PDF...' });

        // Load PDF document
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

        let fullText = '';
        const totalPages = pdf.numPages;

        onProgress?.({ step: 'extracting', message: `Mengekstrak teks dari ${totalPages} halaman...` });

        // Extract text from each page
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            try {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();

                // Combine text items from the page
                const pageText = textContent.items
                    .map(item => item.str)
                    .join(' ');

                if (pageText.trim()) {
                    fullText += pageText + '\n\n';
                }

                // Update progress
                onProgress?.({
                    step: 'extracting',
                    message: `Mengekstrak teks... ${pageNum}/${totalPages} halaman`
                });

            } catch (pageError) {
                console.warn(`Error extracting text from page ${pageNum}:`, pageError);
                // Continue with other pages
            }
        }

        onProgress?.({ step: 'cleaning', message: 'Membersihkan teks hasil ekstraksi...' });

        // Clean the extracted text
        const cleanedText = cleanTextFromHTML(fullText);

        if (!cleanedText || cleanedText.trim().length === 0) {
            throw new Error('Tidak ada teks yang dapat diekstrak dari PDF. Pastikan PDF berisi teks yang dapat dibaca.');
        }

        onProgress?.({ step: 'completed', message: 'Ekstraksi teks selesai!' });

        return cleanedText.trim();

    } catch (error) {
        console.error('Error extracting text from PDF:', error);

        if (error.message.includes('Invalid PDF')) {
            throw new Error('File PDF tidak valid atau rusak.');
        } else if (error.message.includes('password')) {
            throw new Error('PDF terlindungi password. Silakan gunakan PDF yang tidak terlindungi.');
        } else if (error.message.includes('tidak ada teks')) {
            throw new Error('PDF tidak mengandung teks yang dapat diekstrak. Mungkin PDF berisi hanya gambar.');
        } else {
            throw new Error('Gagal mengekstrak teks dari PDF. Silakan coba file PDF lain.');
        }
    }
};

/**
 * Get PDF information
 * @param {File} file - PDF file object
 * @returns {Promise<Object>} - PDF information
 */
export const getPDFInfo = async (file) => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

        const info = await pdf.getMetadata();

        return {
            numPages: pdf.numPages,
            fileSize: file.size,
            fileName: file.name,
            title: info.info?.Title || 'Tidak tersedia',
            author: info.info?.Author || 'Tidak tersedia',
            subject: info.info?.Subject || 'Tidak tersedia',
            creator: info.info?.Creator || 'Tidak tersedia',
            producer: info.info?.Producer || 'Tidak tersedia',
            creationDate: info.info?.CreationDate || null,
            modificationDate: info.info?.ModDate || null
        };

    } catch (error) {
        console.error('Error getting PDF info:', error);
        return {
            numPages: 0,
            fileSize: file.size,
            fileName: file.name,
            title: 'Error loading PDF',
            author: 'Tidak tersedia',
            subject: 'Tidak tersedia',
            creator: 'Tidak tersedia',
            producer: 'Tidak tersedia',
            creationDate: null,
            modificationDate: null
        };
    }
};

/**
 * Validate PDF file
 * @param {File} file - PDF file object
 * @returns {Object} - Validation result
 */
export const validatePDFFile = (file) => {
    if (!file) {
        return { valid: false, error: 'Tidak ada file yang dipilih.' };
    }

    if (file.type !== 'application/pdf') {
        return { valid: false, error: 'File harus berformat PDF.' };
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
        return { valid: false, error: 'Ukuran file terlalu besar. Maksimal 10MB.' };
    }

    if (file.size === 0) {
        return { valid: false, error: 'File PDF kosong.' };
    }

    return { valid: true };
};
