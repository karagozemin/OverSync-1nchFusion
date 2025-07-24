const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

function logRequest(req, type) {
  const timestamp = new Date().toISOString();
  const logEntry = `\n=== ${type} REQUEST @ ${timestamp} ===\n${JSON.stringify(req.body, null, 2)}\n`;
  fs.appendFileSync('xlm-to-eth-debug.log', logEntry);
  console.log(logEntry);
}

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.post('/api/orders/xlm-to-eth', (req, res) => {
  try {
    logRequest(req, 'XLM-TO-ETH');
    
    // Simulate the error that's happening
    const { orderId, stellarTxHash, ethAddress } = req.body;
    
    if (!orderId || !stellarTxHash || !ethAddress) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }
    
    // This is where the real error would be - let's catch it
    res.json({
      success: true,
      message: 'DEBUG SERVER - Request captured successfully',
      received: req.body
    });
    
  } catch (error) {
    logRequest(req, 'ERROR');
    console.error('ERROR:', error);
    fs.appendFileSync('xlm-to-eth-debug.log', `\nERROR: ${error.message}\nSTACK: ${error.stack}\n`);
    res.status(500).json({
      error: 'Debug server error',
      details: error.message
    });
  }
});

console.log('🔍 DEBUG SERVER starting on port 3001...');
app.listen(3001, () => {
  console.log('✅ DEBUG SERVER ready to capture XLM-to-ETH requests!');
  console.log('📝 Logs will be written to: xlm-to-eth-debug.log');
}); 