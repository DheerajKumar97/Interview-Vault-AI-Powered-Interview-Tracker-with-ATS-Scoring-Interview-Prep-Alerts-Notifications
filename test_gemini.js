import axios from 'axios';

async function testEndpoint() {
    try {
        console.log('Testing Gemini Endpoint...');
        const response = await axios.post('http://localhost:3001/api/generate-projects', {
            jobDescription: "Looking for a React developer with experience in TypeScript and Node.js.",
            companyName: "Test Corp",
            jobTitle: "Frontend Developer"
        });

        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response Data:', error.response.data);
            console.error('Response Status:', error.response.status);
        }
    }
}

testEndpoint();
