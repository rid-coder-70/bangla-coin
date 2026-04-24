// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title Transfer - Core BDT transfer contract with friction timer
/// @author Team SUST SONGLAP
/// @notice Implements friction-first money transfers with mandatory delays
contract Transfer {
    // ─── State ────────────────────────────────────────────────────────────────
    struct PendingTx {
        address sender;
        address recipient;
        uint256 amount;
        uint256 unlockTime;
        bool    executed;
        bool    cancelled;
    }

    mapping(uint256 => PendingTx) public pendingTxs;
    mapping(address => uint256)   public balances;

    address public owner;
    uint256 public txCounter;
    uint256 public constant MAX_DELAY = 180; // 3 minutes hard cap

    // ─── Events ───────────────────────────────────────────────────────────────
    event TransferQueued(uint256 indexed txId, address indexed from, address indexed to, uint256 amount, uint256 unlockTime);
    event TransferExecuted(uint256 indexed txId);
    event TransferCancelled(uint256 indexed txId);
    event Deposited(address indexed user, uint256 amount);

    // ─── Modifiers ────────────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // ─── Functions ────────────────────────────────────────────────────────────

    /// @notice Deposit BDT-equivalent coins into a user's balance (agent/admin only)
    /// @param user  Recipient of the minted balance
    /// @param amount Amount to credit (in smallest BDT unit)
    function deposit(address user, uint256 amount) external onlyOwner {
        require(user != address(0), "Zero address");
        require(amount > 0, "Amount must be > 0");
        balances[user] += amount;
        emit Deposited(user, amount);
    }

    /// @notice Queue a transfer with a friction delay
    /// @param to        Recipient address
    /// @param amount    Amount to send (BDT units)
    /// @param riskDelay Delay in seconds returned by the off-chain risk engine
    function sendWithDelay(address to, uint256 amount, uint256 riskDelay) external {
        require(to != address(0), "Zero address recipient");
        require(to != msg.sender, "Cannot send to self");
        require(amount > 0, "Amount must be > 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");

        uint256 delay = riskDelay > MAX_DELAY ? MAX_DELAY : riskDelay;
        balances[msg.sender] -= amount;

        pendingTxs[txCounter] = PendingTx({
            sender:     msg.sender,
            recipient:  to,
            amount:     amount,
            unlockTime: block.timestamp + delay,
            executed:   false,
            cancelled:  false
        });

        emit TransferQueued(txCounter, msg.sender, to, amount, block.timestamp + delay);
        txCounter++;
    }

    /// @notice Execute a queued transfer once the delay has elapsed
    /// @param txId  The transaction ID to execute
    function confirmTransfer(uint256 txId) external {
        PendingTx storage pending = pendingTxs[txId];
        require(pending.sender != address(0), "Tx does not exist");
        require(block.timestamp >= pending.unlockTime, "Still in delay window");
        require(!pending.executed && !pending.cancelled, "Already settled");

        pending.executed = true;
        balances[pending.recipient] += pending.amount;
        emit TransferExecuted(txId);
    }

    /// @notice Cancel a pending transfer and refund the sender
    /// @param txId  The transaction ID to cancel
    function cancelPending(uint256 txId) external {
        PendingTx storage pending = pendingTxs[txId];
        require(pending.sender == msg.sender, "Not sender");
        require(!pending.executed && !pending.cancelled, "Already settled");

        pending.cancelled = true;
        balances[msg.sender] += pending.amount;
        emit TransferCancelled(txId);
    }

    /// @notice Get full details of a pending transaction
    function getTx(uint256 txId) external view returns (
        address sender, address recipient, uint256 amount,
        uint256 unlockTime, bool executed, bool cancelled
    ) {
        PendingTx storage t = pendingTxs[txId];
        return (t.sender, t.recipient, t.amount, t.unlockTime, t.executed, t.cancelled);
    }
}
