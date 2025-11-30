import axios from 'axios';

// Main handler
export const handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { resumeText, jobDescription, companyName, jobTitle, apiKey } = JSON.parse(event.body || '{}');

        if (!resumeText || !jobDescription) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Resume text and job description are required' })
            };
        }

        console.log('🤖 Generating interview questions for:', companyName, '-', jobTitle);

        // Parse GEMINI_API_KEY from env - it can be a JSON array or a single string
        let apiKeys = [];

        if (apiKey) {
            // If user provided a custom key, use it first
            apiKeys = [apiKey];
        } else if (process.env.GEMINI_API_KEY) {
            try {
                // Try to parse as JSON array first
                const parsed = JSON.parse(process.env.GEMINI_API_KEY);
                if (Array.isArray(parsed)) {
                    apiKeys = parsed;
                } else {
                    apiKeys = [process.env.GEMINI_API_KEY];
                }
            } catch (e) {
                // If not JSON, treat as single key
                apiKeys = [process.env.GEMINI_API_KEY];
            }
        }

        if (apiKeys.length === 0) {
            console.error('❌ No GEMINI_API_KEY found');
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({
                    error: 'Gemini API key not configured',
                    requiresKey: true
                })
            };
        }

        console.log(`📋 Found ${apiKeys.length} API key(s) to try`);

        const prompt = `You are an expert technical interviewer. Based on the candidate's resume and the job description below, generate 8-10 highly relevant interview questions with detailed answers.

**Candidate's Resume:**
${resumeText}

**Job Description for ${jobTitle} at ${companyName}:**
${jobDescription}

Generate questions that:
1. Test technical skills mentioned in both the resume and job description
2. Assess problem-solving abilities relevant to the role
3. Explore the candidate's experience with specific technologies
4. Include behavioral questions related to the role
5. Cover system design or architecture (if relevant)

For each question, use EXACTLY this format:

1. [Question text here]
Answer: [Detailed answer that the candidate should provide, including key points and examples]

2. [Question text here]
Answer: [Detailed answer that the candidate should provide, including key points and examples]

IMPORTANT:
- Start each question with just the number and question text
- Follow immediately with "Answer:" on the next line
- Separate each question-answer pair with a blank line
- Do NOT use asterisks, markdown, or special formatting
- Make answers comprehensive but concise (2-4 sentences)
- Focus on questions that would genuinely help the candidate prepare`;

        const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent';

        // Try each API key in order until one works
        let lastError = null;
        let questions = null;

        for (let i = 0; i < apiKeys.length; i++) {
            const currentKey = apiKeys[i].trim();
            console.log(`🔑 Trying API key ${i + 1}/${apiKeys.length}...`);

            try {
                const response = await axios.post(
                    `${API_URL}?key=${currentKey}`,
                    {
                        contents: [{
                            parts: [{
                                text: prompt
                            }]
                        }],
                        generationConfig: {
                            temperature: 0.7,
                            topK: 40,
                            topP: 0.95,
                            maxOutputTokens: 3072,
                        }
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        timeout: 30000 // 30 second timeout
                    }
                );

                questions = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'No questions generated';
                console.log(`✅ Success with API key ${i + 1}/${apiKeys.length}`);
                break; // Success! Exit the loop
            } catch (error) {
                lastError = error;
                const status = error.response?.status || 500;
                const errorMsg = error.response?.data?.error?.message || error.message;

                console.log(`❌ API key ${i + 1}/${apiKeys.length} failed (${status}): ${errorMsg}`);

                // If this is the last key, we'll handle the error below
                if (i === apiKeys.length - 1) {
                    console.error('❌ All API keys exhausted');
                } else {
                    console.log(`⏭️  Trying next API key...`);
                }
            }
        }

        // If we got questions, return them
        if (questions) {
            console.log('✅ Interview questions generated successfully');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    questions: questions
                })
            };
        }

        // All keys failed - return error and ask for custom key
        const status = lastError?.response?.status || 500;
        const errorData = lastError?.response?.data || {};

        console.error(`❌ All API keys failed. Last error (${status}):`, JSON.stringify(errorData));

        return {
            statusCode: status,
            headers,
            body: JSON.stringify({
                error: 'All API keys exhausted. Please provide your own API key.',
                message: lastError?.message || 'Failed to generate interview questions',
                details: errorData,
                requiresKey: true // Tell frontend to ask for custom key
            })
        };

    } catch (error) {
        console.error('❌ Unexpected error in generate-interview-questions:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message,
                requiresKey: false
            })
        };
    }
};
