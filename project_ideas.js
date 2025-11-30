import axios from 'axios';

const API_KEY = 'AIzaSyB_sQgDqiQGHn8ijSeKCLlfY4TnSbVwp0E';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent';

async function generateProjectIdeas(jobDescription) {
    try {
        const prompt = `Based on the following job description, generate 3 innovative project ideas that would be impressive for a portfolio and demonstrate the required skills. For each project, provide:
1. Project Title
2. Brief Description (2-3 sentences)
3. Key Technologies/Skills Used
4. Why it's impressive for this role

Job Description:
${jobDescription}

Format the response as a clear, structured list.`;

        const response = await axios.post(
            `${API_URL}?key=${API_KEY}`,
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
                }
            }
        );

        const generatedText = response.data.candidates[0].content.parts[0].text;
        return generatedText;

    } catch (error) {
        console.error('Error generating project ideas:', error.response?.data || error.message);
        throw error;
    }
}

// Example usage
const exampleJobDescription = `
Full Stack Developer
Requirements:
- 3+ years experience with React and Node.js
- Strong understanding of RESTful APIs and database design
- Experience with cloud platforms (AWS/Azure)
- Knowledge of CI/CD pipelines
- Excellent problem-solving skills
`;

// Run the generator
generateProjectIdeas(exampleJobDescription)
    .then(ideas => {
        console.log('=== INNOVATIVE PROJECT IDEAS ===\n');
        console.log(ideas);
    })
    .catch(error => {
        console.error('Failed to generate ideas:', error.message);
    });

// Export for use in other modules
export { generateProjectIdeas };