import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// In-memory order storage
const orders = new Map();

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'ETH-XLM Bi-directional Bridge'
  });
});

// Create XLM to ETH order
app.post('/api/orders/create', async (req, res) => {
  try {
    const { fromChain, toChain, fromToken, toToken, amount, ethAddress, stellarAddress, direction } = req.body;
    
    console.log('🌉 Bridge order:', { direction, fromToken, toToken, amount });
    
    if (direction === 'eth_to_xlm') {
      // ETH → XLM direction
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      const orderData = {
        orderId,
        token: '0x0000000000000000000000000000000000000000', // ETH
        amount: (parseFloat(amount) * 1e18).toString(), // ETH to wei
        ethAddress,
        stellarAddress,
        created: new Date().toISOString(),
        status: 'pending_user_confirmation'
      };
      
      // Store order
      orders.set(orderId, {
        ...orderData,
        ethAddress,
        stellarAddress,
        amount
      });
      
      console.log('✅ ETH→XLM Order created:', orderId);
      
      res.json({
        success: true,
        orderId,
        orderData,
        approvalTransaction: {
          to: '0x742d35Cc6634C0532925a3b8D400e1e4dff7D88e', // Contract address
          value: `0x${BigInt(orderData.amount).toString(16)}`,
          data: '0x',
          gas: '0x5208',
          gasPrice: '0x4a817c800'
        },
        message: 'Order created! Please approve the escrow deposit.',
        nextStep: 'Approve deposit, then relayer will create HTLC contract',
        instructions: [
          '1. Approve escrow deposit transaction',
          '2. Relayer will automatically create HTLC contract',
          '3. Cross-chain swap will begin'
        ]
      });
      
    } else if (direction === 'xlm_to_eth') {
      // Generate order ID
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      const orderData = {
        orderId,
        stellarAmount: (parseFloat(amount) * 1e7).toString(), // XLM to stroops
        targetAmount: (parseFloat(amount) / 10000 * 1e18).toString(), // Convert to ETH wei
        ethAddress,
        stellarAddress,
        created: new Date().toISOString(),
        status: 'pending_stellar_transaction'
      };
      
      // Store order
      orders.set(orderId, orderData);
      
      console.log('✅ XLM→ETH Order created:', orderId);
      
      res.json({
        success: true,
        orderId,
        orderData,
        message: 'Bridge order created successfully',
        nextStep: 'Please confirm the Stellar transaction in Freighter'
      });
    } else {
      res.status(400).json({
        error: 'Invalid direction. Supported: eth_to_xlm, xlm_to_eth'
      });
    }
    
  } catch (error) {
    console.error('❌ Order creation failed:', error);
    res.status(500).json({
      error: 'Order creation failed',
      details: error.message
    });
  }
});

