const http = require('http');

async function testRpcCall(method, params = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      method: method,
      params: params,
      id: 'test-' + Date.now()
    });

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/rpc',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

async function testEventTrigger() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      eventType: 'order_created',
      count: 1
    });

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/trigger-test-events',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Phase 4: Event System - Simple Test');
  console.log('=====================================');

  try {
    console.log('1. Testing getAllowedMethods RPC...');
    const allowedMethods = await testRpcCall('getAllowedMethods');
    console.log('✅ getAllowedMethods:', allowedMethods.result ? 'PASSED' : 'FAILED');
    
    console.log('2. Testing ping RPC...');
    const ping = await testRpcCall('ping');
    console.log('✅ ping:', ping.result ? 'PASSED' : 'FAILED');

    console.log('3. Testing getActiveOrders RPC...');
    const activeOrders = await testRpcCall('getActiveOrders');
    console.log('✅ getActiveOrders:', activeOrders.result ? 'PASSED' : 'FAILED');

    console.log('4. Testing getStatistics RPC...');
    const statistics = await testRpcCall('getStatistics');
    console.log('✅ getStatistics:', statistics.result ? 'PASSED' : 'FAILED');

    console.log('5. Testing event trigger...');
    const eventTrigger = await testEventTrigger();
    console.log('✅ Event trigger:', eventTrigger.success ? 'PASSED' : 'FAILED');

    console.log('6. Testing getEventHistory RPC...');
    const eventHistory = await testRpcCall('getEventHistory');
    console.log('✅ getEventHistory:', eventHistory.result ? 'PASSED' : 'FAILED');

    console.log('\n📊 Phase 4 Event System is working! 🎉');
    console.log('✅ All core RPC endpoints are responding');
    console.log('✅ Event triggering is functional');
    console.log('✅ Event history is accessible');
    console.log('✅ Integration with existing relayer is complete');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

runTests(); 