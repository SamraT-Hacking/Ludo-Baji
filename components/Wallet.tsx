
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { supabase } from '../utils/supabase';
import { Profile, Transaction } from '../types';
import { getApiBaseUrl } from '../config';
import { AppConfigContext } from '../App';
import { CheckIconSVG, CopyIconSVG, PhoneIconSVG } from '../assets/icons';
import { useLanguage } from '../contexts/LanguageContext';

// Locally defined types for Gateway Settings since they are JSONB in DB
interface OfflineMethod {
    id: string;
    name: string;
    number: string;
    color: string;
    logo_url?: string; // Added logo support
}

interface DepositGatewaySettings {
    active_gateway: 'offline' | 'uddoktapay' | 'paytm' | 'razorpay';
    uddoktapay: { api_key: string; api_url: string; };
    paytm: { merchant_id: string; merchant_key: string; };
    razorpay: { key_id: string; key_secret: string; };
    offline: { 
        instructions: string;
        methods?: OfflineMethod[];
    };
}

const WithdrawalModal: React.FC<{
    onClose: () => void;
    winningsBalance: number;
    onSuccess: () => void;
    currencySymbol: string;
}> = ({ onClose, winningsBalance, onSuccess, currencySymbol }) => {
    const { t } = useLanguage();
    const [method, setMethod] = useState('bKash');
    const [accountNumber, setAccountNumber] = useState('');
    const [amount, setAmount] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const TRANSACTION_FEE = 5.00;
    const MIN_WITHDRAWAL = 100.00;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const numericAmount = parseFloat(amount);
        
        if (isNaN(numericAmount) || numericAmount < MIN_WITHDRAWAL) {
            setError(`Minimum withdrawal amount is ${currencySymbol}${MIN_WITHDRAWAL.toFixed(2)}.`);
            return;
        }
        if (numericAmount + TRANSACTION_FEE > winningsBalance) {
            setError('Insufficient winnings balance to cover amount and transaction fee.');
            return;
        }
        if (!accountNumber.trim()) {
            setError('Please enter your account number.');
            return;
        }

        setSubmitting(true);
        try {
            const { data, error: rpcError } = await supabase!.rpc('request_withdrawal', {
                amount_to_withdraw: numericAmount,
                method: method,
                account_number: accountNumber
            });
            
            if (rpcError) throw rpcError;
            
            if (typeof data === 'string' && data.startsWith('Error:')) {
                throw new Error(data);
            }
            
            onSuccess();
            onClose();

        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="withdraw-modal-overlay" onClick={onClose}>
            <div className="withdraw-modal-content" onClick={e => e.stopPropagation()}>
                <h2 style={{ marginBottom: '1.5rem' }}>{t('wallet_req_withdraw', 'Request Withdrawal')}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="profile-input-group">
                        <label htmlFor="method">{t('wallet_method', 'Withdrawal Method')}</label>
                        <select
                            id="method"
                            value={method}
                            onChange={e => setMethod(e.target.value)}
                            className="profile-input"
                        >
                            <option value="bKash">bKash</option>
                            <option value="Nagad">Nagad</option>
                            <option value="Rocket">Rocket</option>
                        </select>
                    </div>
                     <div className="profile-input-group">
                        <label htmlFor="accountNumber">{t('wallet_acc_number', 'Account Number')}</label>
                        <input
                            id="accountNumber"
                            type="text"
                            value={accountNumber}
                            onChange={e => setAccountNumber(e.target.value)}
                            className="profile-input"
                            placeholder="e.g., 01712345678"
                        />
                    </div>
                     <div className="profile-input-group">
                        <label htmlFor="amount">{t('wallet_amount', 'Amount')} ({t('wallet_available', 'Available')}: {currencySymbol}{winningsBalance.toFixed(2)})</label>
                        <input
                            id="amount"
                            type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="profile-input"
                            placeholder={`${t('wallet_min_withdraw_info', 'Min Withdraw')}: ${currencySymbol}${MIN_WITHDRAWAL.toFixed(2)}`}
                            min={MIN_WITHDRAWAL}
                            step="0.01"
                        />
                    </div>
                    <p className="fee-info">{t('wallet_fee_info', 'Transaction Fee')}: {currencySymbol}{TRANSACTION_FEE.toFixed(2)}</p>
                    {error && <p style={{ color: 'red', textAlign: 'center', fontSize: '0.9rem' }}>{error}</p>}
                    <button type="submit" className="profile-submit-btn" disabled={submitting} style={{ width: '100%', marginTop: '1rem' }}>
                        {submitting ? '...' : t('wallet_submit_req', 'Submit Request')}
                    </button>
                </form>
            </div>
        </div>
    );
};

