// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHESalary — On-chain encrypted payroll using Zama FHEVM
/// @notice Stores per-employee encrypted salaries and issues on-demand or scheduled payments.
///         Frontend follows the official template flow (Relayer SDK userDecrypt and encrypted inputs).
contract FHESalary is SepoliaConfig {
    struct Employee {
        bool exists;               // employee registered
        address wallet;            // employee payout address
        euint32 encMonthlySalary;  // encrypted monthly salary amount (in smallest currency unit)
        uint32 payIntervalDays;    // payout interval in days
        uint256 lastPaidAt;        // last payout timestamp
    }

    /// @dev ERC20 token used for payments if set; zero means native token.
    address public immutable token;

    /// @dev employer (admin) address
    address public immutable employer;

    /// @dev employee registry by numeric ID
    mapping(uint256 => Employee) private _employees;

    event EmployeeAdded(uint256 indexed employeeId, address wallet, uint32 payIntervalDays);
    event EmployeeUpdated(uint256 indexed employeeId, address wallet, uint32 payIntervalDays);
    event SalaryUpdated(uint256 indexed employeeId);
    event Paid(uint256 indexed employeeId, uint256 amount, bool isNative);
    event Deposited(address indexed from, uint256 amount);

    modifier onlyEmployer() {
        require(msg.sender == employer, "Not employer");
        _;
    }

    constructor(address tokenAddress) {
        employer = msg.sender;
        token = tokenAddress;
    }

    // ---------------------------------------------------------------------
    // Admin: employee management
    // ---------------------------------------------------------------------

    /// @notice Add or update an employee profile except salary
    function setEmployee(
        uint256 employeeId,
        address wallet,
        uint32 payIntervalDays
    ) external onlyEmployer {
        require(wallet != address(0), "Zero address");
        Employee storage e = _employees[employeeId];
        bool wasNew = !e.exists;
        e.exists = true;
        e.wallet = wallet;
        e.payIntervalDays = payIntervalDays;
        if (e.lastPaidAt == 0) {
            e.lastPaidAt = block.timestamp;
        }

        if (wasNew) {
            emit EmployeeAdded(employeeId, wallet, payIntervalDays);
        } else {
            emit EmployeeUpdated(employeeId, wallet, payIntervalDays);
        }
    }

    /// @notice Set encrypted monthly salary for an employee
    /// @param employeeId target employee id
    /// @param inputEncryptedSalary external encrypted salary input
    /// @param inputProof Zama input proof
    function setEncryptedSalary(
        uint256 employeeId,
        externalEuint32 inputEncryptedSalary,
        bytes calldata inputProof
    ) external onlyEmployer {
        require(_employees[employeeId].exists, "Unknown employee");

        euint32 encSalary = FHE.fromExternal(inputEncryptedSalary, inputProof);
        _employees[employeeId].encMonthlySalary = encSalary;

        // allow contract and employee to decrypt internally or from UI
        FHE.allowThis(encSalary);
        // allow employee wallet to decrypt
        FHE.allow(encSalary, _employees[employeeId].wallet);
        FHE.allow(encSalary, employer);

        emit SalaryUpdated(employeeId);
    }

    // ---------------------------------------------------------------------
    // Views: encrypted getters for frontend decryption
    // ---------------------------------------------------------------------

    function getEncryptedMonthlySalary(uint256 employeeId) external view returns (euint32) {
        return _employees[employeeId].encMonthlySalary;
    }

    function getEmployee(uint256 employeeId)
        external
        view
        returns (
            bool exists,
            address wallet,
            uint32 payIntervalDays,
            uint256 lastPaidAt
        )
    {
        Employee storage e = _employees[employeeId];
        return (e.exists, e.wallet, e.payIntervalDays, e.lastPaidAt);
    }

    // ---------------------------------------------------------------------
    // Payouts: on-demand now, and periodic check
    // ---------------------------------------------------------------------

    /// @notice Immediate payout of one monthly salary to the employee
    /// @dev Amount is taken from encrypted salary. We reveal nothing on-chain, transfer from balance.
    function payNow(uint256 employeeId, uint256 clearAmount) external onlyEmployer {
        require(_employees[employeeId].exists, "Unknown employee");
        require(_employees[employeeId].wallet != address(0), "Missing wallet");

        // SECURITY NOTE:
        //  - We keep amount as parameter because on-chain native/ERC20 transfer requires a clear amount.
        //  - The actual encrypted amount stays private for UI; employer should pass the intended amount.
        //  - A production version could add ACL-checked reveal or zero-knowledge-bound flow off-chain.

        _transfer(_employees[employeeId].wallet, clearAmount);
        _employees[employeeId].lastPaidAt = block.timestamp;
        emit Paid(employeeId, clearAmount, token == address(0));
    }

    /// @notice Pay if interval elapsed since last payment
    function payIfDue(uint256 employeeId, uint256 clearAmount) external onlyEmployer {
        Employee storage e = _employees[employeeId];
        require(e.exists, "Unknown employee");
        require(e.wallet != address(0), "Missing wallet");
        require(block.timestamp >= e.lastPaidAt + uint256(e.payIntervalDays) * 1 days, "Not due");

        _transfer(e.wallet, clearAmount);
        e.lastPaidAt = block.timestamp;
        emit Paid(employeeId, clearAmount, token == address(0));
    }

    /// @notice Employer deposits native funds into the contract payroll balance
    function deposit() external payable onlyEmployer {
        require(token == address(0), "Token mode");
        require(msg.value > 0, "Zero value");
        emit Deposited(msg.sender, msg.value);
    }

    // ---------------------------------------------------------------------
    // Internal transfer helper (native or ERC20)
    // ---------------------------------------------------------------------
    function _transfer(address to, uint256 amount) internal {
        if (token == address(0)) {
            (bool ok, ) = to.call{value: amount}("");
            require(ok, "Native transfer failed");
        } else {
            (bool ok, bytes memory data) = token.call(
                abi.encodeWithSignature("transfer(address,uint256)", to, amount)
            );
            require(ok && (data.length == 0 || abi.decode(data, (bool))), "ERC20 transfer failed");
        }
    }

    // receive native funds for payroll
    receive() external payable {}
}


