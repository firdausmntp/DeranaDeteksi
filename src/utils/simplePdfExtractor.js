/**
 * Simple PDF text extractor using browser-compatible approach
 * This doesn't require workers and is more reliable in Vite environment
 */

/**
 * Extract text from PDF using native browser APIs
 * @param {File} file - PDF file to extract text from
 * @param {Function} onProgress - Progress callback function
 * @returns {Promise<string>} - Extracted text content
 */
export const extractTextFromPDF = async (file, onProgress) => {
    try {
        if (!file || file.type !== 'application/pdf') {
            throw new Error('File yang dipilih bukan PDF atau file tidak valid.');
        }

        onProgress?.({ step: 'reading', message: 'Membaca file PDF...' });

        // Convert file to array buffer
        const arrayBuffer = await file.arrayBuffer();

        onProgress?.({ step: 'parsing', message: 'Menganalisis struktur PDF...' });

        // Simple PDF text extraction without external libraries
        const extractedText = await extractTextSimple(arrayBuffer, onProgress);

        if (!extractedText || extractedText.trim().length === 0) {
            throw new Error('Tidak dapat mengekstrak teks dari PDF. PDF mungkin berupa gambar scan atau tidak mengandung teks yang dapat dibaca.');
        }

        onProgress?.({ step: 'completed', message: 'Ekstraksi teks selesai!' });

        return cleanExtractedText(extractedText);

    } catch (error) {
        console.error('PDF text extraction error:', error);

        if (error.message.includes('Invalid PDF')) {
            throw new Error('File PDF tidak valid atau rusak.');
        } else if (error.message.includes('password')) {
            throw new Error('PDF dilindungi password. Silakan gunakan PDF yang tidak dilindungi.');
        } else if (error.message.includes('Tidak dapat mengekstrak teks')) {
            throw error; // Re-throw our custom error
        } else {
            throw new Error('Gagal mengekstrak teks dari PDF. Pastikan file PDF mengandung teks yang dapat dibaca.');
        }
    }
};

/**
 * Simple PDF text extraction using basic parsing with improved encoding handling
 * @param {ArrayBuffer} buffer - PDF file buffer
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<string>} - Extracted text
 */
const extractTextSimple = async (buffer, onProgress) => {
    return new Promise((resolve, reject) => {
        try {
            // Convert ArrayBuffer to string with better encoding handling
            const uint8Array = new Uint8Array(buffer);

            onProgress?.({ step: 'extracting', message: 'Mengekstrak teks dari PDF...' });

            // Try multiple approaches for text extraction
            let extractedText = '';

            // Method 1: Look for readable text patterns in the binary data
            extractedText = extractReadableText(uint8Array);

            // Method 2: If first method doesn't work well, try PDF text object parsing
            if (!extractedText || extractedText.length < 50) {
                extractedText = extractFromPDFObjects(uint8Array);
            }

            // Method 3: Fallback to simple ASCII extraction
            if (!extractedText || extractedText.length < 50) {
                extractedText = extractASCIIText(uint8Array);
            }

            if (extractedText && extractedText.length > 0) {
                resolve(extractedText);
            } else {
                reject(new Error('No readable text found in PDF'));
            }

        } catch (error) {
            reject(error);
        }
    });
};

/**
 * Extract readable text patterns from binary data
 */
const extractReadableText = (uint8Array) => {
    let text = '';
    let currentWord = '';

    for (let i = 0; i < uint8Array.length; i++) {
        const byte = uint8Array[i];

        // Check for printable ASCII characters
        if (byte >= 32 && byte <= 126) {
            const char = String.fromCharCode(byte);

            // Build words from consecutive readable characters
            if (/[a-zA-Z0-9]/.test(char)) {
                currentWord += char;
            } else if (currentWord.length > 2) {
                // Add word if it's meaningful (length > 2)
                text += currentWord + ' ';
                currentWord = '';

                // Add punctuation
                if (/[.,!?;:]/.test(char)) {
                    text = text.trim() + char + ' ';
                }
            } else {
                currentWord = '';
                // Add spaces and line breaks
                if (char === ' ' || char === '\n' || char === '\r') {
                    text += char;
                }
            }
        } else {
            // End current word on non-printable character
            if (currentWord.length > 2) {
                text += currentWord + ' ';
            }
            currentWord = '';

            // Add space for word separation
            if (byte === 0 || byte === 10 || byte === 13) {
                text += ' ';
            }
        }
    }

    // Add final word
    if (currentWord.length > 2) {
        text += currentWord;
    }

    return cleanExtractedText(text);
};

/**
 * Extract text from PDF text objects with better encoding
 */
