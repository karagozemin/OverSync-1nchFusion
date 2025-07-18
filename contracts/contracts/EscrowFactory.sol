// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "./HTLCBridge.sol";

/**
 * @title EscrowFactory - Cross-Chain Escrow Factory for Ethereum-Stellar Bridge
 * @dev Creates and manages escrow contracts with safety deposits and cross-chain coordination
 * @notice Factory pattern for creating secure escrow contracts for cross-chain swaps
 */
contract EscrowFactory is ReentrancyGuard, Ownable {
    
    // ═══════════════════════════════════════════════════════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    /// @dev Escrow configuration struct
    struct EscrowConfig {
        address token;              // Token address to escrow
        uint256 amount;             // Amount to escrow
        bytes32 hashLock;           // Hash of the secret
        uint256 timelock;           // Expiration timestamp
        address beneficiary;        // Address that can claim
        address refundAddress;      // Address to refund after timeout
        uint256 safetyDeposit;      // Safety deposit amount in ETH
        uint256 chainId;            // Destination chain ID
        bytes32 stellarTxHash;      // Stellar transaction hash (if applicable)
        bool isPartialFillEnabled;  // Whether partial fills are allowed
    }
    
    /// @dev Escrow state struct  
    struct EscrowState {
        address escrowAddress;      // Deployed escrow contract address
        EscrowConfig config;        // Escrow configuration
        EscrowStatus status;        // Current status
        uint256 createdAt;          // Creation timestamp
        uint256 filledAmount;       // Amount filled (for partial fills)
        uint256 safetyDepositPaid;  // Safety deposit paid
        address resolver;           // Resolver address
        bool isActive;              // Whether escrow is active
    }
    
    /// @dev Escrow status enum
    enum EscrowStatus {
        Created,        // Escrow created but not funded
        Funded,         // Escrow funded and active
        Claimed,        // Escrow claimed by beneficiary
        Refunded,       // Escrow refunded to sender
        Expired,        // Escrow expired and can be refunded
        Cancelled       // Escrow cancelled by admin
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    /// @dev Escrow counter for unique IDs
    uint256 private _escrowCounter = 1;
    
    /// @dev Mapping from escrow ID to escrow state
    mapping(uint256 => EscrowState) public escrows;
    
    /// @dev Mapping from escrow address to escrow ID
    mapping(address => uint256) public escrowAddressToId;
    
    /// @dev Mapping from hash lock to escrow ID
    mapping(bytes32 => uint256) public hashLockToEscrowId;
    
    /// @dev Mapping from resolver to their escrows
    mapping(address => uint256[]) public resolverEscrows;
    
    /// @dev Mapping from chain ID to escrow count
    mapping(uint256 => uint256) public chainEscrowCount;
    
    /// @dev Minimum safety deposit (0.01 ETH)
    uint256 public constant MIN_SAFETY_DEPOSIT = 0.01 ether;
    
    /// @dev Maximum safety deposit (10 ETH)
    uint256 public constant MAX_SAFETY_DEPOSIT = 10 ether;
    
    /// @dev Minimum timelock (1 hour)
    uint256 public constant MIN_TIMELOCK = 3600;
    
    /// @dev Maximum timelock (30 days)
    uint256 public constant MAX_TIMELOCK = 2592000;
    
    /// @dev Fee rate for factory operations (basis points)
    uint256 public factoryFeeRate = 10; // 0.1%
    
    /// @dev Total safety deposits collected
    uint256 public totalSafetyDeposits;
    
    /// @dev Total escrows created
    uint256 public totalEscrows;
    
    /// @dev Authorized resolvers
    mapping(address => bool) public authorizedResolvers;
    
    // ═══════════════════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    /**
     * @dev Emitted when a new escrow is created
     */
    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed escrowAddress,
        address indexed resolver,
        address token,
        uint256 amount,
        bytes32 hashLock,
        uint256 timelock,
        uint256 safetyDeposit,
        uint256 chainId
    );
    
    /**
     * @dev Emitted when an escrow is funded
     */
    event EscrowFunded(
        uint256 indexed escrowId,
        address indexed funder,
        uint256 amount,
        uint256 safetyDeposit
    );
    
    /**
     * @dev Emitted when an escrow is claimed
     */
    event EscrowClaimed(
        uint256 indexed escrowId,
        address indexed claimer,
        uint256 amount,
        bytes32 preimage
    );
    
    /**
     * @dev Emitted when an escrow is refunded
     */
    event EscrowRefunded(
        uint256 indexed escrowId,
        address indexed refundee,
        uint256 amount,
        uint256 safetyDeposit
    );
    
    /**
     * @dev Emitted when safety deposit is slashed
     */
    event SafetyDepositSlashed(
        uint256 indexed escrowId,
        address indexed resolver,
        uint256 amount,
        string reason
    );
    
    /**
     * @dev Emitted when cross-chain message is sent
     */
    event CrossChainMessageSent(
        uint256 indexed escrowId,
        uint256 indexed destinationChainId,
        bytes32 indexed messageHash,
        bytes data
    );
    
    // ═══════════════════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    constructor() Ownable(msg.sender) {}
    
    // ═══════════════════════════════════════════════════════════════════════════════════════
    // EXTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    /**
     * @dev Create a new escrow with safety deposit
     * @param config Escrow configuration
     * @return escrowId The unique ID of the created escrow
     */
    function createEscrow(
        EscrowConfig calldata config
    ) external payable nonReentrant returns (uint256 escrowId) {
        // Validate inputs
        require(config.token != address(0), "Invalid token");
        require(config.amount > 0, "Amount must be > 0");
        require(config.hashLock != bytes32(0), "Invalid hash lock");
        require(config.timelock > block.timestamp + MIN_TIMELOCK, "Timelock too early");
        require(config.timelock <= block.timestamp + MAX_TIMELOCK, "Timelock too late");
        require(config.beneficiary != address(0), "Invalid beneficiary");
        require(config.refundAddress != address(0), "Invalid refund address");
        require(config.safetyDeposit >= MIN_SAFETY_DEPOSIT, "Safety deposit too low");
        require(config.safetyDeposit <= MAX_SAFETY_DEPOSIT, "Safety deposit too high");
        require(msg.value >= config.safetyDeposit, "Insufficient safety deposit");
        require(hashLockToEscrowId[config.hashLock] == 0, "Hash lock already used");
        require(authorizedResolvers[msg.sender], "Not authorized resolver");
        
        // Generate unique escrow ID
        escrowId = _escrowCounter++;
        
        // Calculate salt for Create2
        bytes32 salt = keccak256(abi.encodePacked(escrowId, config.hashLock));
        
        // Deploy escrow contract using Create2
        address escrowAddress = _deployEscrow(salt, config);
        
        // Create escrow state
        EscrowState storage escrow = escrows[escrowId];
        escrow.escrowAddress = escrowAddress;
        escrow.config = config;
        escrow.status = EscrowStatus.Created;
        escrow.createdAt = block.timestamp;
        escrow.filledAmount = 0;
        escrow.safetyDepositPaid = msg.value;
        escrow.resolver = msg.sender;
        escrow.isActive = true;
        
        // Update mappings
        escrowAddressToId[escrowAddress] = escrowId;
        hashLockToEscrowId[config.hashLock] = escrowId;
        resolverEscrows[msg.sender].push(escrowId);
        chainEscrowCount[config.chainId]++;
        
        // Update statistics
        totalEscrows++;
        totalSafetyDeposits += msg.value;
        
        // Emit event
        emit EscrowCreated(
            escrowId,
            escrowAddress,
            msg.sender,
            config.token,
            config.amount,
            config.hashLock,
            config.timelock,
            config.safetyDeposit,
            config.chainId
        );
        
        return escrowId;
    }
    
    /**
     * @dev Fund an escrow with tokens
     * @param escrowId The ID of the escrow to fund
     */
    function fundEscrow(uint256 escrowId) external nonReentrant {
        EscrowState storage escrow = escrows[escrowId];
        require(escrow.isActive, "Escrow not active");
        require(escrow.status == EscrowStatus.Created, "Escrow already funded");
        require(block.timestamp <= escrow.config.timelock, "Escrow expired");
        
        // Transfer tokens to escrow contract
        IERC20 token = IERC20(escrow.config.token);
        require(
            token.transferFrom(msg.sender, escrow.escrowAddress, escrow.config.amount),
            "Token transfer failed"
        );
        
        // Update status
        escrow.status = EscrowStatus.Funded;
        
        // Emit event
        emit EscrowFunded(escrowId, msg.sender, escrow.config.amount, escrow.safetyDepositPaid);
    }
    
    /**
     * @dev Claim an escrow by revealing the preimage
     * @param escrowId The ID of the escrow to claim
     * @param preimage The preimage that hashes to the hash lock
     */
    function claimEscrow(uint256 escrowId, bytes32 preimage) external nonReentrant {
        EscrowState storage escrow = escrows[escrowId];
        require(escrow.isActive, "Escrow not active");
        require(escrow.status == EscrowStatus.Funded, "Escrow not funded");
        require(block.timestamp <= escrow.config.timelock, "Escrow expired");
        require(keccak256(abi.encodePacked(preimage)) == escrow.config.hashLock, "Invalid preimage");
        require(msg.sender == escrow.config.beneficiary, "Not authorized claimer");
        
        // Update status
        escrow.status = EscrowStatus.Claimed;
        escrow.filledAmount = escrow.config.amount;
        
        // Transfer tokens to claimer
        IERC20 token = IERC20(escrow.config.token);
        require(
            token.transferFrom(escrow.escrowAddress, msg.sender, escrow.config.amount),
            "Token transfer failed"
        );
        
        // Return safety deposit to resolver
        payable(escrow.resolver).transfer(escrow.safetyDepositPaid);
        
        // Emit event
        emit EscrowClaimed(escrowId, msg.sender, escrow.config.amount, preimage);
    }
    
    /**
     * @dev Refund an expired escrow
     * @param escrowId The ID of the escrow to refund
     */
    function refundEscrow(uint256 escrowId) external nonReentrant {
        EscrowState storage escrow = escrows[escrowId];
        require(escrow.isActive, "Escrow not active");
        require(escrow.status == EscrowStatus.Funded, "Escrow not funded");
        require(block.timestamp > escrow.config.timelock, "Escrow not expired");
        
        // Update status
        escrow.status = EscrowStatus.Refunded;
        
        // Transfer tokens back to refund address
        IERC20 token = IERC20(escrow.config.token);
        require(
            token.transferFrom(escrow.escrowAddress, escrow.config.refundAddress, escrow.config.amount),
            "Token transfer failed"
        );
        
        // Return safety deposit to resolver
        payable(escrow.resolver).transfer(escrow.safetyDepositPaid);
        
        // Emit event
        emit EscrowRefunded(escrowId, escrow.config.refundAddress, escrow.config.amount, escrow.safetyDepositPaid);
    }
    
    /**
     * @dev Slash safety deposit for misbehavior
     * @param escrowId The ID of the escrow
     * @param reason The reason for slashing
     */
    function slashSafetyDeposit(uint256 escrowId, string calldata reason) external onlyOwner {
        EscrowState storage escrow = escrows[escrowId];
        require(escrow.isActive, "Escrow not active");
        require(escrow.safetyDepositPaid > 0, "No safety deposit");
        
        uint256 slashAmount = escrow.safetyDepositPaid;
        escrow.safetyDepositPaid = 0;
        
        // Transfer slashed amount to owner
        payable(owner()).transfer(slashAmount);
        
        // Emit event
        emit SafetyDepositSlashed(escrowId, escrow.resolver, slashAmount, reason);
    }
    
    /**
     * @dev Send cross-chain message
     * @param escrowId The ID of the escrow
     * @param destinationChainId The destination chain ID
     * @param data The message data
     */
    function sendCrossChainMessage(
        uint256 escrowId,
        uint256 destinationChainId,
        bytes calldata data
    ) external {
        EscrowState storage escrow = escrows[escrowId];
        require(escrow.isActive, "Escrow not active");
        require(msg.sender == escrow.resolver, "Not authorized");
        
        bytes32 messageHash = keccak256(abi.encodePacked(escrowId, destinationChainId, data));
        
        // Emit cross-chain message event
        emit CrossChainMessageSent(escrowId, destinationChainId, messageHash, data);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    /**
     * @dev Authorize a resolver
     * @param resolver The resolver address to authorize
     */
    function authorizeResolver(address resolver) external onlyOwner {
        authorizedResolvers[resolver] = true;
    }
    
    /**
     * @dev Revoke resolver authorization
     * @param resolver The resolver address to revoke
     */
    function revokeResolver(address resolver) external onlyOwner {
        authorizedResolvers[resolver] = false;
    }
    
    /**
     * @dev Set factory fee rate
     * @param newFeeRate The new fee rate in basis points
     */
    function setFactoryFeeRate(uint256 newFeeRate) external onlyOwner {
        require(newFeeRate <= 1000, "Fee rate too high"); // Max 10%
        factoryFeeRate = newFeeRate;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    /**
     * @dev Get escrow information
     * @param escrowId The ID of the escrow
     * @return The escrow state
     */
    function getEscrow(uint256 escrowId) external view returns (EscrowState memory) {
        return escrows[escrowId];
    }
    
    /**
     * @dev Get escrows by resolver
     * @param resolver The resolver address
     * @return Array of escrow IDs
     */
    function getResolverEscrows(address resolver) external view returns (uint256[] memory) {
        return resolverEscrows[resolver];
    }
    
    /**
     * @dev Get escrow count by chain
     * @param chainId The chain ID
     * @return The number of escrows for the chain
     */
    function getChainEscrowCount(uint256 chainId) external view returns (uint256) {
        return chainEscrowCount[chainId];
    }
    
    /**
     * @dev Compute escrow address
     * @param salt The salt for Create2
     * @param config The escrow configuration
     * @return The computed escrow address
     */
    function computeEscrowAddress(
        bytes32 salt,
        EscrowConfig calldata config
    ) external view returns (address) {
        bytes memory creationCode = abi.encodePacked(
            type(HTLCBridge).creationCode,
            abi.encode(config)
        );
        
        return Create2.computeAddress(salt, keccak256(creationCode));
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    /**
     * @dev Deploy escrow contract using Create2
     * @param salt The salt for Create2
     * @param config The escrow configuration
     * @return The deployed escrow address
     */
    function _deployEscrow(
        bytes32 salt,
        EscrowConfig calldata config
    ) internal returns (address) {
        bytes memory creationCode = abi.encodePacked(
            type(HTLCBridge).creationCode,
            abi.encode(config)
        );
        
        return Create2.deploy(0, salt, creationCode);
    }
    
    /**
     * @dev Emergency withdraw function
     * @param token The token to withdraw
     * @param amount The amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            payable(owner()).transfer(amount);
        } else {
            IERC20(token).transfer(owner(), amount);
        }
    }
} 