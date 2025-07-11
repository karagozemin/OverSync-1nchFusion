import BridgeForm from './components/BridgeForm'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white">
      {/* Top Navigation */}
      <nav className="w-full px-6 py-4 flex items-center justify-between border-b border-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">F</span>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            FusionBridge
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-6">
            <a href="#" className="text-gray-300 hover:text-white transition-colors">Swap</a>
            <a href="#" className="text-gray-300 hover:text-white transition-colors">Bridge</a>
            <a href="#" className="text-gray-300 hover:text-white transition-colors">Pool</a>
          </nav>
          
          <button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl">
            Connect Wallet
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="text-center py-12 px-6">
        <h1 className="text-5xl md:text-6xl font-bold mb-6">
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Cross-chain Swap
          </span>
        </h1>
        <p className="text-xl text-gray-300 mb-2 max-w-2xl mx-auto">
          Bridge your assets seamlessly between Ethereum and Stellar networks
        </p>
        <p className="text-sm text-gray-400 mb-12">
          Powered by Hash Time Locked Contracts (HTLC) for secure cross-chain transfers
        </p>
      </div>

      {/* Main Content */}
      <div className="flex items-start justify-center px-6 pb-12">
        <BridgeForm />
      </div>

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>
    </div>
  )
}

export default App 