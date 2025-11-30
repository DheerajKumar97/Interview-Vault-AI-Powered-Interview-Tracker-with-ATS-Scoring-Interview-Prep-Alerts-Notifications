import axios from 'axios';

async function testUpdateEnv() {
    try {
        console.log('Testing /api/update-env...');
        const response = await axios.post('http://localhost:3001/api/update-env', {
            key: 'GEMINI_API_KEY',
            value: 'TEST_KEY_UPDATED_BY_SCRIPT_' + Date.now()
        });

        console.log('Status:', response.status);
        console.log('Response:', response.data);
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response Data:', error.response.data);
        }
    }
}

testUpdateEnv();
