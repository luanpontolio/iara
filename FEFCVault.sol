// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl}      from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard}    from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";
import {IERC20}             from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20}          from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// ─────────────────────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────────────────────

/// @notice Estratégia plugável de cálculo de risco
/// @dev Inspirado no padrão de Strategy do Gitcoin Allo v2.
///      Permite trocar a lógica de scoring sem redeployar a vault.
interface IRiskStrategy {
    function calculateScore(bytes32 partyId)
        external view
        returns (uint8 score, string[] memory flags);

    function calculateAmount(bytes32 partyId, uint256 totalFEFC, uint8 score)
        external pure
        returns (uint256 amount);
}

interface IPartyRegistry {
    struct PartyHistory {
        bytes32  id;
        string   sigla;
        string   nome;
        uint8    contasAprovadas;
        uint8    contasReprovadas;
        bool     condenacaoTCU;
        bool     prestacaoPendente;
        uint256  valorIrregular;
        uint256  fefcAlocado;
        address  walletAddress;
    }
    function getPartyHistory(bytes32 id) external view returns (PartyHistory memory);
}

// ─────────────────────────────────────────────────────────────
// FEFCVault
// ─────────────────────────────────────────────────────────────

/// @title FEFCVault
/// @notice Vault do FEFC on-chain com OZ TimelockController + AccessControl
///
/// @dev Flow completo:
///
///   Agent → proposeDistribution()
///     → IRiskStrategy.calculateScore()          [plugável]
///     → TimelockController.schedule()           [OZ — agenda com delay]
///     → Emite ProposalCreated com zeroGRef      [0G Storage]
///
///   Multisig → approveProposal()
///     → status = Approved, timelock corre
///
///   Multisig → rejectProposal()
///     → TimelockController.cancel()             [OZ — bloqueia execução]
///     → Emite ProposalRejected com zeroGRef     [0G Storage]
///
///   Qualquer um → executeAfterTimelock()
///     → TimelockController.execute()            [OZ — executa após delay]
///     → _transferToParty()                      [REAL → partido]
///     → Emite ProposalExecuted com zeroGRef     [0G Storage]
///
/// OZ utilizado:
///   TimelockController — delay obrigatório, cancel(), isOperationReady()
///   AccessControl      — AGENT_ROLE + MULTISIG_ROLE (rotacionáveis sem redeploy)
///   SafeERC20          — transferência segura do REAL
///   ReentrancyGuard    — proteção na execução
///
/// Gitcoin Allo v2 (conceito):
///   IRiskStrategy — scoring plugável via setRiskStrategy()

