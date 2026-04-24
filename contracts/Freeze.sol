// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title Freeze - Emergency wallet freeze contract
/// @author Team SUST SONGLAP
contract Freeze {
    // ─── State ────────────────────────────────────────────────────────────────
    mapping(address => bool)    public frozen;
    mapping(address => uint256) public frozenAt;

    address public owner;

    // ─── Events ───────────────────────────────────────────────────────────────
    event WalletFrozen(address indexed wallet, uint256 timestamp);
    event WalletUnfrozen(address indexed wallet, uint256 timestamp);

    // ─── Modifiers ────────────────────────────────────────────────────────────
    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }

    constructor() {
        owner = msg.sender;
    }

    // ─── Functions ────────────────────────────────────────────────────────────

    /// @notice Freeze a wallet (owner or self)
    /// @param wallet Address to freeze
    function freeze(address wallet) external {
        require(wallet != address(0), "Zero address");
        require(msg.sender == wallet || msg.sender == owner, "Not authorised");
        require(!frozen[wallet], "Already frozen");

        frozen[wallet] = true;
        frozenAt[wallet] = block.timestamp;
        emit WalletFrozen(wallet, block.timestamp);
    }

    /// @notice Unfreeze a wallet (owner or self with PIN verified off-chain)
    /// @param wallet Address to unfreeze
    function unfreeze(address wallet) external {
        require(wallet != address(0), "Zero address");
        require(msg.sender == wallet || msg.sender == owner, "Not authorised");
        require(frozen[wallet], "Not frozen");

        frozen[wallet] = false;
        emit WalletUnfrozen(wallet, block.timestamp);
    }

    /// @notice Check if a wallet is currently frozen
    function isFrozen(address wallet) external view returns (bool) {
        return frozen[wallet];
    }

    /// @notice Get when wallet was frozen (0 if never frozen)
    function frozenSince(address wallet) external view returns (uint256) {
        return frozenAt[wallet];
    }
}
