/**
 * Simple Stellar Claimable Balance Test
 */
const { Keypair, Asset, Operation, TransactionBuilder, Networks, BASE_FEE, Claimant } = require('@stellar/stellar-sdk');
const { Server } = require('@stellar/stellar-sdk/lib/horizon/index.js');

async function testClaimableBalance() {
  try {
    console.log('🧪 Testing Stellar Claimable Balance Creation...');
    
    // Mainnet configuration
    const server = new Server('https://horizon.stellar.org');
    const networkPassphrase = Networks.PUBLIC; // Mainnet
    
    // Relayer keypair
    const relayerSecret = 'SDMQU2OI6XNN54RI4OROIEGBOCALJ3IBEEYYL6EUFO3VE2UMV7DPQF3A';
    const relayerKeypair = Keypair.fromSecret(relayerSecret);
    
    console.log('🔑 Relayer Public Key:', relayerKeypair.publicKey());
    
    // Load relayer account
    const relayerAccount = await server.loadAccount(relayerKeypair.publicKey());
    console.log('💰 Relayer Balance:', relayerAccount.balances[0].balance, 'XLM');
    
    // Simple claimable balance parameters
    const amount = '0.5'; // Small amount for test
    const recipientPubKey = 'GBTCBCWLE6YVTR5Y57S2ZMH3FM5JNYIDDTBYHMQQTALUZJNLB23RFP4V'; // Different account for test
    
    // Simple claimants - just unconditional
    const claimants = [
      new Claimant(recipientPubKey, Claimant.predicateUnconditional()),
      new Claimant(relayerKeypair.publicKey(), Claimant.predicateUnconditional())
    ];
    
    console.log('📋 Claimants:', claimants.length);
    
    // Build transaction
    const txBuilder = new TransactionBuilder(relayerAccount, {
      fee: BASE_FEE,
      networkPassphrase: networkPassphrase,
    });
    
    // Add create claimable balance operation
    txBuilder.addOperation(
      Operation.createClaimableBalance({
        asset: Asset.native(),
        amount: amount,
        claimants: claimants,
      })
    );
    
    txBuilder.setTimeout(30);
    
    // Build and sign
    const transaction = txBuilder.build();
    transaction.sign(relayerKeypair);
    
    console.log('📡 Submitting transaction...');
    console.log('🔍 Transaction XDR:', transaction.toXDR());
    
    // Submit
    const response = await server.submitTransaction(transaction);
    
    console.log('✅ SUCCESS!');
    console.log('📝 TX Hash:', response.hash);
    console.log('🆔 Balance ID: Will be in response...');
    
  } catch (error) {
    console.error('❌ ERROR:', error);
    
    if (error.response) {
      console.error('📊 Response Status:', error.response.status);
      console.error('📊 Response Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testClaimableBalance();