contract FEFCVault is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Roles ───────────────────────────────────────────────
    bytes32 public constant AGENT_ROLE    = keccak256("AGENT_ROLE");
    bytes32 public constant MULTISIG_ROLE = keccak256("MULTISIG_ROLE");

    // ─── Errors ──────────────────────────────────────────────
    error ProposalNotFound();
    error ProposalAlreadyActive();
    error ProposalNotPending();
    error ProposalNotApproved();
    error InsufficientVaultBalance();
    error InvalidAmount();
    error TimelockNotReady();
    error OnlyTimelockCanTransfer();

    // ─── Events ──────────────────────────────────────────────
    event ProposalCreated(
        bytes32 indexed proposalId,
        bytes32 indexed partyId,
        address         recipient,
        uint256         amount,
        uint8           riskScore,
        string[]        flags,
        string          zeroGRef
    );

    event ProposalApproved(
        bytes32 indexed proposalId,
        bytes32 indexed partyId,
        uint256         timelockExpiry
    );

    event ProposalRejected(
        bytes32 indexed proposalId,
        bytes32 indexed partyId,
        string          reason,
        string          zeroGRef
    );

    event ProposalExecuted(
        bytes32 indexed proposalId,
        bytes32 indexed partyId,
        address indexed recipient,
        uint256         amount,
        string          zeroGRef
    );

    event RiskStrategyUpdated(
        address indexed oldStrategy,
        address indexed newStrategy
    );

    // ─── Structs ─────────────────────────────────────────────
    enum ProposalStatus { Pending, Approved, Executed, Rejected }

    struct Proposal {
        bytes32        partyId;
        address        recipient;
        uint256        amount;
        uint8          riskScore;
        string[]       flags;
        ProposalStatus status;
        uint256        proposedAt;
        uint256        timelockExpiry;
        bytes32        timelockOpId;        // ID da op no OZ TimelockController
        string         zeroGRef;            // rootHash 0G — proposal record
        string         executionZeroGRef;   // rootHash 0G — execution record
        string         rejectionReason;
    }

    // ─── State ───────────────────────────────────────────────
    IERC20             public immutable real;
    TimelockController public immutable timelock;
    IPartyRegistry     public immutable registry;
    IRiskStrategy      public           riskStrategy;   // plugável

    mapping(bytes32 => Proposal) public proposals;
    mapping(bytes32 => bytes32)  public activeProposal; // partyId → proposalId
    bytes32[]                    public proposalIds;

    // ─────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────

    constructor(
        address _real,
        address _timelock,
        address _registry,
        address _riskStrategy,
        address _agent,
        address _multisig
    ) {
        real         = IERC20(_real);
        timelock     = TimelockController(payable(_timelock));
        registry     = IPartyRegistry(_registry);
        riskStrategy = IRiskStrategy(_riskStrategy);

        // AccessControl: multisig é o DEFAULT_ADMIN — pode rotacionar agent
        _grantRole(DEFAULT_ADMIN_ROLE, _multisig);
        _grantRole(MULTISIG_ROLE,      _multisig);
        _grantRole(AGENT_ROLE,         _agent);
    }

    // ─────────────────────────────────────────────
    // AGENT — proposeDistribution()
    // Chamado via KeeperHub para execução garantida
    // ─────────────────────────────────────────────

    /// @notice Agent propõe distribuição de FEFC para um partido
    /// @dev Calcula score via IRiskStrategy, agenda no TimelockController,
    ///      registra proposta localmente com rootHash do 0G Storage.
    function proposeDistribution(
        bytes32         partyId,
        string calldata zeroGRef
    )
        external
        onlyRole(AGENT_ROLE)
    {
        // Garante uma proposta ativa por partido
        {
            bytes32 ex = activeProposal[partyId];
            if (ex != bytes32(0)) {
                ProposalStatus s = proposals[ex].status;
                if (s == ProposalStatus.Pending || s == ProposalStatus.Approved)
                    revert ProposalAlreadyActive();
            }
        }

        // Dados do partido
        IPartyRegistry.PartyHistory memory party = registry.getPartyHistory(partyId);

        // Score via strategy plugável
        (uint8 score, string[] memory flags) = riskStrategy.calculateScore(partyId);
        uint256 amount = riskStrategy.calculateAmount(partyId, party.fefcAlocado, score);

        if (amount == 0)                                  revert InvalidAmount();
        if (real.balanceOf(address(this)) < amount)       revert InsufficientVaultBalance();

        // ── Agenda no OZ TimelockController ──
        // Salt único por partido — evita colisões entre propostas do mesmo partido
        bytes32 salt = keccak256(abi.encode(partyId, block.timestamp));

        bytes memory data = abi.encodeCall(
            this._transferToParty,
            (partyId, party.walletAddress, amount, zeroGRef)
        );

        bytes32 timelockOpId = timelock.hashOperation(
            address(this), 0, data, bytes32(0), salt
        );

        timelock.schedule(
            address(this), 0, data,
            bytes32(0), salt,
            timelock.getMinDelay()
        );

        // ── Registra proposta localmente ──
        bytes32 proposalId = keccak256(
            abi.encodePacked(partyId, block.timestamp, block.prevrandao)
        );

        proposals[proposalId] = Proposal({
            partyId:            partyId,
            recipient:          party.walletAddress,
            amount:             amount,
            riskScore:          score,
            flags:              flags,
            status:             ProposalStatus.Pending,
            proposedAt:         block.timestamp,
            timelockExpiry:     block.timestamp + timelock.getMinDelay(),
            timelockOpId:       timelockOpId,
            zeroGRef:           zeroGRef,
            executionZeroGRef:  "",
            rejectionReason:    ""
        });

        activeProposal[partyId] = proposalId;
        proposalIds.push(proposalId);

        emit ProposalCreated(
            proposalId, partyId, party.walletAddress,
            amount, score, flags, zeroGRef
        );
    }

    // ─────────────────────────────────────────────
    // AGENT — executeAfterTimelock()
    // Chamado via KeeperHub após timelock expirar
    // ─────────────────────────────────────────────

    /// @notice Executa a transferência após aprovação + timelock expirado
    /// @dev Qualquer endereço pode chamar. O TimelockController valida o delay.
    ///      Em produção: agent chama via KeeperHub (job agendado).
    function executeAfterTimelock(
        bytes32         proposalId,
        string calldata executionZeroGRef
    )
        external
        nonReentrant
    {
        Proposal storage p = proposals[proposalId];

        if (p.proposedAt == 0)                           revert ProposalNotFound();
        if (p.status != ProposalStatus.Approved)         revert ProposalNotApproved();
        if (!timelock.isOperationReady(p.timelockOpId))  revert TimelockNotReady();

        // Armazena o execution zeroGRef antes da execução
        p.executionZeroGRef = executionZeroGRef;

        bytes32 salt = keccak256(abi.encode(p.partyId, p.proposedAt));

        bytes memory data = abi.encodeCall(
            this._transferToParty,
            (p.partyId, p.recipient, p.amount, executionZeroGRef)
        );

        // TimelockController executa → chama _transferToParty()
        timelock.execute(address(this), 0, data, bytes32(0), salt);
    }

    /// @notice Callback do TimelockController — executa a transferência real
    /// @dev Só pode ser chamado pelo TimelockController — nunca diretamente
    function _transferToParty(
        bytes32         partyId,
        address         recipient,
        uint256         amount,
        string calldata executionZeroGRef
    )
        external
        nonReentrant
    {
        if (msg.sender != address(timelock)) revert OnlyTimelockCanTransfer();

        bytes32 proposalId = activeProposal[partyId];
        Proposal storage p = proposals[proposalId];

        p.status              = ProposalStatus.Executed;
        p.executionZeroGRef   = executionZeroGRef;
        activeProposal[partyId] = bytes32(0);

        real.safeTransfer(recipient, amount);

        emit ProposalExecuted(proposalId, partyId, recipient, amount, executionZeroGRef);
    }

    // ─────────────────────────────────────────────
    // MULTISIG — approve / reject
    // ─────────────────────────────────────────────

    /// @notice Multisig aprova proposta — status muda para Approved
    /// @dev O delay do TimelockController já está correndo desde proposeDistribution().
    ///      Esta função apenas atualiza o status local e emite o evento.
    function approveProposal(bytes32 proposalId)
        external
        onlyRole(MULTISIG_ROLE)
    {
        Proposal storage p = proposals[proposalId];
        if (p.proposedAt == 0)                  revert ProposalNotFound();
        if (p.status != ProposalStatus.Pending) revert ProposalNotPending();

        p.status = ProposalStatus.Approved;

        emit ProposalApproved(proposalId, p.partyId, p.timelockExpiry);
    }

    /// @notice Multisig rejeita proposta — cancela no TimelockController
    /// @dev Após cancel(), o TimelockController não executará a operação.
    ///      O motivo e o zeroGRef ficam registrados on-chain permanentemente.
    function rejectProposal(
        bytes32         proposalId,
        string calldata reason,
        string calldata zeroGRef
    )
        external
        onlyRole(MULTISIG_ROLE)
    {
        Proposal storage p = proposals[proposalId];
        if (p.proposedAt == 0)                  revert ProposalNotFound();
        if (p.status != ProposalStatus.Pending) revert ProposalNotPending();

        // OZ TimelockController.cancel() — bloqueia execução permanentemente
        timelock.cancel(p.timelockOpId);

        p.status           = ProposalStatus.Rejected;
        p.rejectionReason  = reason;
        activeProposal[p.partyId] = bytes32(0);

        emit ProposalRejected(proposalId, p.partyId, reason, zeroGRef);
    }

    // ─────────────────────────────────────────────
    // ADMIN — setRiskStrategy()
    // ─────────────────────────────────────────────

    /// @notice Atualiza a estratégia de risco sem redeployar a vault
    /// @dev Padrão inspirado no Gitcoin Allo v2 (strategies plugáveis).
    ///      Apenas o MULTISIG_ROLE pode atualizar.
    function setRiskStrategy(address newStrategy)
        external
        onlyRole(MULTISIG_ROLE)
    {
        address old = address(riskStrategy);
        riskStrategy = IRiskStrategy(newStrategy);
        emit RiskStrategyUpdated(old, newStrategy);
    }

    // ─────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────

    function getReadyToExecute() external view returns (bytes32[] memory) {
        bytes32[] memory ready = new bytes32[](proposalIds.length);
        uint256 count = 0;

        for (uint256 i = 0; i < proposalIds.length; i++) {
            bytes32 id = proposalIds[i];
            Proposal storage p = proposals[id];
            if (
                p.status == ProposalStatus.Approved &&
                timelock.isOperationReady(p.timelockOpId)
            ) {
                ready[count++] = id;
            }
        }

        bytes32[] memory result = new bytes32[](count);
        for (uint256 i = 0; i < count; i++) result[i] = ready[i];
        return result;
    }

    function getAllProposals()  external view returns (bytes32[] memory) { return proposalIds; }
    function getProposal(bytes32 id) external view returns (Proposal memory) { return proposals[id]; }
    function vaultBalance()    external view returns (uint256) { return real.balanceOf(address(this)); }

    function timelockState(bytes32 proposalId)
        external view
        returns (TimelockController.OperationState)
    {
        Proposal storage p = proposals[proposalId];
        if (p.proposedAt == 0) revert ProposalNotFound();
        return timelock.getOperationState(p.timelockOpId);
    }

    function timelockRemaining(bytes32 proposalId) external view returns (uint256) {
        Proposal storage p = proposals[proposalId];
        if (p.timelockExpiry == 0 || block.timestamp >= p.timelockExpiry) return 0;
        return p.timelockExpiry - block.timestamp;
    }
}

