// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title DAO - Community wallet with majority-vote spending
/// @author Team SUST SONGLAP
contract DAO {
    // ─── State ────────────────────────────────────────────────────────────────
    struct Proposal {
        address proposer;
        address recipient;
        uint256 amount;
        uint256 yesVotes;
        uint256 noVotes;
        uint256 totalMembers;
        bool    executed;
        string  description;
    }

    address public owner;
    uint256 public memberCount;
    uint256 public treasury;
    uint256 public proposalCount;

    mapping(address => bool) public members;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public voted;

    // ─── Events ───────────────────────────────────────────────────────────────
    event MemberAdded(address indexed member);
    event MemberRemoved(address indexed member);
    event ProposalCreated(uint256 indexed id, address proposer, address recipient, uint256 amount);
    event Voted(uint256 indexed id, address voter, bool approve);
    event ProposalExecuted(uint256 indexed id, address recipient, uint256 amount);
    event TreasuryDeposit(uint256 amount);

    // ─── Modifiers ────────────────────────────────────────────────────────────
    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }
    modifier onlyMember() { require(members[msg.sender], "Not a member"); _; }

    constructor() {
        owner = msg.sender;
        members[msg.sender] = true;
        memberCount = 1;
    }

    // ─── Functions ────────────────────────────────────────────────────────────

    /// @notice Add a new DAO member
    function addMember(address member) external onlyOwner {
        require(member != address(0), "Zero address");
        require(!members[member], "Already member");
        members[member] = true;
        memberCount++;
        emit MemberAdded(member);
    }

    /// @notice Remove an existing DAO member
    function removeMember(address member) external onlyOwner {
        require(members[member], "Not a member");
        require(memberCount > 1, "Cannot remove last member");
        members[member] = false;
        memberCount--;
        emit MemberRemoved(member);
    }

    /// @notice Deposit funds into the DAO treasury
    function depositTreasury(uint256 amount) external onlyOwner {
        treasury += amount;
        emit TreasuryDeposit(amount);
    }

    /// @notice Propose a spend from the treasury
    function propose(address to, uint256 amount, string calldata description) external onlyMember returns (uint256) {
        require(to != address(0), "Zero address");
        require(amount > 0, "Amount must be > 0");
        require(amount <= treasury, "Exceeds treasury");

        uint256 id = proposalCount++;
        proposals[id] = Proposal({
            proposer:     msg.sender,
            recipient:    to,
            amount:       amount,
            yesVotes:     0,
            noVotes:      0,
            totalMembers: memberCount,
            executed:     false,
            description:  description
        });

        emit ProposalCreated(id, msg.sender, to, amount);
        return id;
    }

    /// @notice Vote on a proposal; auto-executes on majority
    function vote(uint256 id, bool approve) external onlyMember {
        require(id < proposalCount, "Invalid proposal");
        Proposal storage p = proposals[id];
        require(!p.executed, "Already executed");
        require(!voted[id][msg.sender], "Already voted");

        voted[id][msg.sender] = true;
        if (approve) {
            p.yesVotes++;
        } else {
            p.noVotes++;
        }

        emit Voted(id, msg.sender, approve);

        // Auto-execute when strict majority reached
        if (!p.executed && p.yesVotes * 2 > p.totalMembers) {
            require(treasury >= p.amount, "Treasury depleted");
            p.executed = true;
            treasury -= p.amount;
            emit ProposalExecuted(id, p.recipient, p.amount);
        }
    }

    /// @notice Check if address has voted on a proposal
    function hasVoted(uint256 id, address member) external view returns (bool) {
        return voted[id][member];
    }
}
