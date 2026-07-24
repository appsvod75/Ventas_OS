const axios = require('axios');

async function testStats() {
    try {
        const response = await axios.get('http://localhost:5001/api/stats/dashboard');
        console.log('Stats API Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error calling stats API:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testStats();
