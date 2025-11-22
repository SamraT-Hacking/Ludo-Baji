
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { supabase } from '../../utils/supabase';
import { TransactionStatus } from '../../types';
import { AppConfigContext } from '../../App';

interface DepositDetails {
    id: string;
    username: string;
    amount: number;
    date: string;
    status: TransactionStatus;
    description: string;
    gateway_log?: any;
    external_trx_id?: string;
    sender_number?: string;
    payment_method?: string;
}

type Tab = 'PENDING' | 'RECENT';
const ITEMS_PER_PAGE = 20;

const DepositManagement: React.FC = () => {
    const { currencySymbol } = useContext(AppConfigContext);
    const [deposits, setDeposits] = useState<DepositDetails[]>([]);
    const [filteredDeposits, setFilteredDeposits] = useState<DepositDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<Tab>('PENDING');
    const [selectedDeposit, setSelectedDeposit] = useState<DepositDetails | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    const fetchDeposits = useCallback(async () => {
        if (!supabase) return;
        setLoading(true);
        try {
            const from = (page - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            // 1. Fetch Transactions based on tab
            let query = supabase
                .from('transactions')
                .select('*, profiles:user_id(username)', { count: 'exact' })
                .eq('type', 'DEPOSIT')
                .order('created_at', { ascending: false });

            if (activeTab === 'PENDING') {
                query = query.eq('status', 'PENDING');
            } else {
                // Recent includes Completed, Rejected, Failed
                query = query.neq('status', 'PENDING');
            }

            const { data: transactions, error, count } = await query.range(from, to);
            if (error) throw error;

            const rawTransactions = transactions || [];
            setHasMore((count || 0) > to + 1);

            // 2. Fetch associated Gateway Logs for these transactions
            const transactionIds = rawTransactions.map(t => t.id);
            let logsMap: Record<string, any> = {};

            if (transactionIds.length > 0) {
                const { data: logs } = await supabase
                    .from('deposit_gateway_logs')
                    .select('*')
                    .in('transaction_id', transactionIds);
                
                if (logs) {
                    logs.forEach(log => {
                        logsMap[log.transaction_id] = log;
                    });
                }
            }

            // 3. Map and Combine Data
            const mappedDeposits: DepositDetails[] = rawTransactions.map(t => {
                const log = logsMap[t.id];
                
                let external_trx_id = 'N/A';
                let sender_number = 'N/A';
                let payment_method = 'Unknown';

                if (log) {
                    const raw = log.raw_response;
                    external_trx_id = raw?.transaction_id || raw?.trxId || raw?.trxID || log.invoice_id || 'N/A';
                    sender_number = log.sender_number || raw?.sender_number || 'N/A';
                    payment_method = log.payment_method || raw?.payment_method || log.gateway;
                } else if (t.description.toLowerCase().includes('offline')) {
                    payment_method = 'Offline';
                    const parts = t.description.split('Details:');
                    if (parts.length > 1) {
                        external_trx_id = parts[1].trim();
                    }
                }

                return {
                    id: t.id,
                    username: t.profiles?.username || 'Unknown',
                    amount: t.amount,
                    date: t.created_at,
                    status: t.status,
                    description: t.description,
                    gateway_log: log,
                    external_trx_id,
                    sender_number,
                    payment_method
                };
            });

            setDeposits(mappedDeposits);
            setFilteredDeposits(mappedDeposits);

        } catch (e: any) {
            console.error("Error fetching deposits", e);
        } finally {
            setLoading(false);
        }
    }, [activeTab, page]);

    useEffect(() => {
        setPage(1); // Reset page on tab change
    }, [activeTab]);

    useEffect(() => {
        fetchDeposits();
    }, [fetchDeposits]);
    
    // Realtime Subscription
    useEffect(() => {
        if (!supabase) return;
        const channel = supabase.channel('admin-deposits-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: 'type=eq.DEPOSIT' }, fetchDeposits)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchDeposits]);

    // Client-side search logic (NOTE: Search only filters the currently fetched page due to complex derived data. 
    // Implementing full server-side search with joined logs is complex without a dedicated view/RPC)
    useEffect(() => {
        if (!searchTerm) {
            setFilteredDeposits(deposits);
            return;
        }
        const lowerTerm = searchTerm.toLowerCase();
        const filtered = deposits.filter(d => 
            d.username.toLowerCase().includes(lowerTerm) ||
            d.external_trx_id?.toLowerCase().includes(lowerTerm) ||
            d.sender_number?.toLowerCase().includes(lowerTerm) ||
            d.amount.toString().includes(lowerTerm) ||
            d.payment_method?.toLowerCase().includes(lowerTerm)
        );
        setFilteredDeposits(filtered);
    }, [searchTerm, deposits]);

    const openDetails = (deposit: DepositDetails) => {
        setSelectedDeposit(deposit);
    };

    const handleProcessDeposit = async (transactionId: string, isApproved: boolean) => {
        if (!supabase) return;
        const action = isApproved ? 'approve' : 'reject';
        if (!window.confirm(`Are you sure you want to ${action} this deposit?`)) return;

        try {
            const { data, error } = await supabase.rpc('process_deposit', {
                transaction_id_to_process: transactionId,
                is_approved: isApproved
            });
            if (error) throw error;
            if (typeof data === 'string' && data.startsWith('Error:')) throw new Error(data);
            alert(data);
            setSelectedDeposit(null); 
            fetchDeposits(); 
        } catch (e: any) {
            alert(`Failed to ${action} deposit: ${e.message}`);
        }
    };

    const StatusBadge = ({ status }: { status: TransactionStatus }) => {
        const style: React.CSSProperties = { padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' };
        switch (status) {
            case TransactionStatus.COMPLETED: style.backgroundColor = '#c6f6d5'; style.color = '#2f855a'; break;
            case TransactionStatus.PENDING: style.backgroundColor = '#fed7d7'; style.color = '#c53030'; break;
            default: style.backgroundColor = '#e2e8f0'; style.color = '#4a5568';
        }
        return <span style={style}>{status}</span>;
    };

    // Styles
    const headerStyle: React.CSSProperties = { fontSize: '2rem', marginBottom: '1rem' };
    const containerStyle: React.CSSProperties = { backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.05)' };
    const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' };
    const thStyle: React.CSSProperties = { padding: '1rem', textAlign: 'left', backgroundColor: '#f7fafc', borderBottom: '2px solid #edf2f7', color: '#4a5568' };
    const tdStyle: React.CSSProperties = { padding: '1rem', borderBottom: '1px solid #edf2f7' };
    const buttonStyle: React.CSSProperties = { padding: '0.4rem 0.8rem', borderRadius: '5px', border: 'none', cursor: 'pointer', color: 'white', fontSize: '0.8rem' };
    const modalOverlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 101 };
    const modalContentStyle: React.CSSProperties = { backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' };
    const detailRowStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #eee' };
    const detailLabelStyle: React.CSSProperties = { fontWeight: 'bold', color: '#555' };
    const tabContainerStyle: React.CSSProperties = { display: 'flex', gap: '0.5rem', marginBottom: '1rem' };
    const tabButtonStyle: React.CSSProperties = { padding: '0.5rem 1.5rem', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 600 };
    const activeTabStyle: React.CSSProperties = { backgroundColor: '#4299e1', color: 'white' };
    const inactiveTabStyle: React.CSSProperties = { backgroundColor: '#e2e8f0', color: '#4a5568' };
    const paginationContainerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid #edf2f7' };
    const pageBtnStyle: React.CSSProperties = { padding: '0.5rem 1rem', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '0.9rem' };

    return (
        <div>
            <h1 style={headerStyle} className="admin-page-header">Deposit Management</h1>
            
            <div style={tabContainerStyle}>
                <button 
                    style={{...tabButtonStyle, ...(activeTab === 'PENDING' ? activeTabStyle : inactiveTabStyle)}}
                    onClick={() => setActiveTab('PENDING')}
                >
                    Pending
                </button>
                <button 
                    style={{...tabButtonStyle, ...(activeTab === 'RECENT' ? activeTabStyle : inactiveTabStyle)}}
                    onClick={() => setActiveTab('RECENT')}
                >
                    Recent
                </button>
            </div>

            <input 
                type="text" 
                placeholder="Search (Current Page)..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc', marginBottom: '1rem', width: '100%', maxWidth: '400px', fontSize: '1rem' }}
            />

            <div style={containerStyle} className="table-container">
                {loading && <p style={{padding: '1rem'}}>Loading...</p>}
                {!loading && filteredDeposits.length === 0 && <p style={{padding: '1rem', color: '#666'}}>No deposits found.</p>}
                {!loading && filteredDeposits.length > 0 && (
                    <table style={tableStyle} className="responsive-admin-table">
                        <thead>
                            <tr>
                                <th style={thStyle}>Username</th>
                                <th style={thStyle}>Amount</th>
                                <th style={thStyle}>Gateway / Method</th>
                                <th style={thStyle}>TrxID / Sender</th>
                                <th style={thStyle}>Date</th>
                                <th style={thStyle}>Status</th>
                                <th style={thStyle}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDeposits.map((d) => (
                                <tr key={d.id}>
                                    <td data-label="Username" style={{...tdStyle, fontWeight: 'bold'}}>{d.username}</td>
                                    <td data-label="Amount" style={{...tdStyle, color: 'green'}}>+{currencySymbol}{d.amount}</td>
                                    <td data-label="Method" style={tdStyle}>{d.payment_method}</td>
                                    <td data-label="TrxID/Sender" style={tdStyle}>
                                        <div style={{fontSize: '0.85rem'}}>
                                            <span style={{fontFamily: 'monospace', display: 'block'}}>{d.external_trx_id !== 'N/A' ? d.external_trx_id : ''}</span>
                                            {d.sender_number !== 'N/A' && <span style={{color: '#666'}}>{d.sender_number}</span>}
                                            {d.external_trx_id === 'N/A' && d.sender_number === 'N/A' && <span style={{color: '#999'}}>N/A</span>}
                                        </div>
                                    </td>
                                    <td data-label="Date" style={{...tdStyle, fontSize: '0.85rem'}}>{new Date(d.date).toLocaleString()}</td>
                                    <td data-label="Status" style={tdStyle}><StatusBadge status={d.status} /></td>
                                    <td data-label="Action" style={tdStyle}>
                                        <button onClick={() => openDetails(d)} style={{...buttonStyle, backgroundColor: '#4299e1'}}>Details</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                
                {!loading && (
                    <div style={paginationContainerStyle}>
                        <span style={{color: '#666', fontSize: '0.9rem'}}>Page {page}</span>
                        <div style={{display: 'flex', gap: '0.5rem'}}>
                            <button 
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                style={{...pageBtnStyle, opacity: page === 1 ? 0.5 : 1}}
                            >
                                Previous
                            </button>
                            <button 
                                onClick={() => setPage(p => p + 1)}
                                disabled={!hasMore}
                                style={{...pageBtnStyle, opacity: !hasMore ? 0.5 : 1}}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {selectedDeposit && (
                <div style={modalOverlayStyle} onClick={() => setSelectedDeposit(null)}>
                    <div style={modalContentStyle} onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginTop: 0 }}>Deposit Details</h2>
                        <div style={detailRowStyle}>
                            <span style={detailLabelStyle}>System ID</span>
                            <span style={{fontFamily: 'monospace', fontSize: '0.9rem'}}>{selectedDeposit.id}</span>
                        </div>
                         <div style={detailRowStyle}>
                            <span style={detailLabelStyle}>Gateway Transaction ID</span>
                            <span style={{fontFamily: 'monospace', fontWeight: 'bold', color: '#2c5282'}}>{selectedDeposit.external_trx_id}</span>
                        </div>
                        <div style={detailRowStyle}>
                            <span style={detailLabelStyle}>Username</span>
                            <span>{selectedDeposit.username}</span>
                        </div>
                        <div style={detailRowStyle}>
                            <span style={detailLabelStyle}>Payment Method</span>
                            <span>{selectedDeposit.payment_method}</span>
                        </div>
                        <div style={detailRowStyle}>
                            <span style={detailLabelStyle}>Sender Number</span>
                            <span>{selectedDeposit.sender_number}</span>
                        </div>
                        <div style={detailRowStyle}>
                            <span style={detailLabelStyle}>Amount</span>
                            <span style={{fontWeight: 'bold', fontSize: '1.2rem', color: 'green'}}>{currencySymbol}{selectedDeposit.amount.toFixed(2)}</span>
                        </div>
                        <div style={detailRowStyle}>
                            <span style={detailLabelStyle}>Date</span>
                            <span>{new Date(selectedDeposit.date).toLocaleString()}</span>
                        </div>
                        <div style={detailRowStyle}>
                            <span style={detailLabelStyle}>Status</span>
                            <StatusBadge status={selectedDeposit.status} />
                        </div>
                        <div style={{marginTop: '1rem', padding: '0.5rem', backgroundColor: '#f7fafc', borderRadius: '4px'}}>
                             <p style={{margin: '0 0 0.5rem 0', fontSize: '0.8rem', fontWeight: 'bold', color: '#666'}}>Raw Description:</p>
                             <p style={{margin: 0, fontSize: '0.9rem'}}>{selectedDeposit.description}</p>
                        </div>
                        
                        {selectedDeposit.status === 'PENDING' && (
                            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button onClick={() => handleProcessDeposit(selectedDeposit.id, false)} style={{...buttonStyle, backgroundColor: '#f56565', padding: '0.8rem 1.5rem', fontSize: '1rem'}}>Reject</button>
                                <button onClick={() => handleProcessDeposit(selectedDeposit.id, true)} style={{...buttonStyle, backgroundColor: '#48bb78', padding: '0.8rem 1.5rem', fontSize: '1rem'}}>Approve</button>
                            </div>
                        )}
                        <button onClick={() => setSelectedDeposit(null)} style={{...buttonStyle, backgroundColor: '#718096', marginTop: '1rem', width: '100%'}}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DepositManagement;
