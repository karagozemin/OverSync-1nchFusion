// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title HTLCBridge
 * @dev Hash Time Lock Contract for cross-chain token swaps between Ethereum and Stellar
 */
contract HTLCBridge is ReentrancyGuard, Ownable {
    struct Swap {
        address initiator;
        address token;
        uint256 amount;
        bytes32 hashLock;
        uint256 timelock;
        bool completed;
        bool refunded;
    }

    mapping(bytes32 => Swap) public swaps;
    
    event SwapInitiated(
        bytes32 indexed swapId,
        address indexed initiator,
        address indexed token,
        uint256 amount,
        bytes32 hashLock,
        uint256 timelock
    );
    
    event SwapCompleted(bytes32 indexed swapId, bytes32 preimage);
    event SwapRefunded(bytes32 indexed swapId);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Initiate a new swap
     */
    function initiateSwap(
        bytes32 _swapId,
        address _token,
        uint256 _amount,
        bytes32 _hashLock,
        uint256 _timelock
    ) external nonReentrant {
        require(swaps[_swapId].initiator == address(0), "Swap already exists");
        require(_timelock > block.timestamp, "Invalid timelock");
        require(_amount > 0, "Amount must be greater than 0");

        IERC20(_token).transferFrom(msg.sender, address(this), _amount);

        swaps[_swapId] = Swap({
            initiator: msg.sender,
            token: _token,
            amount: _amount,
            hashLock: _hashLock,
            timelock: _timelock,
            completed: false,
            refunded: false
        });

        emit SwapInitiated(_swapId, msg.sender, _token, _amount, _hashLock, _timelock);
    }

    /**
     * @dev Complete a swap by revealing the preimage
     */
    function completeSwap(bytes32 _swapId, bytes32 _preimage) external nonReentrant {
        Swap storage swap = swaps[_swapId];
        require(swap.initiator != address(0), "Swap does not exist");
        require(!swap.completed, "Swap already completed");
        require(!swap.refunded, "Swap already refunded");
        require(block.timestamp <= swap.timelock, "Swap expired");
        require(keccak256(abi.encodePacked(_preimage)) == swap.hashLock, "Invalid preimage");

        swap.completed = true;
        
        // In a real implementation, this would be sent to the counterparty
        // For now, we'll send to the contract owner (relayer)
        IERC20(swap.token).transfer(owner(), swap.amount);

        emit SwapCompleted(_swapId, _preimage);
    }

    /**
     * @dev Refund a swap after timelock expires
     */
    function refundSwap(bytes32 _swapId) external nonReentrant {
        Swap storage swap = swaps[_swapId];
        require(swap.initiator != address(0), "Swap does not exist");
        require(!swap.completed, "Swap already completed");
        require(!swap.refunded, "Swap already refunded");
        require(block.timestamp > swap.timelock, "Swap not expired");

        swap.refunded = true;
        IERC20(swap.token).transfer(swap.initiator, swap.amount);

        emit SwapRefunded(_swapId);
    }

    /**
     * @dev Get swap details
     */
    function getSwap(bytes32 _swapId) external view returns (Swap memory) {
        return swaps[_swapId];
    }
} 