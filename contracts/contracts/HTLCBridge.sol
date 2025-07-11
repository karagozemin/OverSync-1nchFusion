// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title HTLCBridge - Fusion+ Enhanced Cross-Chain Bridge
 * @dev Advanced HTLC implementation with partial fills and order-based system
 * @notice Supports cross-chain token swaps between Ethereum and Stellar with 1inch Fusion+ features
 */
contract HTLCBridge is ReentrancyGuard, Ownable {
    
    /// @dev Gas optimized struct packing (256 bits per slot)
    struct Order {
        address sender;           // 20 bytes
        uint96 amount;           // 12 bytes - max ~7.9 * 10^28 (sufficient for most tokens)
        address token;           // 20 bytes  
        uint96 filledAmount;     // 12 bytes
        uint32 feeRate;          // 4 bytes - basis points (0-10000, i.e., 100 = 1%)
        uint32 timelock;         // 4 bytes - block timestamp (valid until ~2106)
        bytes32 hashLock;        // 32 bytes
        bool partialFillEnabled; // 1 byte
        bool completed;          // 1 byte
        bool refunded;           // 1 byte
        // Total: 3 storage slots (96 bytes)
    }

    /// @dev Order ID counter for unique order generation
    uint256 private _nextOrderId = 1;
    
    /// @dev Mapping from orderId to Order struct
    mapping(uint256 => Order) public orders;
    
    /// @dev Mapping from hash to orderId for reverse lookup
    mapping(bytes32 => uint256) public hashToOrderId;
    
    /// @dev Minimum timelock duration (1 hour)
    uint256 public constant MIN_TIMELOCK = 3600;
    
    /// @dev Maximum timelock duration (7 days)
    uint256 public constant MAX_TIMELOCK = 604800;
    
    /// @dev Maximum fee rate (10% in basis points)
    uint256 public constant MAX_FEE_RATE = 1000;

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Emitted when a new order is created
     * @param orderId Unique identifier for the order
     * @param sender Address that created the order
     * @param token Token address being locked
     * @param amount Total amount locked
     * @param hashLock Hash of the secret for claim verification
     * @param timelock Expiration timestamp
     * @param feeRate Fee rate in basis points
     * @param partialFillEnabled Whether partial fills are allowed
     */
    event OrderCreated(
        uint256 indexed orderId,
        address indexed sender,
        address indexed token,
        uint256 amount,
        bytes32 hashLock,
        uint256 timelock,
        uint256 feeRate,
        bool partialFillEnabled
    );

    /**
     * @dev Emitted when an order is claimed (fully or partially)
     * @param orderId Order identifier
     * @param claimer Address that claimed the order
     * @param amount Amount claimed in this transaction
     * @param totalFilled Total amount filled so far
     * @param preimage Secret revealed for claim
     */
    event OrderClaimed(
        uint256 indexed orderId,
        address indexed claimer,
        uint256 amount,
        uint256 totalFilled,
        bytes32 preimage
    );

    /**
     * @dev Emitted when an order is refunded due to timeout
     * @param orderId Order identifier
     * @param sender Original order creator
     * @param refundAmount Amount refunded (total - filled)
     */
    event OrderRefunded(
        uint256 indexed orderId,
        address indexed sender,
        uint256 refundAmount
    );

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════════════════

    constructor() Ownable(msg.sender) {}

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // EXTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Create a new cross-chain order with HTLC
     * @param token Token contract address to lock
     * @param amount Amount of tokens to lock
     * @param hashLock Hash of the secret (keccak256 of preimage)
     * @param timelock Expiration timestamp (must be future, within limits)
     * @param feeRate Fee rate in basis points (0-1000 = 0-10%)
     * @param partialFillEnabled Whether to allow partial claims
     * @return orderId Unique identifier for the created order
     */
    function createOrder(
        address token,
        uint96 amount,
        bytes32 hashLock,
        uint32 timelock,
        uint32 feeRate,
        bool partialFillEnabled
    ) external nonReentrant returns (uint256 orderId) {
        // Input validation
        require(token != address(0), "Invalid token");
        require(amount > 0, "Amount must be > 0");
        require(hashLock != bytes32(0), "Invalid hash");
        require(timelock > block.timestamp + MIN_TIMELOCK, "Timelock too early");
        require(timelock <= block.timestamp + MAX_TIMELOCK, "Timelock too late");
        require(feeRate <= MAX_FEE_RATE, "Fee rate too high");
        require(hashToOrderId[hashLock] == 0, "Hash already used");

        // Generate unique order ID
        orderId = _nextOrderId++;
        
        // Store hash to order mapping for reverse lookup
        hashToOrderId[hashLock] = orderId;

        // Create order struct (gas optimized)
        orders[orderId] = Order({
            sender: msg.sender,
            amount: amount,
            token: token,
            filledAmount: 0,
            feeRate: feeRate,
            timelock: timelock,
            hashLock: hashLock,
            partialFillEnabled: partialFillEnabled,
            completed: false,
            refunded: false
        });

        // Transfer tokens to contract
        IERC20(token).transferFrom(msg.sender, address(this), amount);

        // Emit event
        emit OrderCreated(
            orderId,
            msg.sender,
            token,
            amount,
            hashLock,
            timelock,
            feeRate,
            partialFillEnabled
        );
    }

    /**
     * @dev Claim an order by revealing the preimage (supports partial fills)
     * @param orderId Order identifier to claim
     * @param preimage Secret that hashes to order.hashLock
     * @param claimAmount Amount to claim (must be <= remaining amount)
     * @param recipient Address to receive the tokens (if address(0), sends to msg.sender)
     */
    function claimOrder(
        uint256 orderId,
        bytes32 preimage,
        uint96 claimAmount,
        address recipient
    ) external nonReentrant {
        Order storage order = orders[orderId];
        
        // Validation
        require(order.sender != address(0), "Order not found");
        require(!order.refunded, "Order refunded");
        require(block.timestamp <= order.timelock, "Order expired");
        require(keccak256(abi.encodePacked(preimage)) == order.hashLock, "Invalid preimage");
        
        // Calculate remaining amount
        uint96 remainingAmount = order.amount - order.filledAmount;
        require(remainingAmount > 0, "Order fully filled");
        require(claimAmount > 0 && claimAmount <= remainingAmount, "Invalid claim amount");
        
        // For non-partial fill orders, must claim the full remaining amount
        if (!order.partialFillEnabled) {
            require(claimAmount == remainingAmount, "Must claim full amount");
        }

        // Update filled amount
        order.filledAmount += claimAmount;
        
        // Mark as completed if fully filled
        if (order.filledAmount == order.amount) {
            order.completed = true;
        }

        // Calculate fee and net amount
        uint256 fee = (uint256(claimAmount) * order.feeRate) / 10000;
        uint256 netAmount = claimAmount - fee;
        
        // Set recipient
        address tokenRecipient = recipient == address(0) ? msg.sender : recipient;
        
        // Transfer tokens
        IERC20(order.token).transfer(tokenRecipient, netAmount);
        
        // Transfer fee to owner (relayer)
        if (fee > 0) {
            IERC20(order.token).transfer(owner(), fee);
        }

        // Emit event
        emit OrderClaimed(orderId, msg.sender, claimAmount, order.filledAmount, preimage);
    }

    /**
     * @dev Refund an expired order (returns unfilled amount to sender)
     * @param orderId Order identifier to refund
     */
    function refundOrder(uint256 orderId) external nonReentrant {
        Order storage order = orders[orderId];
        
        // Validation
        require(order.sender != address(0), "Order not found");
        require(!order.refunded, "Already refunded");
        require(!order.completed, "Order completed");
        require(block.timestamp > order.timelock, "Order not expired");
        
        // Calculate refund amount (unfilled portion)
        uint96 refundAmount = order.amount - order.filledAmount;
        require(refundAmount > 0, "Nothing to refund");
        
        // Mark as refunded
        order.refunded = true;
        
        // Transfer unfilled amount back to sender
        IERC20(order.token).transfer(order.sender, refundAmount);
        
        // Emit event
        emit OrderRefunded(orderId, order.sender, refundAmount);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Get order details by ID
     * @param orderId Order identifier
     * @return order Order struct data
     */
    function getOrder(uint256 orderId) external view returns (Order memory order) {
        return orders[orderId];
    }
    
    /**
     * @dev Get order ID by hash lock
     * @param hashLock Hash lock to lookup
     * @return orderId Associated order ID (0 if not found)
     */
    function getOrderIdByHash(bytes32 hashLock) external view returns (uint256 orderId) {
        return hashToOrderId[hashLock];
    }
    
    /**
     * @dev Get remaining amount available for claim
     * @param orderId Order identifier
     * @return remaining Remaining unclaimed amount
     */
    function getRemainingAmount(uint256 orderId) external view returns (uint96 remaining) {
        Order storage order = orders[orderId];
        if (order.sender == address(0) || order.refunded) return 0;
        return order.amount - order.filledAmount;
    }
    
    /**
     * @dev Check if order is active (not expired, not fully filled, not refunded)
     * @param orderId Order identifier
     * @return isActive Whether the order is active
     */
    function isOrderActive(uint256 orderId) external view returns (bool isActive) {
        Order storage order = orders[orderId];
        return order.sender != address(0) && 
               !order.refunded && 
               !order.completed &&
               block.timestamp <= order.timelock;
    }

    /**
     * @dev Get the current order counter
     * @return nextId Next order ID that will be assigned
     */
    function getNextOrderId() external view returns (uint256 nextId) {
        return _nextOrderId;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Emergency function to recover stuck tokens (only owner)
     * @param token Token address to recover
     * @param amount Amount to recover
     * @param recipient Address to send recovered tokens
     */
    function emergencyRecoverTokens(
        address token,
        uint256 amount,
        address recipient
    ) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        IERC20(token).transfer(recipient, amount);
    }
} 