// ─────────────────────────────────────────────────────────────
// RiskStrategyMock
// Implementação do IRiskStrategy para o demo.
// Substitua por RiskStrategyTSE em produção.
// ─────────────────────────────────────────────────────────────

/// @notice Estratégia de risco mock — lê histórico do PartyRegistry
/// @dev Deploy separado. Atualizar via FEFCVault.setRiskStrategy()
///      sem redeployar a vault.
contract RiskStrategyMock is IRiskStrategy {
    IPartyRegistry public immutable registry;

    constructor(address _registry) {
        registry = IPartyRegistry(_registry);
    }

    function calculateScore(bytes32 partyId)
        external view override
        returns (uint8 score, string[] memory flags)
    {
        IPartyRegistry.PartyHistory memory p = registry.getPartyHistory(partyId);

        uint256 raw    = 100;
        string[4] memory f;
        uint8 count = 0;

        if (p.condenacaoTCU) {
            raw = raw >= 40 ? raw - 40 : 0;
            f[count++] = "Condenacao ativa no TCU";
        }

        if (p.prestacaoPendente) {
            raw = raw >= 30 ? raw - 30 : 0;
            f[count++] = "Prestacao de contas pendente";
        }

        uint256 total = p.contasAprovadas + p.contasReprovadas;
        if (total > 0 && p.contasReprovadas > 0) {
            uint256 pen = (p.contasReprovadas * 25) / total;
            raw = raw >= pen ? raw - pen : 0;
            f[count++] = "Prestacoes reprovadas no historico";
        }

        if (p.valorIrregular > 0) {
            raw = raw >= 10 ? raw - 10 : 0;
            f[count++] = "Irregularidades financeiras registradas";
        }

        // Sem flags = limpo
        if (count == 0) {
            flags = new string[](1);
            flags[0] = "Sem irregularidades registradas";
        } else {
            flags = new string[](count);
            for (uint8 i = 0; i < count; i++) flags[i] = f[i];
        }

        score = uint8(raw > 100 ? 100 : raw);
    }

    function calculateAmount(
        bytes32, /* partyId */
        uint256 totalFEFC,
        uint8   score
    )
        external pure override
        returns (uint256)
    {
        return (totalFEFC * score) / 100;
    }
}
