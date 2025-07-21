import * as pdfjs from 'pdfjs-dist';
import { cleanTextFromHTML } from './aiDetectionApi';

// Initialize PDF.js worker with proper version matching
const initializePDFWorker = async () => {
    try {
        // Gunakan worker lokal yang sudah kita copy dari node_modules
        pdfjs.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.js`;

        console.log(`PDF.js initialized with local worker: ${import.meta.env.BASE_URL}pdf.worker.min.js`);
    } catch (error) {
        console.warn('Failed to load local PDF worker, trying CDN:', error);

        try {
            // Fallback ke CDN yang reliable
            pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.3.93/build/pdf.worker.min.mjs';
        } catch (fallbackError) {
            console.error('CDN worker failed, using unpkg fallback:', fallbackError);
            // Last resort - unpkg
            pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version || '5.3.93'}/build/pdf.worker.min.mjs`;
        }
    }
};

// Initialize worker
initializePDFWorker();

/**
 * Extract text from PDF file
 * @param {File} file - PDF file object
 * @param {Function} onProgress - Progress callback function
 * @param {Object} options - Extraction options
 * @param {Array<number>} options.selectedPages - Array of page numbers to extract (1-indexed)
 * @param {boolean} options.extractAll - Extract all pages if true
 * @returns {Promise<string>} - Extracted text
 */
export const extractTextFromPDF = async (file, onProgress, options = {}) => {
    const { selectedPages = [], extractAll = true } = options;

    try {
        onProgress?.({ step: 'loading', message: 'Memuat file PDF...' });

        // Convert file to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();

        onProgress?.({ step: 'parsing', message: 'Memproses dokumen PDF...' });

        // Load PDF document dengan konfigurasi tambahan
        const loadingTask = pdfjs.getDocument({
            data: arrayBuffer,
            cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version || '5.3.93'}/cmaps/`,
            cMapPacked: true,
            standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version || '5.3.93'}/standard_fonts/`,
            useSystemFonts: true,
            disableFontFace: true,
            verbosity: 0 // Mengurangi log verbose
        });

        const pdf = await loadingTask.promise;
        let fullText = '';
        const totalPages = pdf.numPages;

        // Determine which pages to extract
        const pagesToExtract = extractAll ?
            Array.from({ length: totalPages }, (_, i) => i + 1) :
            selectedPages.filter(page => page >= 1 && page <= totalPages);

        if (pagesToExtract.length === 0) {
            throw new Error('Tidak ada halaman yang valid untuk diekstrak.');
        }

        onProgress?.({
            step: 'extracting',
            message: extractAll ?
                `Mengekstrak teks dari ${totalPages} halaman...` :
                `Mengekstrak teks dari ${pagesToExtract.length} halaman yang dipilih...`
        });

        // Extract text from selected pages
        for (let i = 0; i < pagesToExtract.length; i++) {
            const pageNum = pagesToExtract[i];
            try {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();

                // Enhanced text extraction with better positioning
                const viewport = page.getViewport({ scale: 1.0 });
                let pageText = '';

                // Group text items by lines based on Y position
                const textItems = textContent.items;
                const lines = [];

                console.log(`Page ${pageNum} - Total text items: ${textItems.length}`);

                textItems.forEach(item => {
                    if (!item.str.trim()) return; // Skip empty text

                    // Find line with similar Y position (within 2 units)
                    let targetLine = lines.find(line =>
                        Math.abs(line.y - item.transform[5]) < 2
                    );

                    if (!targetLine) {
                        targetLine = {
                            y: item.transform[5],
                            x: item.transform[4],
                            items: []
                        };
                        lines.push(targetLine);
                    }

                    targetLine.items.push({
                        text: item.str,
                        x: item.transform[4],
                        width: item.width
                    });
                });

                console.log(`Page ${pageNum} - Total lines found: ${lines.length}`);

                // Sort lines by Y position (top to bottom)
                lines.sort((a, b) => b.y - a.y);

                // For each line, sort items by X position (left to right)
                lines.forEach(line => {
                    line.items.sort((a, b) => a.x - b.x);

                    // Join text items in the line with appropriate spacing
                    let lineText = '';
                    for (let i = 0; i < line.items.length; i++) {
                        const item = line.items[i];
                        const nextItem = line.items[i + 1];

                        lineText += item.text;

                        // Add space if there's a gap between words
                        if (nextItem && (nextItem.x - (item.x + item.width)) > 5) {
                            lineText += ' ';
                        }
                    }

                    if (lineText.trim()) {
                        pageText += lineText.trim() + '\n';
                    }
                });

                console.log(`Page ${pageNum} - Extracted text length: ${pageText.length}`);
                console.log(`Page ${pageNum} - First 100 chars: ${pageText.substring(0, 100)}`);
                if (pageText.trim()) {
                    const rawText = pageText.trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();

                    // Pisahkan menjadi kalimat
                    const sentences = rawText.match(/[^.!?]+[.!?]+/g) || [];

                    // Kelompokkan per 4-5 kalimat menjadi paragraf
                    const paragraphs = [];
                    for (let i = 0; i < sentences.length; i += 4) {
                        const group = sentences.slice(i, i + 4).join(' ').trim();
                        if (group) paragraphs.push(group);
                    }

                    fullText += `\n\n${paragraphs.join('\n\n')}`;
                }


                // Update progress
                onProgress?.({
                    step: 'extracting',
                    message: extractAll ?
                        `Mengekstrak teks... ${pageNum}/${totalPages} halaman` :
                        `Mengekstrak teks... ${i + 1}/${pagesToExtract.length} halaman dipilih`,
                    progress: ((i + 1) / pagesToExtract.length) * 100
                });

            } catch (pageError) {
                console.warn(`Error extracting text from page ${pageNum}:`, pageError);
                // Continue with other pages
            }
        }

        // Clean up
        await pdf.destroy();

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

        // Enhanced error handling
        if (error.message.includes('Invalid PDF') || error.name === 'InvalidPDFException') {
            throw new Error('File PDF tidak valid atau rusak.');
        } else if (error.message.includes('password') || error.name === 'PasswordException') {
            throw new Error('PDF terlindungi password. Silakan gunakan PDF yang tidak terlindungi.');
        } else if (error.message.includes('worker') || error.message.includes('CORS')) {
            throw new Error('Gagal memuat PDF worker. Silakan refresh halaman dan coba lagi.');
        } else if (error.message.includes('tidak ada teks')) {
            throw new Error('PDF tidak mengandung teks yang dapat diekstrak. Mungkin PDF berisi hanya gambar.');
        } else {
            throw new Error(`Gagal mengekstrak teks dari PDF: ${error.message}`);
        }
    }
};