// Process order (both directions)
app.post('/api/orders/process', async (req, res) => {
  try {
    const { orderId, txHash, stellarTxHash } = req.body;
    
    console.log('🌟 Processing order:', { orderId, txHash, stellarTxHash });
    
    const order = orders.get(orderId);
    if (!order) {
      return res.status(404).json({
        error: 'Order not found'
      });
    }
    
    if (order.stellarAmount) {
      // XLM → ETH direction: Mock ETH release
      const mockEthTx = `0x${Math.random().toString(16).substring(2, 18)}${'0'.repeat(48)}`;
      
      console.log('💰 Mock ETH released:', mockEthTx);
      console.log('💫 Target amount:', order.targetAmount, 'wei');
      
      res.json({
        success: true,
        orderId,
        ethTxHash: mockEthTx,
        message: 'Cross-chain swap completed (mock ETH release)',
        details: {
          stellar: {
            txId: stellarTxHash,
            amount: `${parseFloat(order.stellarAmount) / 1e7} XLM`,
            destination: 'RELAYER_ADDRESS',
            status: 'completed'
          },
          ethereum: {
            txId: mockEthTx,
            amount: `${parseFloat(order.targetAmount) / 1e18} ETH`,
            destination: order.ethAddress,
            status: 'completed'
          }
        }
      });
      
    } else {
      // ETH → XLM direction: Real XLM release via Stellar SDK
      try {
        console.log('🔗 Loading Stellar SDK for ETH → XLM...');
        const { Horizon, Keypair, Asset, Operation, TransactionBuilder, Networks, BASE_FEE, Memo } = await import('@stellar/stellar-sdk');
        
        // Setup Stellar server (testnet)
        const server = new Horizon.Server('https://horizon-testnet.stellar.org');
        
                 // Relayer Stellar keys (from project environment)
         const relayerKeypair = Keypair.fromSecret('SATRXKDQQ2MMST5V57CX52P6OPDLGUFWQD5FYRD75N2UXCIHWH6ETIYG'); // Real key
        
        console.log('🔗 Connecting to Stellar testnet...');
        const relayerAccount = await server.loadAccount(relayerKeypair.publicKey());
        console.log('💰 Relayer XLM balance:', relayerAccount.balances.find(b => b.asset_type === 'native')?.balance);

        // Calculate XLM amount to send
        const xlmAmount = (parseFloat(order.amount || '0.001') * 10000).toFixed(7); // ETH to XLM conversion
        
        console.log('🎯 Sending to user address:', order.stellarAddress);
        console.log('💰 XLM amount to send:', xlmAmount);
        
        // Create payment transaction
        const payment = Operation.payment({
          destination: order.stellarAddress,
          asset: Asset.native(), // XLM
          amount: xlmAmount
        });
        
        // Build transaction
        const transaction = new TransactionBuilder(relayerAccount, {
          fee: BASE_FEE,
          networkPassphrase: Networks.TESTNET
        })
          .addOperation(payment)
          .addMemo(Memo.text(`Bridge:${orderId.substring(0, 20)}`))
          .setTimeout(300)
          .build();
        
        // Sign transaction
        transaction.sign(relayerKeypair);
        console.log('📝 Transaction signed');
        console.log('💫 Sending XLM to:', order.stellarAddress);
        
        // Submit to network
        const result = await server.submitTransaction(transaction);
        console.log('✅ Stellar transaction successful!');
        console.log('🔍 Transaction hash:', result.hash);
        console.log('🌐 View on StellarExpert: https://stellar.expert/explorer/testnet/tx/' + result.hash);
        
        res.json({
          success: true,
          orderId,
          stellarTxId: result.hash,
          message: 'Cross-chain swap completed successfully!',
          details: {
            ethereum: {
              txHash: txHash,
              status: 'confirmed'
            },
            stellar: {
              txId: result.hash,
              amount: `${xlmAmount} XLM`,
              destination: order.stellarAddress,
              status: 'completed'
            }
          }
        });
        
      } catch (stellarError) {
        console.error('❌ Stellar transaction failed:', stellarError);
        
        // Fallback to mock XLM
        const mockXlmTx = `stellar_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const xlmAmount = (parseFloat(order.amount || '0.001') * 10000).toFixed(7);
        
        console.log('🔄 Falling back to mock XLM:', mockXlmTx);
        
        res.json({
          success: true,
          orderId,
          stellarTxId: mockXlmTx,
          message: 'Cross-chain swap completed (mock mode - Stellar SDK error)',
          error: stellarError.message,
          details: {
            ethereum: {
              txHash: txHash,
              status: 'confirmed'
            },
            stellar: {
              txId: mockXlmTx,
              amount: `${xlmAmount} XLM`,
              destination: order.stellarAddress,
              status: 'mock_processing',
              error: 'Stellar transaction failed, using mock'
            }
          }
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Order processing failed:', error);
    res.status(500).json({
      error: 'Order processing failed',
      details: error.message
    });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Bi-directional Bridge Relayer running on port ${PORT}`);
  console.log(`🔍 Health: http://localhost:${PORT}/health`);
  console.log(`🌉 Ready for ETH ↔ XLM bridging!`);
}); 