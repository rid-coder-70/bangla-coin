// api-gateway/src/provider.js — FallbackProvider with quorum=2 across 3 Hardhat nodes
const { ethers } = require('ethers');

const RPC_URLS = [
  process.env.RPC_NODE_1 || 'http://127.0.0.1:10001',
  process.env.RPC_NODE_2 || 'http://127.0.0.1:10002',
  process.env.RPC_NODE_3 || 'http://127.0.0.1:10003',
];

const QUORUM = parseInt(process.env.QUORUM || '2', 10);

/**
 * Build an ethers FallbackProvider that queries all 3 nodes
 * and requires `QUORUM` of them to agree before returning a result.
 * This ensures no single node can lie about balances or state.
 */
function createFallbackProvider() {
  const providers = RPC_URLS.map((url, i) => {
    const provider = new ethers.JsonRpcProvider(url);
    return {
      provider,
      priority: i + 1,   // lower = preferred
      stallTimeout: 2000, // 2 s before trying next
      weight: 1,
    };
  });

  const fallback = new ethers.FallbackProvider(providers, undefined, { quorum: QUORUM });
  return fallback;
}

/**
 * Get a wallet signer connected to the FallbackProvider.
 * Used for broadcasting custodial transactions.
 */
function createDeployerWallet(provider) {
  const key = process.env.DEPLOYER_PRIVATE_KEY;
  if (!key) throw new Error('DEPLOYER_PRIVATE_KEY is not set');
  return new ethers.Wallet(key, provider);
}

/**
 * Get a single JsonRpcProvider (for operations that don't support FallbackProvider,
 * like event subscriptions or direct node queries).
 */
function getSingleProvider(nodeIndex = 0) {
  return new ethers.JsonRpcProvider(RPC_URLS[nodeIndex]);
}

// Singleton instances
let _provider = null;
let _deployer = null;

function getProvider() {
  if (!_provider) _provider = createFallbackProvider();
  return _provider;
}

function getDeployer() {
  if (!_deployer) _deployer = createDeployerWallet(getProvider());
  return _deployer;
}

/**
 * Broadcast a contract write operation to ALL 3 nodes simultaneously.
 * Since the Hardhat nodes are isolated (no P2P sync), we must send
 * the transaction to each node independently.
 * @param {Function} txFn - async (wallet, provider) => tx receipt
 * @returns {Promise<{results: Array, successCount: number}>}
 */
async function broadcastToAllNodes(txFn) {
  const key = process.env.DEPLOYER_PRIVATE_KEY;
  if (!key) throw new Error('DEPLOYER_PRIVATE_KEY is not set');

  const promises = RPC_URLS.map(async (url, i) => {
    try {
      const provider = new ethers.JsonRpcProvider(url);
      const wallet = new ethers.Wallet(key, provider);
      const result = await txFn(wallet, provider, i);
      console.log(`📡 Node ${i + 1} (${url}): broadcast OK`);
      return { status: 'ok', node: i + 1, result };
    } catch (err) {
      console.warn(`⚠️  Node ${i + 1} (${url}): broadcast failed — ${err.message}`);
      return { status: 'fail', node: i + 1, error: err.message };
    }
  });

  const results = await Promise.allSettled(promises);
  const settled = results.map(r => r.value || { status: 'fail', error: r.reason?.message });
  const successCount = settled.filter(r => r.status === 'ok').length;
  console.log(`📡 Broadcast complete: ${successCount}/${RPC_URLS.length} nodes succeeded`);
  return { results: settled, successCount };
}

module.exports = {
  getProvider,
  getDeployer,
  getSingleProvider,
  broadcastToAllNodes,
  RPC_URLS,
  QUORUM,
};