// Rest of your code remains the same...
export const getPDFInfo = async (file) => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({
            data: arrayBuffer,
            cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version || '5.3.93'}/cmaps/`,
            cMapPacked: true,
            standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version || '5.3.93'}/standard_fonts/`,
            useSystemFonts: true,
            disableFontFace: true,
            verbosity: 0
        });

        const pdf = await loadingTask.promise;
        const info = await pdf.getMetadata();

        const result = {
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

        await pdf.destroy();
        return result;

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

/**
 * Get page previews for PDF file
 * @param {File} file - PDF file object
 * @param {Object} options - Preview options
 * @param {number} options.maxPages - Maximum number of pages to preview (default: 50)
 * @param {number} options.scale - Scale for rendering (default: 1.0)
 * @returns {Promise<Array>} - Array of page previews with text samples
 */
export const getPDFPagePreviews = async (file, options = {}) => {
    const { maxPages = 50, scale = 1.0 } = options;

    try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({
            data: arrayBuffer,
            cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version || '5.3.93'}/cmaps/`,
            cMapPacked: true,
            standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version || '5.3.93'}/standard_fonts/`,
            useSystemFonts: true,
            disableFontFace: true,
            verbosity: 0
        });

        const pdf = await loadingTask.promise;
        const totalPages = pdf.numPages; // Get all pages, not limited by maxPages
        const pagesToProcess = Math.min(totalPages, maxPages); // But process up to maxPages
        const previews = [];

        for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
            try {
                const page = await pdf.getPage(pageNum);

                // Get text content for preview with enhanced extraction
                const textContent = await page.getTextContent();
                const textItems = textContent.items;
                const lines = [];

                // Group text items by lines based on Y position
                textItems.forEach(item => {
                    if (!item.str.trim()) return; // Skip empty text

                    let targetLine = lines.find(line =>
                        Math.abs(line.y - item.transform[5]) < 2
                    );

                    if (!targetLine) {
                        targetLine = {
                            y: item.transform[5],
                            items: []
                        };
                        lines.push(targetLine);
                    }

                    targetLine.items.push({
                        text: item.str,
                        x: item.transform[4]
                    });
                });

                // Sort lines by Y position and create page text
                lines.sort((a, b) => b.y - a.y);
                let pageText = '';

                lines.forEach(line => {
                    line.items.sort((a, b) => a.x - b.x);
                    const lineText = line.items.map(item => item.text).join(' ');
                    if (lineText.trim()) {
                        pageText += lineText.trim() + ' ';
                    }
                });

                // Create text preview (first 200 characters)
                const textPreview = pageText.trim().substring(0, 200) +
                    (pageText.trim().length > 200 ? '...' : '');

                // Get page dimensions
                const viewport = page.getViewport({ scale });

                previews.push({
                    pageNumber: pageNum,
                    textPreview: textPreview || 'Halaman ini tidak mengandung teks yang dapat dibaca',
                    hasText: pageText.trim().length > 0,
                    width: viewport.width,
                    height: viewport.height,
                    wordCount: pageText.trim() ? pageText.trim().split(/\s+/).length : 0
                });

            } catch (pageError) {
                console.warn(`Error getting preview for page ${pageNum}:`, pageError);
                previews.push({
                    pageNumber: pageNum,
                    textPreview: 'Error memuat halaman ini',
                    hasText: false,
                    width: 0,
                    height: 0,
                    wordCount: 0
                });
            }
        }

        await pdf.destroy();
        return {
            totalPages: totalPages, // Actual total pages in PDF
            previews: previews
        };

    } catch (error) {
        console.error('Error getting PDF page previews:', error);
        throw new Error('Gagal memuat preview halaman PDF');
    }
};