const extractFromPDFObjects = (uint8Array) => {
    // Convert to Latin1 string for better PDF parsing
    let pdfString = '';
    for (let i = 0; i < uint8Array.length; i++) {
        pdfString += String.fromCharCode(uint8Array[i]);
    }

    const textBlocks = [];

    // Extract text from Tj commands with better pattern matching
    const tjPattern = /\(([^)]*)\)\s*Tj/g;
    let match;

    while ((match = tjPattern.exec(pdfString)) !== null) {
        const text = match[1];
        if (text && text.trim() && isReadableText(text)) {
            textBlocks.push(decodeTextFromPDF(text));
        }
    }

    // Extract text from TJ array commands
    const tjArrayPattern = /\[([^\]]*)\]\s*TJ/g;
    while ((match = tjArrayPattern.exec(pdfString)) !== null) {
        const arrayContent = match[1];
        const textParts = arrayContent.match(/\(([^)]*)\)/g);
        if (textParts) {
            textParts.forEach(part => {
                const cleanPart = part.replace(/[()]/g, '');
                if (cleanPart.trim() && isReadableText(cleanPart)) {
                    textBlocks.push(decodeTextFromPDF(cleanPart));
                }
            });
        }
    }

    return textBlocks.join(' ').trim();
};

/**
 * Simple ASCII text extraction as fallback
 */
const extractASCIIText = (uint8Array) => {
    let text = '';
    let buffer = '';

    for (let i = 0; i < uint8Array.length; i++) {
        const byte = uint8Array[i];

        if (byte >= 32 && byte <= 126) {
            buffer += String.fromCharCode(byte);
        } else {
            if (buffer.length > 3 && isReadableText(buffer)) {
                text += buffer + ' ';
            }
            buffer = '';
        }
    }

    if (buffer.length > 3 && isReadableText(buffer)) {
        text += buffer;
    }

    return text.trim();
};

/**
 * Check if text looks readable (contains mostly letters and common punctuation)
 */
const isReadableText = (text) => {
    if (!text || text.length < 3) return false;

    const readableChars = text.match(/[a-zA-Z0-9\s.,!?;:'"()-]/g);
    const readableRatio = readableChars ? readableChars.length / text.length : 0;

    return readableRatio > 0.7; // At least 70% readable characters
};

/**
 * Decode text from PDF encoding
 */
const decodeTextFromPDF = (text) => {
    // Handle common PDF escape sequences
    return text
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\f/g, '\f')
        .replace(/\\b/g, '\b')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\');
};

/**
 * Clean and format extracted text with better handling of garbled text
 * @param {string} text - Raw extracted text
 * @returns {string} - Cleaned text
 */
const cleanExtractedText = (text) => {
    if (!text) return '';

    return text
        // Remove null characters and control characters
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        // Fix common encoding issues
        .replace(/â€™/g, "'") // Smart quote
        .replace(/â€œ/g, '"') // Smart quote
        .replace(/â€/g, '"')  // Smart quote
        .replace(/â€¢/g, '•') // Bullet point
        .replace(/â€"/g, '–') // En dash
        .replace(/â€"/g, '—') // Em dash
        // Remove sequences of non-readable characters (likely encoding errors)
        .replace(/[^\w\s.,!?;:'"()\-\u00C0-\u017F]{3,}/g, ' ')
        // Replace multiple whitespace with single space
        .replace(/\s+/g, ' ')
        // Remove lines that are mostly garbled (contain too many special chars)
        .split('\n')
        .filter(line => {
            const cleanLine = line.trim();
            if (cleanLine.length < 3) return false;

            // Count readable vs unreadable characters
            const readable = cleanLine.match(/[a-zA-Z0-9\s.,!?;:'"()\-]/g);
            const readableCount = readable ? readable.length : 0;
            const readableRatio = readableCount / cleanLine.length;

            // Keep lines that are at least 60% readable
            return readableRatio >= 0.6;
        })
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n')
        // Final cleanup
        .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive line breaks
        .trim();
};

/**
 * Get basic PDF info without complex parsing
 * @param {File} file - The PDF file
 * @returns {Promise<Object>} - PDF metadata
 */
export const getPDFInfo = async (file) => {
    try {
        return {
            numPages: 'Unknown', // We can't easily determine page count with simple parsing
            title: file.name,
            author: 'Unknown',
            creator: 'Unknown',
            producer: 'Unknown',
            creationDate: null,
            modificationDate: null,
            fileSize: file.size,
            fileName: file.name
        };
    } catch (error) {
        console.error('Error getting PDF info:', error);
        return {
            numPages: 'Unknown',
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
 * Validate if file is a valid PDF
 * @param {File} file - File to validate
 * @returns {boolean} - True if valid PDF
 */
export const isValidPDF = (file) => {
    if (!file) return false;

    // Check file type
    if (file.type !== 'application/pdf') return false;

    // Check file extension
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.pdf')) return false;

    // Check file size (max 10MB for simple parsing)
    const maxSize = 10 * 1024 * 1024; // 10MB
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

    // Simple parsing is faster: 1MB = 1-2 seconds
    const sizeMB = file.size / (1024 * 1024);
    return Math.ceil(sizeMB * 1.5);
};