const DepositModal: React.FC<{
    onClose: () => void;
    settings: DepositGatewaySettings | null;
    onSuccess: (message: string) => void;
    currencySymbol: string;
}> = ({ onClose, settings, onSuccess, currencySymbol }) => {
    const { t } = useLanguage();
    const [amount, setAmount] = useState('');
    const [trxId, setTrxId] = useState('');
    const [senderNumber, setSenderNumber] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState<OfflineMethod | null>(null);
    const [copied, setCopied] = useState(false);
    const MIN_DEPOSIT = 30.00;

    const handleCopyNumber = async () => {
        if (selectedMethod) {
            try {
                await navigator.clipboard.writeText(selectedMethod.number);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (e) {
                console.error("Copy failed", e);
            }
        }
    };

    const handleOfflineSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount < MIN_DEPOSIT) {
            setError(`${t('wallet_min_deposit_info', 'Min Deposit')}: ${currencySymbol}${MIN_DEPOSIT.toFixed(2)}.`);
            return;
        }
        if (!trxId.trim()) {
            setError('Please enter the Transaction ID (TrxID).');
            return;
        }
        if (!senderNumber.trim()) {
            setError('Please enter the sender number.');
            return;
        }
        
        setSubmitting(true);
        try {
            // Construct detailed description for admin
            const methodPart = selectedMethod ? `Method: ${selectedMethod.name}` : 'Offline';
            const description = `Offline Deposit via ${methodPart} | From: ${senderNumber} | TrxID: ${trxId}`;

            const { data, error: rpcError } = await supabase!.rpc('request_offline_deposit', {
                amount_to_deposit: numericAmount,
                transaction_details: description
            });
            if (rpcError) throw rpcError;
            if (typeof data === 'string' && data.startsWith('Error:')) throw new Error(data);
            onSuccess(data);
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleOnlineSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount < MIN_DEPOSIT) {
            setError(`${t('wallet_min_deposit_info', 'Min Deposit')}: ${currencySymbol}${MIN_DEPOSIT.toFixed(2)}.`);
            return;
        }
        
        if (!supabase) return;
        setSubmitting(true);
        setError(null);
        
        try {
            const { data: { user } } = await (supabase.auth as any).getUser();
            if (!user) throw new Error("Not authenticated");

            // Use the Node.js Game Server API instead of Supabase Edge Functions
            const response = await fetch(`${getApiBaseUrl()}/api/payment/init`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.id,
                    amount: numericAmount,
                    gateway: settings?.active_gateway || 'uddoktapay',
                    redirectBaseUrl: window.location.origin,
                    userEmail: user.email,
                    userName: user.user_metadata?.full_name,
                    userPhone: user.phone || user.user_metadata?.phone // Pass phone for gateways that need it
                }),
            });

            let data;
            const responseText = await response.text();
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                throw new Error(`Server Error: ${responseText}`);
            }

            if (!response.ok) {
                throw new Error(data.error || 'Failed to initiate payment.');
            }

            if (data.payment_url) {
                // Store transaction ID to check for cancellation on return
                if (data.transactionId) {
                    sessionStorage.setItem('pendingTransactionId', data.transactionId);
                }
                window.location.href = data.payment_url;
            } else {
                throw new Error('Failed to get payment URL from gateway.');
            }
        } catch (err: any) {
            setError(err.message);
            setSubmitting(false);
        }
    };
    
    const getGatewayName = () => {
        switch(settings?.active_gateway) {
            case 'uddoktapay': return 'UddoktaPay';
            case 'paytm': return 'Paytm';
            case 'razorpay': return 'Razorpay';
            default: return 'Payment Gateway';
        }
    }

    const renderGatewayUI = () => {
        if (!settings) return <p>{t('label_loading', 'Loading...')}</p>;
        
        // --- OFFLINE GATEWAY ---
        if (settings.active_gateway === 'offline') {
            // 1. Method Selection View
            if (!selectedMethod) {
                const methods = settings.offline.methods || [];
                return (
                    <div className="offline-deposit-container">
                        <h3 style={{textAlign: 'center', margin: '0 0 1.5rem 0'}}>{t('wallet_sel_method', 'Select Payment Method')}</h3>
                        {settings.offline.instructions && <p style={{color: '#666', fontSize: '0.9rem', textAlign: 'center', marginBottom: '1.5rem'}}>{settings.offline.instructions}</p>}
                        
                        {methods.length === 0 ? (
                             <div style={{textAlign: 'center', padding: '2rem', backgroundColor: '#f7fafc', borderRadius: '8px'}}>
                                 <p>No payment methods available. Please contact admin.</p>
                             </div>
                        ) : (
                            <div className="payment-method-grid">
                                {methods.map(method => (
                                    <div 
                                        key={method.id} 
                                        className="payment-method-card"
                                        style={{ 
                                            background: method.logo_url ? 'white' : `linear-gradient(135deg, ${method.color}, ${method.color}DD)`,
                                            border: method.logo_url ? '1px solid #e2e8f0' : 'none'
                                        }}
                                        onClick={() => setSelectedMethod(method)}
                                    >
                                        <div className="method-icon-wrapper">
                                            {method.logo_url ? (
                                                <img src={method.logo_url} alt={method.name} className="method-logo-img" />
                                            ) : (
                                                <div className="method-icon-circle">
                                                    <div dangerouslySetInnerHTML={{__html: PhoneIconSVG()}} style={{width: '24px', height: '24px'}} />
                                                </div>
                                            )}
                                        </div>
                                        <span className="method-name" style={{color: method.logo_url ? '#333' : 'white'}}>{method.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            } 
            
            // 2. Detail & Form View
            else {
                return (
                    <div className="offline-form-container">
                        <button className="back-link-btn" onClick={() => setSelectedMethod(null)}>&larr; Change Method</button>
                        
                        <div className="selected-method-header" style={{ 
                            background: selectedMethod.logo_url ? 'white' : `linear-gradient(135deg, ${selectedMethod.color}, ${selectedMethod.color}DD)`,
                            border: selectedMethod.logo_url ? '1px solid #e2e8f0' : 'none'
                        }}>
                            <div className="method-info">
                                <span className="label" style={{color: selectedMethod.logo_url ? '#666' : 'rgba(255,255,255,0.9)'}}>{t('wallet_send_money_to', 'Send Money To')}</span>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '0.5rem' }}>
                                     {selectedMethod.logo_url && <img src={selectedMethod.logo_url} alt={selectedMethod.name} style={{height: '40px', objectFit: 'contain', marginBottom: '0.5rem'}} />}
                                     <span className="value-row">
                                        <span className="number" style={{color: selectedMethod.logo_url ? '#2d3748' : 'white'}}>{selectedMethod.number}</span>
                                        <button className="copy-btn" onClick={handleCopyNumber} style={{ background: selectedMethod.logo_url ? '#edf2f7' : 'rgba(255,255,255,0.2)', color: selectedMethod.logo_url ? '#4a5568' : 'white' }}>
                                            <div dangerouslySetInnerHTML={{__html: copied ? CheckIconSVG() : CopyIconSVG(false)}} style={{width: '18px', height: '18px'}} />
                                        </button>
                                    </span>
                                </div>
                                <span className="label-small" style={{color: selectedMethod.logo_url ? '#718096' : 'rgba(255,255,255,0.8)'}}>{selectedMethod.name} {t('wallet_personal_agent', 'Personal/Agent')}</span>
                            </div>
                        </div>

                        <form onSubmit={handleOfflineSubmit} className="deposit-form">
                            <div className="profile-input-group">
                                <label htmlFor="amount_off">{t('wallet_amount', 'Amount')}</label>
                                <input id="amount_off" type="number" value={amount} onChange={e => setAmount(e.target.value)} className="profile-input" placeholder={`${t('wallet_min_deposit_info', 'Min Deposit')}: ${currencySymbol}${MIN_DEPOSIT.toFixed(2)}`} required />
                            </div>
                            <div className="profile-input-group">
                                <label htmlFor="sender">{t('wallet_sender_num', 'Sender Number')}</label>
                                <input id="sender" type="text" value={senderNumber} onChange={e => setSenderNumber(e.target.value)} className="profile-input" placeholder="Number you sent from" required />
                            </div>
                            <div className="profile-input-group">
                                <label htmlFor="trxid">{t('wallet_trx_id', 'Transaction ID (TrxID)')}</label>
                                <input id="trxid" type="text" value={trxId} onChange={e => setTrxId(e.target.value)} className="profile-input" placeholder="e.g. 8X... or similar" required />
                            </div>
                            
                            <button type="submit" className="profile-submit-btn" disabled={submitting} style={{ width: '100%', marginTop: '1rem', background: 'var(--primary-red)' }}>
                                {submitting ? '...' : t('wallet_verify_pay', 'Verify Payment')}
                            </button>
                        </form>
                    </div>
                );
            }
        }
        
        // --- ONLINE GATEWAY ---
        return (
            <form onSubmit={handleOnlineSubmit}>
                <p style={{textAlign: 'center', marginBottom: '1.5rem'}}>{t('wallet_redirect_msg', 'You will be redirected to')} {getGatewayName()} {t('wallet_proceed_pay', 'to complete your payment securely.')}</p>
                <div className="profile-input-group"><label htmlFor="amount_online">{t('wallet_amount', 'Amount')}</label><input id="amount_online" type="number" value={amount} onChange={e => setAmount(e.target.value)} className="profile-input" placeholder={`${t('wallet_min_deposit_info', 'Min Deposit')}: ${currencySymbol}${MIN_DEPOSIT.toFixed(2)}`} required /></div>
                <button type="submit" className="profile-submit-btn" disabled={submitting} style={{ width: '100%', marginTop: '1rem', backgroundColor: '#48bb78' }}>{submitting ? '...' : t('wallet_proceed_pay', 'Proceed to Pay')}</button>
            </form>
        );
    };

    return (
        <div className="withdraw-modal-overlay" onClick={onClose}>
            <style>{`
                .payment-method-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1rem;
                }
                .payment-method-card {
                    padding: 1.5rem;
                    border-radius: 12px;
                    color: white;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.5rem;
                    transition: transform 0.2s;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
                }
                .payment-method-card:hover { transform: translateY(-3px); }
                .method-icon-wrapper {
                    height: 50px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 0.5rem;
                }
                .method-logo-img {
                    max-width: 100%;
                    max-height: 100%;
                    object-fit: contain;
                }
                .method-icon-circle {
                    width: 40px; height: 40px;
                    background: rgba(255,255,255,0.2);
                    border-radius: 50%;
                    display: flex; justify-content: center; align-items: center;
                }
                .method-name { font-weight: bold; font-size: 1.1rem; }
                
                .selected-method-header {
                    padding: 1.5rem;
                    border-radius: 12px;
                    color: white;
                    margin-bottom: 1.5rem;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }
                .method-info { display: flex; flex-direction: column; align-items: center; }
                .method-info .label { font-size: 0.8rem; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px; }
                .method-info .label-small { font-size: 0.8rem; opacity: 0.8; margin-top: 0.5rem; }
                .value-row { display: flex; alignItems: center; gap: 0.5rem; margin-top: 0.25rem; }
                .value-row .number { font-size: 1.5rem; font-weight: bold; letter-spacing: 1px; }
                .copy-btn { background: rgba(255,255,255,0.2); border: none; color: white; border-radius: 6px; padding: 4px 8px; cursor: pointer; display: flex; }
                .copy-btn:hover { background: rgba(255,255,255,0.3); }
                
                .back-link-btn {
                    background: none; border: none; color: #666; cursor: pointer; font-size: 0.9rem; margin-bottom: 1rem; padding: 0; display: inline-block;
                }
                .back-link-btn:hover { text-decoration: underline; color: #333; }
            `}</style>
            <div className="withdraw-modal-content" onClick={e => e.stopPropagation()}>
                <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>{t('wallet_add_funds', 'Add Funds')}</h2>
                {error && <div style={{ color: '#c53030', backgroundColor: '#fff5f5', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem', border: '1px solid #fed7d7' }}>{error}</div>}
                {renderGatewayUI()}
            </div>
        </div>
    );
};

const Wallet: React.FC = () => {
    const { t } = useLanguage();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
    const [depositSettings, setDepositSettings] = useState<DepositGatewaySettings | null>(null);
    
    const { currencySymbol } = useContext(AppConfigContext);
    
    const fetchWalletData = useCallback(async () => {
        if (!supabase) return;
        try {
            const { data: { user } } = await (supabase.auth as any).getUser();
            if (!user) throw new Error("User not authenticated");

            const [
                { data: profileData, error: profileError },
                { data: transactionsData, error: transactionsError },
                { data: settingsData, error: settingsError }
            ] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', user.id).single(),
                supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
                supabase.from('app_settings').select('value').eq('key', 'deposit_gateway_settings').single()
            ]);

            if (profileError) throw profileError;
            if (transactionsError) throw transactionsError;
            if (settingsError) throw settingsError;

            setProfile(profileData);
            setTransactions(transactionsData as Transaction[]);
            setDepositSettings(settingsData.value as DepositGatewaySettings);

        } catch (e: any) {
            setError(e.message);
        }
    }, []);

    // Handle return from Payment Gateway
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        let status = params.get('payment');

        if (!status && window.location.hash.includes('?')) {
             const hashParts = window.location.hash.split('?');
             if (hashParts.length > 1) {
                 const hashParams = new URLSearchParams(hashParts[1]);
                 status = hashParams.get('payment');
             }
        }

        if (status === 'success') {
            setActionMessage({ type: 'success', text: 'Payment successful! Your wallet has been updated.' });
            sessionStorage.removeItem('pendingTransactionId'); // Clear pending ID on success
            fetchWalletData();
            const newUrl = window.location.pathname + window.location.hash.split('?')[0];
            window.history.replaceState({}, document.title, newUrl);
        } else if (status === 'cancel') {
            setActionMessage({ type: 'error', text: 'Payment was cancelled.' });
            sessionStorage.removeItem('pendingTransactionId'); // Clear pending ID on explicit cancel
            fetchWalletData(); // Refresh to show failed status if any
            const newUrl = window.location.pathname + window.location.hash.split('?')[0];
            window.history.replaceState({}, document.title, newUrl);
        } else {
            // Check for abandoned/cancelled transaction via Browser Back Button
            const pendingTxId = sessionStorage.getItem('pendingTransactionId');
            if (pendingTxId) {
                 fetch(`${getApiBaseUrl()}/api/payment/check-cancel`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ transactionId: pendingTxId })
                }).then(response => response.json())
                  .then(data => {
                    sessionStorage.removeItem('pendingTransactionId');
                    if (data.status === 'cancelled') {
                        setActionMessage({ type: 'error', text: 'Payment cancelled (abandoned).' });
                    }
                    fetchWalletData();
                }).catch(err => console.error("Error checking cancel status", err));
            }
        }
    }, [fetchWalletData]);

    useEffect(() => {
        const initialFetch = async () => {
            setLoading(true);
            await fetchWalletData();
            setLoading(false);
        };
        initialFetch();
    }, [fetchWalletData]);
    
    useEffect(() => {
        if (!supabase || !profile?.id) return;
        const channel = supabase.channel(`wallet-changes-for-user-${profile.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${profile.id}`}, () => fetchWalletData())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${profile.id}`}, () => fetchWalletData())
          .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [supabase, fetchWalletData, profile?.id]);

    const handleActionSuccess = (message: string) => {
        setActionMessage({ type: 'success', text: message });
        fetchWalletData();
        setTimeout(() => setActionMessage(null), 5000);
    };
    
    const currentBalance = (profile?.deposit_balance || 0) + (profile?.winnings_balance || 0);

    const messageStyle: React.CSSProperties = { padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center', color: 'white' };
    const thStyle: React.CSSProperties = { padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' };
    const tdStyle: React.CSSProperties = { padding: '0.75rem', borderBottom: '1px solid #eee' };

    if (loading && !profile) return <div>{t('label_loading', 'Loading Wallet...')}</div>;
    if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

    return (
        <div className="wallet-page-container">
            {isWithdrawModalOpen && profile && (
                <WithdrawalModal 
                    onClose={() => setIsWithdrawModalOpen(false)} 
                    winningsBalance={profile.winnings_balance}
                    onSuccess={() => handleActionSuccess('Withdrawal request submitted successfully.')}
                    currencySymbol={currencySymbol}
                />
            )}
            {isDepositModalOpen && (
                <DepositModal
                    onClose={() => setIsDepositModalOpen(false)}
                    settings={depositSettings}
                    onSuccess={handleActionSuccess}
                    currencySymbol={currencySymbol}
                />
            )}
            
            <h1 style={{ margin: 0 }}>{t('wallet_title', 'My Wallet')}</h1>
            
            {actionMessage && <div style={{ ...messageStyle, backgroundColor: actionMessage.type === 'success' ? '#4CAF50' : '#f44336' }}>{actionMessage.text}</div>}

            <div className="wallet-balance-card">
                <div className="balance-total">
                    <p>{t('wallet_total_balance', 'Current Balance')}</p>
                    <h2>{currencySymbol}{currentBalance.toFixed(2)}</h2>
                </div>
                <div className="balance-breakdown">
                    <div className="balance-part">
                        <p>{t('wallet_deposit_balance', 'Deposit Balance')}</p>
                        <h3>{currencySymbol}{profile?.deposit_balance?.toFixed(2) || '0.00'}</h3>
                    </div>
                     <div className="balance-part">
                        <p>{t('wallet_win_balance', 'Winnings Balance')}</p>
                        <h3>{currencySymbol}{profile?.winnings_balance?.toFixed(2) || '0.00'}</h3>
                    </div>
                </div>
            </div>
            
            <div className="wallet-actions-card">
                <h3>{t('wallet_manage_funds', 'Manage Funds')}</h3>
                <div className="wallet-action-buttons">
                    <button onClick={() => setIsDepositModalOpen(true)} className="profile-submit-btn" style={{backgroundColor: '#48bb78'}}>{t('wallet_btn_deposit', 'Deposit')}</button>
                    <button onClick={() => setIsWithdrawModalOpen(true)} className="profile-submit-btn" style={{backgroundColor: '#f56565'}}>{t('wallet_btn_withdraw', 'Withdraw')}</button>
                </div>
                <p className="info-text">{t('wallet_min_deposit_info', 'Min Deposit')}: {currencySymbol}30.00 / {t('wallet_min_withdraw_info', 'Min Withdraw')}: {currencySymbol}100.00 (from Winnings)</p>
            </div>

            <div className="wallet-history-card">
                <h3>{t('wallet_history_title', 'Transaction History')}</h3>
                <div className="table-container" style={{maxHeight: '400px', overflowY: 'auto'}}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={thStyle}>{t('col_date', 'Date')}</th>
                                <th style={thStyle}>{t('col_type', 'Type')}</th>
                                <th style={thStyle}>{t('col_amount', 'Amount')}</th>
                                <th style={thStyle}>{t('col_status', 'Status')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.length > 0 ? transactions.map(t => (
                                <tr key={t.id}>
                                    <td style={tdStyle}>{new Date(t.created_at).toLocaleDateString()}</td>
                                    <td style={tdStyle}>{t.description || t.type}</td>
                                    <td style={{ ...tdStyle, fontWeight: 'bold', color: t.amount > 0 ? 'green' : 'red' }}>
                                        {t.amount > 0 ? '+' : ''}{currencySymbol}{Math.abs(Number(t.amount)).toFixed(2)}
                                    </td>
                                    <td style={tdStyle}>{t.status}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} style={{textAlign: 'center', padding: '2rem', color: '#666'}}>{t('wallet_no_transactions', 'No transactions yet.')}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Wallet;
