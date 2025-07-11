/**
 * @fileoverview Stellar HTLC Usage Demo
 * @description Shows how to use FusionBridge Stellar functionality
 */

import StellarClient, {
  generatePreimageAndHash,
  createTestnetConfig,
} from '../src/index';

async function stellarHTLCDemo() {
  console.log('🌟 FusionBridge Stellar HTLC Demo');
  console.log('================================');

  // Initialize Stellar client for testnet
  const stellarClient = new StellarClient(true);

  console.log('\n1. 🔑 Generate secret for HTLC...');
  const { preimage, hash } = generatePreimageAndHash();
  console.log(`   Preimage: ${preimage.substring(0, 16)}...`);
  console.log(`   Hash: ${hash.substring(0, 16)}...`);

  console.log('\n2. 🌉 Simulate Ethereum order received...');
  const ethereumOrder = {
    ethereumOrderId: 1,
    ethereumTxHash: '0x' + generatePreimageAndHash().hash,
    token: '0xA0b86a33E6417C4fd30ad9D05D6b9b7cd6dd11B', // Mock USDC
    amount: '100.0000000',
    hashLock: hash,
    timelock: Math.floor(Date.now() / 1000) + 86400, // 24 hours
    sender: 'GAJHQGR4KRB3MHAX5S3PUYBRSZ4HTSF3X6DSJK3PK3W2Q7OV2QRJP3W4',
    recipient: 'GB6NVEN5HSUBKMYCE5ZOWSK5K23TBWRUQLZY3KNMXUZ3AQ2ESC4MY6AQ',
  };

  console.log('\n3. 🏗️ Create Stellar HTLC claimable balance...');
  const createResult = await stellarClient.createHTLCFromEthereumOrder(
    ethereumOrder,
    'SAMPLERELAYERSECRETKEYFORTEST12345678901234567890'
  );

  if (createResult.success) {
    console.log(`   ✅ Success! Balance ID: ${createResult.balanceId?.substring(0, 16)}...`);
    
    console.log('\n4. 🔍 Get claimable balance info...');
    const balanceInfo = await stellarClient.getClaimableBalanceInfo(createResult.balanceId!);
    if (balanceInfo) {
      console.log(`   Asset: ${balanceInfo.assetCode}`);
      console.log(`   Amount: ${balanceInfo.amount}`);
      console.log(`   Timelock: ${new Date((balanceInfo.timelock || 0) * 1000).toISOString()}`);
    }

    console.log('\n5. 🔓 Claim the balance with preimage...');
    const claimResult = await stellarClient.claimStellarHTLC(
      createResult.balanceId!,
      preimage,
      'SAMPLECLAIMERSECRETKEYFORTEST123456789012345678901'
    );

    if (claimResult.success) {
      console.log(`   ✅ Claimed! TX: ${claimResult.txHash?.substring(0, 16)}...`);
    }

  } else {
    console.log(`   ❌ Failed: ${createResult.error}`);
  }

  console.log('\n6. 🔄 Demo refund functionality...');
  const refundResult = await stellarClient.refundStellarHTLC(
    'mock-expired-balance-id',
    'SAMPLEREFUNDERSECRETKEYFORTEST12345678901234567890'
  );

  if (refundResult.success) {
    console.log(`   ✅ Refunded! TX: ${refundResult.txHash?.substring(0, 16)}...`);
  }

  console.log('\n7. 📊 Show network configuration...');
  const config = stellarClient.getNetworkConfig();
  console.log(`   Network: ${config.isTestnet ? 'Testnet' : 'Mainnet'}`);
  console.log(`   Horizon: ${config.horizonUrl}`);

  console.log('\n✨ Demo completed successfully!');
  console.log('\n📝 Next steps for real implementation:');
  console.log('   - Add real Stellar SDK transaction building');
  console.log('   - Implement XDR parsing for balance IDs');
  console.log('   - Add proper error handling and retries');
  console.log('   - Set up testnet accounts and funding');
}

// Run demo if called directly
if (require.main === module) {
  stellarHTLCDemo().catch(console.error);
}

export default stellarHTLCDemo; 