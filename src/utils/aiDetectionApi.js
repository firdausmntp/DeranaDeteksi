import axios from 'axios'

const BASE_URL = 'https://semenjana.biz.id/allin'

// Fungsi pembagi teks berdasarkan jumlah kata
export const splitTextByWordLimit = (text, maxWords = 8000) => {
    const words = text.trim().split(/\s+/)
    const chunks = []

    for (let i = 0; i < words.length; i += maxWords) {
        const chunk = words.slice(i, i + maxWords).join(' ')
        chunks.push(chunk)
    }

    return chunks
}

// Kirim teks untuk analisis dan dapatkan ID
export const submitTextForDetection = async (text) => {
    try {
        const response = await axios.post(`${BASE_URL}/api/v1/getId`, {
            content: text
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 15000
        })

        const { id } = response.data
        if (!id) throw new Error('ID tidak ditemukan dalam respons.')

        return { id, status: 'pending' }
    } catch (error) {
        console.error('Error saat submit teks:', error)
        throw new Error('Gagal mengirim teks untuk analisis.')
    }
}

// Ambil hasil analisis berdasarkan ID
export const queryDetectionResults = async (id, maxRetries = 20) => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await axios.post(`${BASE_URL}/api/v1/result`, {
                id
            }, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 15000
            })

            const data = response.data
            console.log('Response received:', data); // Debug log

            // Check for new format with detection_scores
            if (data?.success === true && data?.detection_scores) {
                console.log('New format detected with detection_scores');
                return { success: true, data }
            }

            // Check for legacy format
            if (data?.status === 'done' || data?.result !== undefined) {
                console.log('Legacy format detected');
                return { success: true, data }
            }

            if (data?.status === 'error') {
                throw new Error(data.message || 'Analisis gagal.')
            }

            console.log('No valid response format detected, retrying...'); // Debug log

            await new Promise(resolve => setTimeout(resolve, 2000))
        } catch (error) {
            console.error(`Attempt ${attempt + 1} failed:`, error.message); // Debug log

            if (attempt === maxRetries - 1) {
                throw new Error('Timeout pengambilan hasil. Coba lagi nanti.')
            }

            await new Promise(resolve => setTimeout(resolve, 2000))
        }
    }

    throw new Error('Analisis memakan waktu terlalu lama.')
}

// Deteksi satu bagian teks
export const detectAIContent = async (text, onProgress) => {
    const trimmed = text.trim()
    if (trimmed.length < 10) throw new Error('Teks terlalu pendek.')
    if (trimmed.length > 50000) throw new Error('Teks terlalu panjang.')

    onProgress?.({ step: 'submitting', message: 'Mengirim teks untuk analisis...' })
    const submission = await submitTextForDetection(trimmed)

    onProgress?.({ step: 'processing', message: 'Menunggu hasil analisis...' })
    const result = await queryDetectionResults(submission.id)

    // Handle new API response format
    if (result.data.detection_scores) {
        // New format with detailed detection scores
        const detectionScores = result.data.detection_scores;
        const overallScore = result.data.overall_score || 0;

        // Calculate average AI probability from all detectors
        const detectorValues = Object.values(detectionScores).filter(score => typeof score === 'number');
        const avgAiProbability = detectorValues.length > 0
            ? Math.round(detectorValues.reduce((sum, score) => sum + score, 0) / detectorValues.length)
            : Math.round(overallScore);

        const humanProbability = 100 - avgAiProbability;

        return {
            ai_probability: avgAiProbability,
            human_probability: humanProbability,
            overall_score: overallScore,
            detection_scores: detectionScores,
            message: `AI: ${avgAiProbability}%, Human: ${humanProbability}%`,
            raw_response: result.data,
            // Add detailed stats for UI
            word_count: trimmed.split(/\s+/).filter(word => word.length > 0).length,
            character_count: trimmed.length,
            sentence_count: trimmed.split(/[.!?]+/).filter(s => s.trim().length > 0).length,
            reading_time: Math.ceil(trimmed.split(/\s+/).filter(word => word.length > 0).length / 200),
            confidence_score: Math.round((100 - Math.abs(avgAiProbability - 50)) * 2) // Higher confidence when closer to extremes
        }
    } else {
        // Legacy format
        const aiScore = parseInt(result.data.result || 0)
        const humanScore = 100 - aiScore

        return {
            ai_probability: aiScore,
            human_probability: humanScore,
            message: `AI: ${aiScore}%, Human: ${humanScore}%`,
            raw_response: result.data,
            // Add detailed stats for UI
            word_count: trimmed.split(/\s+/).filter(word => word.length > 0).length,
            character_count: trimmed.length,
            sentence_count: trimmed.split(/[.!?]+/).filter(s => s.trim().length > 0).length,
            reading_time: Math.ceil(trimmed.split(/\s+/).filter(word => word.length > 0).length / 200),
            confidence_score: Math.round((100 - Math.abs(aiScore - 50)) * 2)
        }
    }
}

export const cleanTextFromHTML = (text) => {
    if (!text || typeof text !== 'string') return '';

    return text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]+/g, ' ')
        .trim();
};



// Deteksi banyak bagian teks sekaligus
export const detectTextInChunks = async (fullText, maxWords = 8000, onProgress) => {
    const parts = splitTextByWordLimit(fullText, maxWords)
    const results = []

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        onProgress?.({ step: 'part', message: `Memproses bagian ${i + 1} dari ${parts.length}` })

        try {
            const result = await detectAIContent(part, onProgress)
            results.push({
                part: i + 1,
                ...result
            })
        } catch (error) {
            results.push({
                part: i + 1,
                error: error.message
            })
        }
    }

    return results
}

export const API_CONFIG = {
    MAX_TEXT_LENGTH: 20000,
    MIN_TEXT_LENGTH: 10,
    MAX_RETRIES: 20,
    RETRY_DELAY: 2000
};

// Validate text
export const validateTextForAnalysis = (text) => {
    if (!text || typeof text !== 'string') {
        return { valid: false, error: 'Invalid text' };
    }

    const cleanedText = cleanTextFromHTML(text);
    const trimmed = cleanedText.trim();

    if (trimmed.length < 10) {
        return { valid: false, error: 'Text too short (minimum 10 characters)' };
    }

    if (trimmed.length > 50000) {
        return { valid: false, error: 'Text too long (maximum 50,000 characters)' };
    }

    return { valid: true, text: trimmed };
};
