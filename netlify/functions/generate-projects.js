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
        const { jobDescription, companyName, jobTitle, apiKey } = JSON.parse(event.body || '{}');

        if (!jobDescription) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Job description is required' })
            };
        }

        console.log('🤖 Generating project suggestions for:', companyName, '-', jobTitle);

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

        const prompt = `Based on the following job description for ${jobTitle} at ${companyName}, generate 3-5 innovative project ideas that would be impressive for a portfolio and demonstrate the required skills.

For each project, use EXACTLY this format:

1. Project Title: [Full project name here]
Project Description: [2-3 sentence description of what this project does and its purpose]
Key Technologies/Skills Used: [List of technologies]
Why it's impressive for this role: [Explanation of relevance]

2. Project Title: [Full project name here]
Project Description: [2-3 sentence description of what this project does and its purpose]
Key Technologies/Skills Used: [List of technologies]
Why it's impressive for this role: [Explanation of relevance]

IMPORTANT: 
- Start each project with the number and "Project Title:" on one line
- The FIRST line after the title MUST be "Project Description:"
- Then "Key Technologies/Skills Used:"
- Then "Why it's impressive for this role:"
- Separate each project with a blank line
- Do NOT use asterisks, markdown, or special formatting

Job Description:
${jobDescription}`;

        const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent';

        // Try each API key in order until one works
        let lastError = null;
        let suggestions = null;

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
                            temperature: 0.9,
                            topK: 40,
                            topP: 0.95,
                            maxOutputTokens: 2048,
                        }
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        timeout: 30000 // 30 second timeout
                    }
                );

                suggestions = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'No suggestions generated';
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

        // If we got suggestions, return them
        if (suggestions) {
            console.log('✅ Project suggestions generated successfully');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    suggestions: suggestions
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
                message: lastError?.message || 'Failed to generate project suggestions',
                details: errorData,
                requiresKey: true // Tell frontend to ask for custom key
            })
        };

    } catch (error) {
        console.error('❌ Unexpected error in generate-projects:', error);
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
