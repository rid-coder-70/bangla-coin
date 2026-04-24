// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title FlagRegistry - On-chain fraud flag registry
/// @author Team SUST SONGLAP
contract FlagRegistry {
    // ─── State ────────────────────────────────────────────────────────────────
    struct Flag {
        address reporter;
        string  reason;
        uint256 timestamp;
    }

    mapping(address => Flag[]) private flags;
    mapping(address => mapping(address => bool)) public hasReported;

    uint256 public constant FLAG_THRESHOLD = 3;

    // ─── Events ───────────────────────────────────────────────────────────────
    event AccountFlagged(address indexed flagged, address indexed reporter, string reason);
    event ThresholdReached(address indexed flagged, uint256 count);

    // ─── Functions ────────────────────────────────────────────────────────────

    /// @notice Flag a suspicious account
    /// @param account  Address to flag
    /// @param reason   Human-readable reason string
    function flagAccount(address account, string calldata reason) external {
        require(account != address(0), "Zero address");
        require(account != msg.sender, "Cannot flag yourself");
        require(!hasReported[msg.sender][account], "Already reported this account");
        require(bytes(reason).length > 0, "Reason required");

        hasReported[msg.sender][account] = true;
        flags[account].push(Flag({
            reporter:  msg.sender,
            reason:    reason,
            timestamp: block.timestamp
        }));

        uint256 count = flags[account].length;
        emit AccountFlagged(account, msg.sender, reason);

        if (count == FLAG_THRESHOLD) {
            emit ThresholdReached(account, count);
        }
    }

    /// @notice Get total flag count for an address
    function getFlagCount(address account) external view returns (uint256) {
        return flags[account].length;
    }

    /// @notice Check if an address has reached the fraud threshold
    function isFlagged(address account) external view returns (bool) {
        return flags[account].length >= FLAG_THRESHOLD;
    }

    /// @notice Get all flags for an address
    function getFlags(address account) external view returns (Flag[] memory) {
        return flags[account];
    }
}
