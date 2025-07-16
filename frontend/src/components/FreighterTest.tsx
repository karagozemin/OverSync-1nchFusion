import { useFreighter } from '../hooks/useFreighter';

export default function FreighterTest() {
  const {
    isConnected,
    address,
    isLoading,
    error,
    connect,
    disconnect,
    getNetworkInfo,
  } = useFreighter();

  const handleNetworkTest = async () => {
    try {
      const network = await getNetworkInfo();
      console.log('Network info:', network);
      alert(`Network: ${network?.network || 'Unknown'}`);
    } catch (error) {
      console.error('Network test error:', error);
      alert('Network test failed');
    }
  };

  return (
    <div className="p-6 bg-white/10 rounded-xl border border-white/20">
      <h2 className="text-xl font-bold mb-4 text-white">Freighter Test</h2>
      
      <div className="space-y-4">
        <div>
          <span className="text-gray-300">Status: </span>
          <span className={`font-bold ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        {address && (
          <div>
            <span className="text-gray-300">Address: </span>
            <span className="text-blue-300 font-mono text-sm">
              {address.substring(0, 12)}...{address.substring(address.length - 12)}
            </span>
          </div>
        )}
        
        {error && (
          <div className="text-red-400 text-sm bg-red-500/20 p-2 rounded">
            Error: {error}
          </div>
        )}
        
        <div className="flex gap-2">
          {!isConnected ? (
            <button
              onClick={connect}
              disabled={isLoading}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {isLoading ? 'Connecting...' : 'Connect'}
            </button>
          ) : (
            <button
              onClick={disconnect}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
            >
              Disconnect
            </button>
          )}
          
          <button
            onClick={handleNetworkTest}
            disabled={!isConnected}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Test Network
          </button>
        </div>
      </div>
    </div>
  );
} 