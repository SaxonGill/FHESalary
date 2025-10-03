"use client";

import { ethers } from "ethers";
import { useMemo, useState } from "react";
import { useFhevm } from "../fhevm/useFhevm";
import { useMetaMaskEthersSigner, MetaMaskEthersSignerProvider } from "../hooks/metamask/useMetaMaskEthersSigner";
import { useFHESalary } from "../hooks/useFHESalary";

type PageType = 'deposit' | 'employees' | 'add-employee' | 'set-salary' | 'decrypt-salary' | 'pay-now' | 'pay-scheduled' | 'status' | 'help';

interface SidebarItemProps {
  icon: string;
  text: string;
  page: PageType;
  currentPage: PageType;
  onClick: (page: PageType) => void;
}

function SidebarItem({ icon, text, page, currentPage, onClick }: SidebarItemProps) {
  return (
    <button
      className={`sidebar-item ${currentPage === page ? 'active' : ''}`}
      onClick={() => onClick(page)}
    >
      <span className="sidebar-item-icon">{icon}</span>
      <span className="sidebar-item-text">{text}</span>
    </button>
  );
}

function AppContent() {
  const { provider, chainId, ethersSigner, ethersReadonlyProvider, isConnected, connect, sameChain, sameSigner, initialMockChains } = useMetaMaskEthersSigner();
  const { instance } = useFhevm({ provider, chainId, initialMockChains, enabled: true });
  const salary = useFHESalary({ instance, chainId, ethersSigner, ethersReadonlyProvider, sameChain, sameSigner });
  const [currentPage, setCurrentPage] = useState<PageType>('help');
  const [depositInput, setDepositInput] = useState<string>("");

  if (!isConnected) {
    return (
      <div className="app-container">
        <div className="connect-container">
          <div className="connect-card">
            <div className="connect-icon">🔐</div>
            <h2>Welcome to FHE Salary</h2>
            <p>Connect your MetaMask wallet to manage encrypted salary payments securely</p>
            <button className="button button-primary" onClick={connect}>
              Connect MetaMask
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">💰</div>
            <div className="logo-text">FHE Salary Management</div>
          </div>
          <div className="header-info">
            <div className="contract-badge">
              {salary.contractAddress ? `Contract: ${salary.contractAddress.slice(0, 6)}...${salary.contractAddress.slice(-4)}` : "Contract: Not deployed"}
            </div>
            <div className="balance-badge">
              Balance: {salary.contractBalance} ETH
        </div>
          </div>
        </div>
      </header>

      <div className="layout-with-sidebar">
        <aside className="sidebar">
          <nav className="sidebar-nav">
            <SidebarItem icon="ℹ️" text="Help" page="help" currentPage={currentPage} onClick={setCurrentPage} />
            <SidebarItem icon="💵" text="Deposit Funds" page="deposit" currentPage={currentPage} onClick={setCurrentPage} />
            <SidebarItem icon="👥" text="Employees" page="employees" currentPage={currentPage} onClick={setCurrentPage} />
            <SidebarItem icon="➕" text="Add Employee" page="add-employee" currentPage={currentPage} onClick={setCurrentPage} />
            <SidebarItem icon="🔒" text="Set Salary" page="set-salary" currentPage={currentPage} onClick={setCurrentPage} />
            <SidebarItem icon="🔓" text="Decrypt Salary" page="decrypt-salary" currentPage={currentPage} onClick={setCurrentPage} />
            <SidebarItem icon="💸" text="Immediate Payment" page="pay-now" currentPage={currentPage} onClick={setCurrentPage} />
            <SidebarItem icon="⏰" text="Scheduled Payment" page="pay-scheduled" currentPage={currentPage} onClick={setCurrentPage} />
            <SidebarItem icon="📊" text="Status" page="status" currentPage={currentPage} onClick={setCurrentPage} />
          </nav>
        </aside>

        <main className="main-content">
          {currentPage === 'help' && (
            <div className="page-container">
              <div className="page-header">
                <div className="page-icon">ℹ️</div>
                <h1 className="page-title">Help & Permissions</h1>
              </div>
              <div className="page-body">
                <div className="help-section">
                  <h2 className="help-section-title">🔐 Functions Requiring Deployer Wallet</h2>
                  <p className="help-description">
                    The following functions can only be executed by the contract deployer (owner). 
                    You must connect with the deployer's wallet to access these features:
                  </p>
                  <ul className="help-list">
                    <li className="help-item">
                      <span className="help-icon">💵</span>
                      <div>
                        <strong>Deposit Funds</strong>
                        <p>Add ETH to the contract balance for salary payments</p>
                      </div>
                    </li>
                    <li className="help-item">
                      <span className="help-icon">➕</span>
                      <div>
                        <strong>Add/Update Employee</strong>
                        <p>Register new employees or update existing employee information</p>
                      </div>
                    </li>
                    <li className="help-item">
                      <span className="help-icon">🔒</span>
                      <div>
                        <strong>Set Encrypted Salary</strong>
                        <p>Set or modify an employee's monthly salary (encrypted on-chain)</p>
                      </div>
                    </li>
                    <li className="help-item">
                      <span className="help-icon">💸</span>
                      <div>
                        <strong>Immediate Payment</strong>
                        <p>Process an instant payment to an employee</p>
                      </div>
                    </li>
                    <li className="help-item">
                      <span className="help-icon">⏰</span>
        <div>
                        <strong>Scheduled Payment</strong>
                        <p>Process payment only if the payment interval has elapsed</p>
                      </div>
                    </li>
                  </ul>
        </div>

                <div className="help-section">
                  <h2 className="help-section-title">👁️ Public & Authorized Functions</h2>
                  <p className="help-description">
                    The following functions can be accessed by authorized addresses (not limited to deployer):
                  </p>
                  <ul className="help-list">
                    <li className="help-item">
                      <span className="help-icon">👥</span>
                      <div>
                        <strong>View Employees</strong>
                        <p>Anyone can view the list of registered employees and their basic information</p>
                      </div>
                    </li>
                    <li className="help-item">
                      <span className="help-icon">🔓</span>
        <div>
                        <strong>Decrypt Salary</strong>
                        <p>Authorized addresses can decrypt salary information (requires permission from the contract owner)</p>
                      </div>
                    </li>
                  </ul>
        </div>

                <div className="help-section">
                  <h2 className="help-section-title">🛡️ Security Features</h2>
                  <ul className="help-list">
                    <li className="help-item">
                      <span className="help-icon">🔒</span>
                      <div>
                        <strong>Fully Homomorphic Encryption (FHE)</strong>
                        <p>All salary data is encrypted using FHE technology, ensuring complete privacy on the blockchain</p>
                      </div>
                    </li>
                    <li className="help-item">
                      <span className="help-icon">🔑</span>
        <div>
                        <strong>Access Control</strong>
                        <p>Only the contract owner can manage employees and process payments</p>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {currentPage === 'deposit' && (
            <div className="page-container">
              <div className="page-header">
                <div className="page-icon">💵</div>
                <h1 className="page-title">Deposit Funds</h1>
              </div>
              <div className="page-body">
                <div className="form-group">
                  <label className="form-label">Amount (ETH)</label>
                  <input 
                    className="input"
                    placeholder="Enter amount in ETH" 
                    type="text"
                    inputMode="decimal"
                    value={depositInput}
                    onChange={(e) => {
                      const v = e.target.value;
                      // allow only digits and a single dot
                      if (/^\d*(?:\.|\d+)?\d*$/.test(v)) {
                        setDepositInput(v);
                        const n = v === '' || v === '.' ? NaN : Number(v);
                        salary.setForm({ ...salary.form, depositAmount: Number.isFinite(n) ? n : 0 });
                      }
                    }} 
                  />
                </div>
                <button 
                  className="button button-primary" 
                  disabled={!salary.canWrite} 
                  onClick={() => {
                    // sync parsed value before submit to avoid stale 0 when user ended with a dot
                    const n = depositInput === '' || depositInput === '.' ? 0 : Number(depositInput);
                    salary.setForm({ ...salary.form, depositAmount: Number.isFinite(n) ? n : 0 });
                    salary.depositFunds();
                  }}
                >
                  💰 Deposit Funds
                </button>
                <div className="info-box">
                  <strong>Current Balance:</strong> {salary.contractBalance} ETH
                </div>
              </div>
        </div>
          )}

          {currentPage === 'employees' && (
            <div className="page-container">
              <div className="page-header">
                <div className="page-icon">👥</div>
                <h1 className="page-title">Employees</h1>
              </div>
              <div className="page-body">
                <button 
                  className="button button-secondary" 
                  onClick={salary.refreshEmployees} 
                  disabled={!salary.contractAddress}
                >
                  🔄 Refresh List
                </button>
                <div className="employee-list">
                  {salary.employees.length === 0 ? (
                    <div style={{ color: 'var(--gray-500)', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>
                      No employees found
                    </div>
                  ) : (
                    salary.employees.map((e) => (
                      <div key={e.id} className="employee-item">
        <div>
                          <span className="employee-id">ID: {e.id}</span>
                          <span className="employee-interval">• {e.payIntervalDays} days interval</span>
                        </div>
                        <div className="employee-address">{e.wallet}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {currentPage === 'add-employee' && (
            <div className="page-container">
              <div className="page-header">
                <div className="page-icon">➕</div>
                <h1 className="page-title">Add/Update Employee</h1>
              </div>
              <div className="page-body">
                <div className="form-group">
                  <label className="form-label">Employee ID</label>
                  <input 
                    className="input"
                    placeholder="Enter employee ID" 
                    type="number" 
                    value={salary.form.employeeId ?? ''} 
                    onChange={(e) => salary.setForm({ ...salary.form, employeeId: Number(e.target.value) })} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Wallet Address</label>
                  <input 
                    className="input"
                    placeholder="0x..." 
                    value={salary.form.wallet} 
                    onChange={(e) => salary.setForm({ ...salary.form, wallet: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Interval (days)</label>
                  <input 
                    className="input"
                    placeholder="e.g., 30" 
                    type="number" 
                    value={salary.form.interval ?? ''} 
                    onChange={(e) => salary.setForm({ ...salary.form, interval: Number(e.target.value) })} 
                  />
                </div>
                <button 
                  className="button button-primary" 
                  disabled={!salary.canWrite} 
                  onClick={salary.setEmployee}
                >
                  💾 Save Employee
                </button>
              </div>
            </div>
          )}

          {currentPage === 'set-salary' && (
            <div className="page-container">
              <div className="page-header">
                <div className="page-icon">🔒</div>
                <h1 className="page-title">Set Encrypted Salary</h1>
              </div>
              <div className="page-body">
                <div className="form-group">
                  <label className="form-label">Employee ID</label>
                  <input 
                    className="input"
                    placeholder="Enter employee ID" 
                    type="number" 
                    value={salary.form.employeeId ?? ''} 
                    onChange={(e) => salary.setForm({ ...salary.form, employeeId: Number(e.target.value) })} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Monthly Salary (ETH)</label>
                  <input 
                    className="input"
                    placeholder="Enter salary amount" 
                    type="number" 
                    step="0.000001"
                    value={salary.form.salary ?? ''} 
                    onChange={(e) => salary.setForm({ ...salary.form, salary: Number(e.target.value) })} 
                  />
                </div>
                <button 
                  className="button button-primary" 
                  disabled={!salary.canEncrypt} 
                  onClick={salary.setEncryptedSalary}
                >
                  🔐 Encrypt & Save
                </button>
                <div className="info-box">
                  <strong>Note:</strong> Salary will be encrypted using FHE before storing on-chain
                </div>
              </div>
            </div>
          )}

          {currentPage === 'decrypt-salary' && (
            <div className="page-container">
              <div className="page-header">
                <div className="page-icon">🔓</div>
                <h1 className="page-title">Decrypt Salary</h1>
              </div>
              <div className="page-body">
                <div className="form-group">
                  <label className="form-label">Employee ID</label>
                  <input 
                    className="input"
                    placeholder="Enter employee ID" 
                    type="number" 
                    value={salary.form.employeeId ?? ''} 
                    onChange={(e) => salary.setForm({ ...salary.form, employeeId: Number(e.target.value) })} 
                  />
                </div>
                <button 
                  className="button button-secondary" 
                  disabled={!salary.canDecrypt} 
                  onClick={salary.decryptSalary}
                >
                  🔍 Decrypt Salary
                </button>
                <div className="result-display">
                  {salary.decryptedSalary ? `${salary.decryptedSalary} ETH` : ''}
                </div>
              </div>
            </div>
          )}

          {currentPage === 'pay-now' && (
            <div className="page-container">
              <div className="page-header">
                <div className="page-icon">💸</div>
                <h1 className="page-title">Immediate Payment</h1>
              </div>
              <div className="page-body">
                <div className="form-group">
                  <label className="form-label">Employee ID</label>
                  <input 
                    className="input"
                    placeholder="Enter employee ID" 
                    type="number" 
                    value={salary.form.employeeId ?? ''} 
                    onChange={(e) => salary.setForm({ ...salary.form, employeeId: Number(e.target.value) })} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Amount (ETH)</label>
                  <input 
                    className="input"
                    placeholder="Enter payment amount" 
                    type="number" 
                    step="0.01"
                    value={salary.form.payAmount ?? ''} 
                    onChange={(e) => salary.setForm({ ...salary.form, payAmount: Number(e.target.value) })} 
                  />
                </div>
                <button 
                  className="button button-success" 
                  disabled={!salary.canWrite} 
                  onClick={salary.payNow}
                >
                  ✅ Pay Now
                </button>
              </div>
        </div>
          )}

          {currentPage === 'pay-scheduled' && (
            <div className="page-container">
              <div className="page-header">
                <div className="page-icon">⏰</div>
                <h1 className="page-title">Scheduled Payment</h1>
              </div>
              <div className="page-body">
                <div className="form-group">
                  <label className="form-label">Employee ID</label>
                  <input 
                    className="input"
                    placeholder="Enter employee ID" 
                    type="number" 
                    value={salary.form.employeeId ?? ''} 
                    onChange={(e) => salary.setForm({ ...salary.form, employeeId: Number(e.target.value) })} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Amount (ETH)</label>
                  <input 
                    className="input"
                    placeholder="Enter payment amount" 
                    type="number" 
                    step="0.01"
                    value={salary.form.payAmount ?? ''} 
                    onChange={(e) => salary.setForm({ ...salary.form, payAmount: Number(e.target.value) })} 
                  />
                </div>
                <button 
                  className="button button-success" 
                  disabled={!salary.canWrite} 
                  onClick={salary.payIfDue}
                >
                  📅 Pay If Due
                </button>
                <div className="info-box">
                  <strong>Note:</strong> Payment will only process if the interval has elapsed
                </div>
              </div>
        </div>
          )}

          {currentPage === 'status' && (
            <div className="page-container">
              <div className="page-header">
                <div className="page-icon">📊</div>
                <h1 className="page-title">Transaction Status</h1>
              </div>
              <div className="page-body">
                <div className="status-message">{salary.message}</div>
              </div>
        </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function Page() {
  const initialMockChains = useMemo(() => ({ 31337: "http://localhost:8545" }), []);
  return (
    <MetaMaskEthersSignerProvider initialMockChains={initialMockChains}>
      <AppContent />
    </MetaMaskEthersSignerProvider>
  );
}
