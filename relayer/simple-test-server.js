const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'API endpoints are working!' });
});

app.post('/api/orders/xlm-to-eth', (req, res) => {
  console.log('🔍 XLM→ETH endpoint hit:', req.body);
  res.json({ 
    success: true, 
    message: 'XLM to ETH endpoint working!',
    body: req.body 
  });
});

app.listen(3001, () => {
  console.log('✅ Simple test server running on port 3001');
});
