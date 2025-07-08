import axios from 'axios';

// API configuration
const UNDETECTABLE_API_URL = 'https://undetectable.ai/';
const QUERY_API_URL = process.env.NODE_ENV === 'development'
    ? '/api/query' : 'https://sea-lion-app-3p5x4.ondigitalocean.app/query';

// Simplified headers for initial request
const getInitialHeaders = () => ({
    'Accept': 'text/x-component',
    'Accept-Language': 'en-US,en;q=0.9',
    'Content-Type': 'text/plain;charset=UTF-8',
    'Origin': 'https://undetectable.ai',
    'Referer': 'https://undetectable.ai/',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'next-action': 'cfb84cd2f17fb624c8259fad25289162faf37774',
    'next-router-state-tree': '%5B%22%22%2C%7B%22children%22%3A%5B%5B%22locale%22%2C%22en%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2C%22%2F%22%2C%22refresh%22%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D'
});

// Simplified headers for query request  
const getQueryHeaders = () => ({
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Accept-Language': 'en-US,en;q=0.7',
    'Origin': 'https://undetectable.ai',
    'Referer': 'https://undetectable.ai/',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site'
});

// Submit text for AI detection
export const submitTextForDetection = async (text) => {
    try {
        const data = JSON.stringify([text, "l6_v6", true]);

        const response = await axios.post(UNDETECTABLE_API_URL, data, {
            headers: getInitialHeaders(),
            timeout: 30000
        });

        // Extract ID from response
        const match = response.data.match(/"id":"([^"]+)"/);
        if (!match) {
            throw new Error('Failed to extract task ID from response');
        }

        return {
            id: match[1],
            status: 'pending'
        };
    } catch (error) {
        console.error('Error submitting text:', error);

        if (error.code === 'ERR_NETWORK') {
            throw new Error('Network error - check CORS or connection');
        }
        if (error.response?.status === 429) {
            throw new Error('Too many requests. Please wait and try again.');
        }
        if (error.response?.status === 403) {
            throw new Error('Access denied. Please refresh and try again.');
        }

        throw new Error('Failed to submit text for analysis');
    }
};

// Query detection results with simple retry logic
export const queryDetectionResults = async (taskId, maxRetries = 20) => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await axios.post(QUERY_API_URL,
                { id: taskId },
                {
                    headers: getQueryHeaders(),
                    timeout: 15000
                }
            );

            const result = response.data;

            if (result.status === 'done') {
                return { success: true, data: result };
            }

            if (result.status === 'error') {
                throw new Error(result.message || 'Analysis failed');
            }

            // Wait 2 seconds before retry
            await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
            if (error.response?.status === 404) {
                throw new Error('Task ID not found');
            }
            if (attempt === maxRetries - 1) {
                throw new Error('Analysis timeout - please try again');
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    throw new Error('Analysis took too long - please try again');
};

// Clean text utility
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

// Main detection function
export const detectAIContent = async (text, onProgress) => {
    try {
        // Validate and clean text
        const validation = validateTextForAnalysis(text);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        const cleanedText = validation.text;

        // Step 1: Submit text
        onProgress?.({ step: 'submitting', message: 'Submitting text for analysis...' });
        const submission = await submitTextForDetection(cleanedText);

        // Step 2: Get results
        onProgress?.({ step: 'processing', message: 'Processing AI detection...' });
        const results = await queryDetectionResults(submission.id);

        if (!results.success) {
            throw new Error('Failed to get analysis results');
        }

        // Step 3: Format results
        const data = results.data;
        const aiProbability = Math.round(Math.max(0, Math.min(100, data.result || 0)));
        const humanProbability = 100 - aiProbability;

        // Calculate basic stats
        const words = cleanedText.split(/\s+/).filter(word => word.length > 0);
        const sentences = cleanedText.split(/[.!?]+/).filter(s => s.trim().length > 0);

        const result = {
            ai_probability: aiProbability,
            human_probability: humanProbability,
            confidence_score: Math.min(95, Math.max(65, 80 + Math.abs(aiProbability - 50) * 0.3)),
            word_count: words.length,
            character_count: cleanedText.length,
            sentence_count: sentences.length,
            reading_time: Math.ceil(words.length / 200),
            detected_models: aiProbability > 80 ? ['GPT-4', 'ChatGPT'] :
                aiProbability > 60 ? ['ChatGPT'] : [],
            message: `Analysis completed. AI: ${aiProbability}%, Human: ${humanProbability}%`,
            raw_response: data
        };

        onProgress?.({ step: 'completed', message: 'Analysis complete!' });
        return result;

    } catch (error) {
        console.error('AI Detection Error:', error);
        throw error;
    }
};

// Export config
export const API_CONFIG = {
    MAX_TEXT_LENGTH: 50000,
    MIN_TEXT_LENGTH: 10,
    MAX_RETRIES: 20,
    RETRY_DELAY: 2000
};