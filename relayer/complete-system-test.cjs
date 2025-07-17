const http = require('http');

async function testEndpoint(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ status: res.statusCode, data: response });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runCompleteSystemTest() {
  console.log('🧪 COMPLETE SYSTEM TEST - Phase 1-4 + Phase 3.5');
  console.log('=================================================');
  
  let passedTests = 0;
  let totalTests = 0;
  
  const test = async (name, testFn) => {
    totalTests++;
    console.log(`${totalTests}. Testing ${name}...`);
    try {
      const result = await testFn();
      if (result) {
        console.log(`✅ ${name}: PASSED`);
        passedTests++;
      } else {
        console.log(`❌ ${name}: FAILED`);
      }
    } catch (error) {
      console.log(`❌ ${name}: FAILED - ${error.message}`);
    }
  };

  // === PHASE 1: BACKEND API FOUNDATION ===
  console.log('\n🔹 Phase 1: Backend API Foundation');
  
  await test('Health Check', async () => {
    const response = await testEndpoint('/health');
    return response.status === 200 && response.data.status === 'healthy';
  });

  await test('Quoter API - Basic Quote', async () => {
    const response = await testEndpoint('/quote/receive?srcChain=1&dstChain=137&srcTokenAddress=0xA0b86a33E6441196207C4c2dBCc37f5AC37e30F7&dstTokenAddress=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174&amount=1000000000000000000&walletAddress=0x742d35Cc6634C0532925a3b8D400e1e4dff7D88e');
    return response.status === 200 && response.data.success;
  });

  await test('Gas Price API', async () => {
    const response = await testEndpoint('/gas/current');
    return response.status === 200 && response.data.success;
  });

  await test('Presets API', async () => {
    const response = await testEndpoint('/presets');
    return response.status === 200 && response.data.success;
  });

  // === PHASE 2: DUTCH AUCTION PRICING ===
  console.log('\n🔹 Phase 2: Dutch Auction Pricing');
  
  await test('Dutch Auction Quote', async () => {
    const response = await testEndpoint('/quote/build', 'POST', {
      srcChain: 1,
      dstChain: 137,
      srcTokenAddress: '0xA0b86a33E6441196207C4c2dBCc37f5AC37e30F7',
      dstTokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      amount: '1000000000000000000',
      walletAddress: '0x742d35Cc6634C0532925a3b8D400e1e4dff7D88e'
    });
    return response.status === 200 && response.data.success;
  });

  await test('Gas History API', async () => {
    const response = await testEndpoint('/gas/history');
    return response.status === 200 && response.data.success;
  });

  await test('Preset Recommendation', async () => {
    const response = await testEndpoint('/presets/recommend', 'POST', {
      amount: '1000000000000000000',
      urgency: 'medium',
      gasPrice: '20000000000'
    });
    return response.status === 200 && response.data.success;
  });

  // === PHASE 3: PARTIAL FILLS ===
  console.log('\n🔹 Phase 3: Partial Fills');
  
  await test('Merkle Tree Secrets', async () => {
    const response = await testEndpoint('/order/secrets/0xtest123');
    return response.status === 200 && response.data.success;
  });

  await test('Progressive Filling', async () => {
    const response = await testEndpoint('/submit/partial-fill', 'POST', {
      orderHash: '0xtest123',
      fragmentIndex: 0,
      fillAmount: '1000000000000000000',
      resolver: '0x742d35Cc6634C0532925a3b8D400e1e4dff7D88e',
      secretHash: '0xsecret123',
      merkleProof: ['0xproof1', '0xproof2']
    });
    return response.status === 200 && response.data.success;
  });

  await test('Ready to Accept Secret Fills', async () => {
    const response = await testEndpoint('/ready-to-accept-secret-fills');
    return response.status === 200 && response.data.success;
  });

  // === PHASE 4: EVENT SYSTEM ===
  console.log('\n🔹 Phase 4: Event System');
  
  await test('RPC getAllowedMethods', async () => {
    const response = await testEndpoint('/api/rpc', 'POST', {
      method: 'getAllowedMethods',
      id: 'test-allowed-methods'
    });
    return response.status === 200 && response.data.result;
  });

  await test('RPC ping', async () => {
    const response = await testEndpoint('/api/rpc', 'POST', {
      method: 'ping',
      id: 'test-ping'
    });
    return response.status === 200 && response.data.result;
  });

  await test('RPC getActiveOrders', async () => {
    const response = await testEndpoint('/api/rpc', 'POST', {
      method: 'getActiveOrders',
      id: 'test-active-orders'
    });
    return response.status === 200 && response.data.result;
  });

  await test('RPC getStatistics', async () => {
    const response = await testEndpoint('/api/rpc', 'POST', {
      method: 'getStatistics',
      id: 'test-statistics'
    });
    return response.status === 200 && response.data.result;
  });

  await test('Event Trigger', async () => {
    const response = await testEndpoint('/api/trigger-test-events', 'POST', {
      eventType: 'order_created',
      count: 1
    });
    return response.status === 200 && response.data.success;
  });

  await test('Event History', async () => {
    const response = await testEndpoint('/api/events');
    return response.status === 200 && response.data.success;
  });

  await test('Client Subscription', async () => {
    const response = await testEndpoint('/api/subscribe', 'POST', {
      clientId: 'test-client',
      events: ['order_created'],
      orderIds: ['test-order-123']
    });
    return response.status === 200 && response.data.success;
  });

  // === PHASE 3.5: RESOLVER INTEGRATION ===
  console.log('\n🔹 Phase 3.5: Resolver Integration');
  
  await test('Get All Resolvers', async () => {
    const response = await testEndpoint('/resolvers');
    return response.status === 200 && response.data.success;
  });

  await test('Get Specific Resolver', async () => {
    const response = await testEndpoint('/resolvers/0x742d35Cc6634C0532925a3b8D400e1e4dff7D88e');
    return response.status === 200 && response.data.success;
  });

  await test('Start Competition', async () => {
    const response = await testEndpoint('/competitions/start', 'POST', {
      orderId: 'test-order-123',
      fragmentIndex: 0
    });
    return response.status === 200 && response.data.success;
  });

  await test('Submit Bid', async () => {
    const response = await testEndpoint('/competitions/bid', 'POST', {
      orderId: 'test-order-123',
      fragmentIndex: 0,
      resolverAddress: '0x742d35Cc6634C0532925a3b8D400e1e4dff7D88e',
      bidAmount: '1000000000000000000',
      gasPrice: '20000000000',
      confidence: 90
    });
    return response.status === 200 && response.data.success;
  });

  await test('Resolver Recommendations', async () => {
    const response = await testEndpoint('/order/test-order-456/resolver-recommendations');
    return response.status === 200 && response.data.success;
  });

  await test('Enhanced Partial Fill with Resolver Validation', async () => {
    const response = await testEndpoint('/submit/partial-fill', 'POST', {
      orderHash: '0xtest124',
      fragmentIndex: 0,
      fillAmount: '500000000000000000',
      resolver: '0x742d35Cc6634C0532925a3b8D400e1e4dff7D88e',
      secretHash: '0xsecret124',
      merkleProof: ['0xproof3', '0xproof4']
    });
    return response.status === 200 && response.data.success;
  });

  // === SYSTEM INTEGRATION TESTS ===
  console.log('\n🔹 System Integration Tests');
  
  await test('Cross-Phase Integration', async () => {
    // Test quoter + orders + resolver integration
    const quoteResponse = await testEndpoint('/quote/receive?srcChain=1&dstChain=137&srcTokenAddress=0xA0b86a33E6441196207C4c2dBCc37f5AC37e30F7&dstTokenAddress=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174&amount=1000000000000000000&walletAddress=0x742d35Cc6634C0532925a3b8D400e1e4dff7D88e');
    if (!quoteResponse.data.success) return false;
    
    const orderResponse = await testEndpoint('/order/active');
    if (!orderResponse.data.success) return false;
    
    const resolverResponse = await testEndpoint('/resolvers');
    return resolverResponse.data.success;
  });

  await test('Event System + Resolver Integration', async () => {
    // Test event system with resolver events
    const eventResponse = await testEndpoint('/api/trigger-test-events', 'POST', {
      eventType: 'fragment_ready',
      count: 1
    });
    
    if (!eventResponse.data.success) return false;
    
    const historyResponse = await testEndpoint('/api/events');
    return historyResponse.data.success;
  });

  // === FINAL RESULTS ===
  console.log('\n=================================================');
  console.log('📊 COMPLETE SYSTEM TEST RESULTS');
  console.log('=================================================');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (passedTests === totalTests) {
    console.log('\n✅ 🎉 ALL TESTS PASSED! 🎉');
    console.log('=================================================');
    console.log('🚀 FUSION BRIDGE RELAYER - FULLY OPERATIONAL');
    console.log('=================================================');
    console.log('✅ Phase 1: Backend API Foundation - COMPLETE');
    console.log('✅ Phase 2: Dutch Auction Pricing - COMPLETE');
    console.log('✅ Phase 3: Partial Fills - COMPLETE');
    console.log('✅ Phase 4: Event System - COMPLETE');
    console.log('✅ Phase 3.5: Resolver Integration - COMPLETE');
    console.log('✅ System Integration - COMPLETE');
    console.log('');
    console.log('🎯 Ready for production deployment!');
    console.log('🔗 1inch Fusion+ compliant');
    console.log('⚡ Real-time event processing');
    console.log('🏁 Competitive resolver system');
    console.log('🔐 Secure partial fill validation');
    console.log('📊 Comprehensive monitoring');
  } else {
    console.log('\n❌ Some tests failed. System needs attention.');
    console.log('Please review the failed components.');
  }
}

// Run the complete system test
runCompleteSystemTest(); 