// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title HTLCBridge - Enhanced Cross-Chain Bridge with Safety Deposits
 * @dev Advanced HTLC implementation with partial fills, safety deposits, and cross-chain coordination
 * @notice Supports secure cross-chain token swaps between Ethereum and Stellar with enhanced security
 */
contract HTLCBridge is ReentrancyGuard, Ownable {
    
    // ═══════════════════════════════════════════════════════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    /// @dev Enhanced order struct with safety deposit integration
    struct Order {
        address sender;                 // Order creator
        address token;                  // Token being locked
        uint256 amount;                 // Total amount locked
        uint256 filledAmount;           // Amount already filled
        bytes32 hashLock;               // Hash of the secret
        uint256 timelock;               // Expiration timestamp
        uint256 feeRate;                // Fee rate in basis points
        address beneficiary;            // Who can claim the order
        address refundAddress;          // Who gets refund after timeout
        uint256 safetyDeposit;          // Safety deposit amount
        uint256 safetyDepositPaid;      // Safety deposit actually paid
        address resolver;               // Resolver responsible for order
        uint256 destinationChainId;     // Destination chain ID
        bytes32 stellarTxHash;          // Stellar transaction hash
        OrderStatus status;             // Current order status
        bool partialFillEnabled;        // Whether partial fills are allowed
        uint256 createdAt;              // Order creation timestamp
        uint256 lastUpdateAt;           // Last update timestamp
    }
    
    /// @dev Order status enum
    enum OrderStatus {
        Created,        // Order created but not funded
        Funded,         // Order funded and active
        PartiallyFilled, // Order partially filled
        Claimed,        // Order fully claimed
        Refunded,       // Order refunded due to timeout
        Cancelled,      // Order cancelled
        Expired         // Order expired
    }
    
    /// @dev Cross-chain message struct
    struct CrossChainMessage {
        uint256 sourceChainId;      // Source chain ID
        uint256 destinationChainId; // Destination chain ID
        bytes32 messageHash;        // Message hash
        bytes data;                 // Message data
        uint256 timestamp;          // Message timestamp
        bool processed;             // Whether message was processed
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    /// @dev Order counter for unique IDs
    uint256 private _nextOrderId = 1;
    
    /// @dev Mapping from order ID to order struct
    mapping(uint256 => Order) public orders;
    
    /// @dev Mapping from hash lock to order ID
    mapping(bytes32 => uint256) public hashLockToOrderId;
    
    /// @dev Mapping from resolver to their orders
    mapping(address => uint256[]) public resolverOrders;
    
    /// @dev Mapping from chain ID to order count
    mapping(uint256 => uint256) public chainOrderCount;
    
    /// @dev Cross-chain messages
    mapping(bytes32 => CrossChainMessage) public crossChainMessages;
    
    /// @dev Authorized resolvers
    mapping(address => bool) public authorizedResolvers;
    
    /// @dev Authorized factories
    mapping(address => bool) public authorizedFactories;
    
    /// @dev Minimum safety deposit (0.001 ETH)
    uint256 public constant MIN_SAFETY_DEPOSIT = 0.001 ether;
    
    /// @dev Maximum safety deposit (5 ETH)
    uint256 public constant MAX_SAFETY_DEPOSIT = 5 ether;
    
    /// @dev Minimum timelock (1 hour)
    uint256 public constant MIN_TIMELOCK = 3600;
    
    /// @dev Maximum timelock (7 days)
    uint256 public constant MAX_TIMELOCK = 604800;
    
    /// @dev Maximum fee rate (10% in basis points)
    uint256 public constant MAX_FEE_RATE = 1000;
    
    /// @dev Total safety deposits collected
    uint256 public totalSafetyDeposits;
    
    /// @dev Total orders created
    uint256 public totalOrders;
    
    /// @dev Factory fee rate (basis points)
    uint256 public factoryFeeRate = 10; // 0.1%
    
    // ═══════════════════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    /**
     * @dev Emitted when a new order is created
     */
    event OrderCreated(
        uint256 indexed orderId,
        address indexed sender,
        address indexed token,
        uint256 amount,
        bytes32 hashLock,
        uint256 timelock,
        uint256 feeRate,
        address beneficiary,
        uint256 safetyDeposit,
        uint256 destinationChainId,
        bool partialFillEnabled
    );
    
    /**
     * @dev Emitted when an order is funded
     */
    event OrderFunded(
        uint256 indexed orderId,
        address indexed funder,
        uint256 amount,
        uint256 safetyDeposit
    );
    
    /**
     * @dev Emitted when an order is claimed
     */
    event OrderClaimed(
        uint256 indexed orderId,
        address indexed claimer,
        uint256 amount,
        uint256 filledAmount,
        bytes32 preimage
    );
    
    /**
     * @dev Emitted when an order is refunded
     */
    event OrderRefunded(
        uint256 indexed orderId,
        address indexed refundee,
        uint256 amount,
        uint256 safetyDeposit
    );
    
    /**
     * @dev Emitted when partial fill occurs
     */
    event PartialFillExecuted(
        uint256 indexed orderId,
        address indexed resolver,
        uint256 fillAmount,
        uint256 totalFilled,
        uint256 remaining
    );
    
    /**
     * @dev Emitted when safety deposit is slashed
     */
    event SafetyDepositSlashed(
        uint256 indexed orderId,
        address indexed resolver,
        uint256 amount,
        string reason
    );
    
    /**
     * @dev Emitted when cross-chain message is sent
     */
    event CrossChainMessageSent(
        uint256 indexed orderId,
        uint256 indexed destinationChainId,
        bytes32 indexed messageHash,
        bytes data
    );
    
    /**
     * @dev Emitted when cross-chain message is received
     */
    event CrossChainMessageReceived(
        uint256 indexed orderId,
        uint256 indexed sourceChainId,
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
     * @dev Create a new cross-chain order with safety deposit
     * @param token Token contract address to lock
     * @param amount Amount of tokens to lock
     * @param hashLock Hash of the secret (keccak256 of preimage)
     * @param timelock Expiration timestamp
     * @param feeRate Fee rate in basis points
     * @param beneficiary Address that can claim the order
     * @param refundAddress Address to receive refund after timeout
     * @param destinationChainId Destination chain ID
     * @param stellarTxHash Stellar transaction hash (if applicable)
     * @param partialFillEnabled Whether partial fills are allowed
     * @return orderId Unique identifier for the created order
     */
    function createOrder(
        address token,
        uint256 amount,
        bytes32 hashLock,
        uint256 timelock,
        uint256 feeRate,
        address beneficiary,
        address refundAddress,
        uint256 destinationChainId,
        bytes32 stellarTxHash,
        bool partialFillEnabled
    ) external payable nonReentrant returns (uint256 orderId) {
        // Input validation
        require(token != address(0), "Invalid token");
        require(amount > 0, "Amount must be > 0");
        require(hashLock != bytes32(0), "Invalid hash lock");
        require(timelock > block.timestamp + MIN_TIMELOCK, "Timelock too early");
        require(timelock <= block.timestamp + MAX_TIMELOCK, "Timelock too late");
        require(feeRate <= MAX_FEE_RATE, "Fee rate too high");
        require(beneficiary != address(0), "Invalid beneficiary");
        require(refundAddress != address(0), "Invalid refund address");
        require(msg.value >= MIN_SAFETY_DEPOSIT, "Safety deposit too low");
        require(msg.value <= MAX_SAFETY_DEPOSIT, "Safety deposit too high");
        require(hashLockToOrderId[hashLock] == 0, "Hash lock already used");
        require(authorizedResolvers[msg.sender] || msg.sender == owner(), "Not authorized");
        
        // Generate unique order ID
        orderId = _nextOrderId++;
        
        // Create order struct
        Order storage order = orders[orderId];
        order.sender = msg.sender;
        order.token = token;
        order.amount = amount;
        order.filledAmount = 0;
        order.hashLock = hashLock;
        order.timelock = timelock;
        order.feeRate = feeRate;
        order.beneficiary = beneficiary;
        order.refundAddress = refundAddress;
        order.safetyDeposit = msg.value;
        order.safetyDepositPaid = msg.value;
        order.resolver = msg.sender;
        order.destinationChainId = destinationChainId;
        order.stellarTxHash = stellarTxHash;
        order.status = OrderStatus.Created;
        order.partialFillEnabled = partialFillEnabled;
        order.createdAt = block.timestamp;
        order.lastUpdateAt = block.timestamp;
        
        // Update mappings
        hashLockToOrderId[hashLock] = orderId;
        resolverOrders[msg.sender].push(orderId);
        chainOrderCount[destinationChainId]++;
        
        // Update statistics
        totalOrders++;
        totalSafetyDeposits += msg.value;
        
        // Emit event
        emit OrderCreated(
            orderId,
            msg.sender,
            token,
            amount,
            hashLock,
            timelock,
            feeRate,
            beneficiary,
            msg.value,
            destinationChainId,
            partialFillEnabled
        );
        
        return orderId;
    }
    
    /**
     * @dev Fund an order with tokens
     * @param orderId Order ID to fund
     */
    function fundOrder(uint256 orderId) external nonReentrant {
        Order storage order = orders[orderId];
        require(order.sender != address(0), "Order not found");
        require(order.status == OrderStatus.Created, "Order not in created state");
        require(block.timestamp <= order.timelock, "Order expired");
        
        // Transfer tokens to contract
        IERC20(order.token).transferFrom(msg.sender, address(this), order.amount);
        
        // Update order status
        order.status = OrderStatus.Funded;
        order.lastUpdateAt = block.timestamp;
        
        // Emit event
        emit OrderFunded(orderId, msg.sender, order.amount, order.safetyDepositPaid);
    }
    
    /**
     * @dev Claim an order by revealing the preimage
     * @param orderId Order ID to claim
     * @param preimage Secret that hashes to order.hashLock
     * @param claimAmount Amount to claim (for partial fills)
     */
    function claimOrder(
        uint256 orderId,
        bytes32 preimage,
        uint256 claimAmount
    ) external nonReentrant {
        Order storage order = orders[orderId];
        require(order.sender != address(0), "Order not found");
        require(order.status == OrderStatus.Funded || order.status == OrderStatus.PartiallyFilled, "Order not claimable");
        require(block.timestamp <= order.timelock, "Order expired");
        require(keccak256(abi.encodePacked(preimage)) == order.hashLock, "Invalid preimage");
        require(msg.sender == order.beneficiary, "Not authorized claimer");
        
        // Calculate claimable amount
        uint256 remainingAmount = order.amount - order.filledAmount;
        require(remainingAmount > 0, "Order fully filled");
        
        if (order.partialFillEnabled) {
            require(claimAmount > 0 && claimAmount <= remainingAmount, "Invalid claim amount");
        } else {
            claimAmount = remainingAmount;
        }
        
        // Update order state
        order.filledAmount += claimAmount;
        order.lastUpdateAt = block.timestamp;
        
        if (order.filledAmount >= order.amount) {
            order.status = OrderStatus.Claimed;
        } else {
            order.status = OrderStatus.PartiallyFilled;
        }
        
        // Calculate fee
        uint256 fee = (claimAmount * order.feeRate) / 10000;
        uint256 netAmount = claimAmount - fee;
        
        // Transfer tokens to claimer
        IERC20(order.token).transfer(msg.sender, netAmount);
        
        // Transfer fee to owner
        if (fee > 0) {
            IERC20(order.token).transfer(owner(), fee);
        }
        
        // If order is fully filled, return safety deposit
        if (order.status == OrderStatus.Claimed) {
            payable(order.resolver).transfer(order.safetyDepositPaid);
            order.safetyDepositPaid = 0;
        }
        
        // Emit event
        emit OrderClaimed(orderId, msg.sender, claimAmount, order.filledAmount, preimage);
        
        // Emit partial fill event if applicable
        if (order.status == OrderStatus.PartiallyFilled) {
            emit PartialFillExecuted(
                orderId,
                order.resolver,
                claimAmount,
                order.filledAmount,
                order.amount - order.filledAmount
            );
        }
    }
    
    /**
     * @dev Refund an expired order
     * @param orderId Order ID to refund
     */
    function refundOrder(uint256 orderId) external nonReentrant {
        Order storage order = orders[orderId];
        require(order.sender != address(0), "Order not found");
        require(order.status == OrderStatus.Funded || order.status == OrderStatus.PartiallyFilled, "Order not refundable");
        require(block.timestamp > order.timelock, "Order not expired");
        
        // Calculate refund amount
        uint256 refundAmount = order.amount - order.filledAmount;
        
        // Update order status
        order.status = OrderStatus.Refunded;
        order.lastUpdateAt = block.timestamp;
        
        // Transfer remaining tokens to refund address
        if (refundAmount > 0) {
            IERC20(order.token).transfer(order.refundAddress, refundAmount);
        }
        
        // Return safety deposit to resolver
        if (order.safetyDepositPaid > 0) {
            payable(order.resolver).transfer(order.safetyDepositPaid);
            order.safetyDepositPaid = 0;
        }
        
        // Emit event
        emit OrderRefunded(orderId, order.refundAddress, refundAmount, order.safetyDepositPaid);
    }
    
    /**
     * @dev Send cross-chain message
     * @param orderId Order ID
     * @param destinationChainId Destination chain ID
     * @param data Message data
     */
    function sendCrossChainMessage(
        uint256 orderId,
        uint256 destinationChainId,
        bytes calldata data
    ) external {
        Order storage order = orders[orderId];
        require(order.sender != address(0), "Order not found");
        require(msg.sender == order.resolver || msg.sender == owner(), "Not authorized");
        
        bytes32 messageHash = keccak256(abi.encodePacked(orderId, destinationChainId, data, block.timestamp));
        
        // Store cross-chain message
        crossChainMessages[messageHash] = CrossChainMessage({
            sourceChainId: block.chainid,
            destinationChainId: destinationChainId,
            messageHash: messageHash,
            data: data,
            timestamp: block.timestamp,
            processed: false
        });
        
        // Emit event
        emit CrossChainMessageSent(orderId, destinationChainId, messageHash, data);
    }
    
    /**
     * @dev Process received cross-chain message
     * @param messageHash Message hash
     * @param sourceChainId Source chain ID
     * @param orderId Order ID
     * @param data Message data
     */
    function processCrossChainMessage(
        bytes32 messageHash,
        uint256 sourceChainId,
        uint256 orderId,
        bytes calldata data
    ) external onlyOwner {
        CrossChainMessage storage message = crossChainMessages[messageHash];
        require(!message.processed, "Message already processed");
        
        // Mark message as processed
        message.processed = true;
        
        // Emit event
        emit CrossChainMessageReceived(orderId, sourceChainId, messageHash, data);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    /**
     * @dev Authorize a resolver
     * @param resolver Resolver address
     */
    function authorizeResolver(address resolver) external onlyOwner {
        authorizedResolvers[resolver] = true;
    }
    
    /**
     * @dev Revoke resolver authorization
     * @param resolver Resolver address
     */
    function revokeResolver(address resolver) external onlyOwner {
        authorizedResolvers[resolver] = false;
    }
    
    /**
     * @dev Authorize a factory
     * @param factory Factory address
     */
    function authorizeFactory(address factory) external onlyOwner {
        authorizedFactories[factory] = true;
    }
    
    /**
     * @dev Slash safety deposit for misbehavior
     * @param orderId Order ID
     * @param reason Reason for slashing
     */
    function slashSafetyDeposit(uint256 orderId, string calldata reason) external onlyOwner {
        Order storage order = orders[orderId];
        require(order.sender != address(0), "Order not found");
        require(order.safetyDepositPaid > 0, "No safety deposit");
        
        uint256 slashAmount = order.safetyDepositPaid;
        order.safetyDepositPaid = 0;
        
        // Transfer slashed amount to owner
        payable(owner()).transfer(slashAmount);
        
        // Emit event
        emit SafetyDepositSlashed(orderId, order.resolver, slashAmount, reason);
    }
    
    /**
     * @dev Set factory fee rate
     * @param newFeeRate New fee rate in basis points
     */
    function setFactoryFeeRate(uint256 newFeeRate) external onlyOwner {
        require(newFeeRate <= 1000, "Fee rate too high"); // Max 10%
        factoryFeeRate = newFeeRate;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    /**
     * @dev Get order information
     * @param orderId Order ID
     * @return Order struct
     */
    function getOrder(uint256 orderId) external view returns (Order memory) {
        return orders[orderId];
    }
    
    /**
     * @dev Get order ID by hash lock
     * @param hashLock Hash lock
     * @return Order ID
     */
    function getOrderIdByHashLock(bytes32 hashLock) external view returns (uint256) {
        return hashLockToOrderId[hashLock];
    }
    
    /**
     * @dev Get orders by resolver
     * @param resolver Resolver address
     * @return Array of order IDs
     */
    function getResolverOrders(address resolver) external view returns (uint256[] memory) {
        return resolverOrders[resolver];
    }
    
    /**
     * @dev Get remaining claimable amount
     * @param orderId Order ID
     * @return Remaining amount
     */
    function getRemainingAmount(uint256 orderId) external view returns (uint256) {
        Order storage order = orders[orderId];
        if (order.sender == address(0) || order.status == OrderStatus.Refunded) {
            return 0;
        }
        return order.amount - order.filledAmount;
    }
    
    /**
     * @dev Check if order is active
     * @param orderId Order ID
     * @return Whether order is active
     */
    function isOrderActive(uint256 orderId) external view returns (bool) {
        Order storage order = orders[orderId];
        return order.sender != address(0) && 
               (order.status == OrderStatus.Funded || order.status == OrderStatus.PartiallyFilled) &&
               block.timestamp <= order.timelock;
    }
    
    /**
     * @dev Get cross-chain message
     * @param messageHash Message hash
     * @return CrossChainMessage struct
     */
    function getCrossChainMessage(bytes32 messageHash) external view returns (CrossChainMessage memory) {
        return crossChainMessages[messageHash];
    }
    
    /**
     * @dev Get next order ID
     * @return Next order ID
     */
    function getNextOrderId() external view returns (uint256) {
        return _nextOrderId;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════════════
    // EMERGENCY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    /**
     * @dev Emergency withdrawal function
     * @param token Token address (address(0) for ETH)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            payable(owner()).transfer(amount);
        } else {
            IERC20(token).transfer(owner(), amount);
        }
    }
    
    /**
     * @dev Emergency pause function
     */
    function pause() external onlyOwner {
        // Implementation depends on pausable functionality
        // This would prevent new orders from being created
    }
} 