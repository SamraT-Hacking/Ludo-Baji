import React, { useState, useEffect, useCallback, useContext } from 'react';
import { supabase } from '../../utils/supabase';
import { Transaction, TransactionStatus } from '../../types';
import { AppConfigContext } from '../../App';

interface WithdrawDetails {
    id: string;
    username: string;
    amount: number;
    date: string;
    status: TransactionStatus;
    description: string; // Contains method and account number
    account_number?: string;
    method?: string;
}

type Tab = 'PENDING' | 'RECENT';
const ITEMS_PER_PAGE = 20;

const WithdrawManagement: React.FC = () => {
    const { currencySymbol } = useContext(AppConfigContext);
    const [withdrawals, setWithdrawals] = useState<WithdrawDetails[]>([]);
    const [filteredWithdrawals, setFilteredWithdrawals] = useState<WithdrawDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<Tab>('PENDING');
    const [selectedWithdraw, setSelectedWithdraw] = useState<WithdrawDetails | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    const fetchWithdrawals = useCallback(async () => {
        if (!supabase) return;
        setLoading(true);
        try {
            const from = (page - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            let query = supabase
                .from('transactions')
                .select('*, profiles:user_id(username)', { count: 'exact' })
                .eq('type', 'WITHDRAWAL')
                .order('created_at', { ascending: false });

            if (activeTab === 'PENDING') {
                query = query.eq('status', 'PENDING');
            } else {
                 query = query.neq('status', 'PENDING');
            }

            const { data, error, count } = await query.range(from, to);
            if (error) throw error;
            setHasMore((count || 0) > to + 1);
            
            const mappedData: WithdrawDetails[] = (data || []).map(t => {
                // Simple heuristic parsing for description: "Withdrawal request via bKash to 017... . Fee: ..."
                let method = 'Unknown';
                let account_number = '';
                
                const desc = t.description || '';
                const viaIndex = desc.indexOf('via ');
                const toIndex = desc.indexOf(' to ');
                const feeIndex = desc.indexOf('. Fee:');

                if (viaIndex !== -1 && toIndex !== -1) {
                    method = desc.substring(viaIndex + 4, toIndex).trim();
                    if (feeIndex !== -1) {
                        account_number = desc.substring(toIndex + 4, feeIndex).trim();
                    } else {
                        account_number = desc.substring(toIndex + 4).trim();
                    }
                }

                return {
                    id: t.id,
                    username: t.profiles?.username || 'Unknown',
                    amount: t.amount,
                    date: t.created_at,
                    status: t.status,
                    description: t.description,
                    method,
                    account_number
                };
            });

            setWithdrawals(mappedData);
            setFilteredWithdrawals(mappedData);

        } catch (e: any) {
            console.error("Error fetching withdrawals", e);
        } finally {
            setLoading(false);
        }
    }, [activeTab, page]);

    useEffect(() => {
        setPage(1);
    }, [activeTab]);

    useEffect(() => {
        fetchWithdrawals();
    }, [fetchWithdrawals]);

    // Client-side search
    useEffect(() => {
        if (!searchTerm) {
            setFilteredWithdrawals(withdrawals);
            return;
        }
        const lowerTerm = searchTerm.toLowerCase();
        const filtered = withdrawals.filter(w => 
            w.username.toLowerCase().includes(lowerTerm) ||
            w.account_number?.includes(lowerTerm) ||
            w.method?.toLowerCase().includes(lowerTerm) ||
            Math.abs(w.amount).toString().includes(lowerTerm)
        );
        setFilteredWithdrawals(filtered);
    }, [searchTerm, withdrawals]);

    const openDetails = (trx: WithdrawDetails) => {
        setSelectedWithdraw(trx);
    };

    const handleProcessWithdrawal = async (transactionId: string, isApproved: boolean) => {
        if (!supabase) return;
        const action = isApproved ? 'approve' : 'reject';
        if (!window.confirm(`Are you sure you want to ${action} this withdrawal?`)) return;

        try {
            const { error } = await supabase.rpc('process_withdrawal', {
                transaction_id_to_process: transactionId,
                is_approved: isApproved
            });
            if (error) throw error;
            alert(`Withdrawal ${action}ed successfully.`);
            setSelectedWithdraw(null);
            fetchWithdrawals();
        } catch (e: any) {
            alert(`Failed to ${action} withdrawal: ${e.message}`);
        }
    };

    const StatusBadge = ({ status }: { status: TransactionStatus }) => {
        const style: React.CSSProperties = { padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' };
        switch (status) {
            case TransactionStatus.COMPLETED: style.backgroundColor = '#c6f6d5'; style.color = '#2f855a'; break;
            case TransactionStatus.PENDING: style.backgroundColor = '#fed7d7'; style.color = '#c53030'; break;
            case TransactionStatus.REJECTED: style.backgroundColor = '#f7fafc'; style.color = '#718096'; break;
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
    const modalContentStyle: React.CSSProperties = { backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '90%', maxWidth: '500px' };
    const detailRowStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #eee' };
    const detailLabelStyle: React.CSSProperties = { fontWeight: 'bold', color: '#555' };
    const tabContainerStyle: React.CSSProperties = { display: 'flex', gap: '0.5rem', marginBottom: '1rem' };
    const tabButtonStyle: React.CSSProperties = { padding: '0.5rem 1.5rem', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 600 };
    const activeTabStyle: React.CSSProperties = { backgroundColor: '#f56565', color: 'white' };
    const inactiveTabStyle: React.CSSProperties = { backgroundColor: '#e2e8f0', color: '#4a5568' };
    const paginationContainerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid #edf2f7' };
    const pageBtnStyle: React.CSSProperties = { padding: '0.5rem 1rem', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '0.9rem' };

    return (
        <div>
            <h1 style={headerStyle} className="admin-page-header">Withdraw Management</h1>
            
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
                placeholder="Search Username, Number, Method..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc', marginBottom: '1rem', width: '100%', maxWidth: '400px', fontSize: '1rem' }}
            />

            <div style={containerStyle} className="table-container">
                {loading && <p style={{padding: '1rem'}}>Loading...</p>}
                {!loading && filteredWithdrawals.length === 0 && <p style={{padding: '1rem', color: '#666'}}>No withdrawals found.</p>}
                {!loading && filteredWithdrawals.length > 0 && (
                    <table style={tableStyle} className="responsive-admin-table">
                        <thead>
                            <tr>
                                <th style={thStyle}>Username</th>
                                <th style={thStyle}>Amount</th>
                                <th style={thStyle}>Method</th>
                                <th style={thStyle}>Number</th>
                                <th style={thStyle}>Date</th>
                                <th style={thStyle}>Status</th>
                                <th style={thStyle}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredWithdrawals.map((d) => (
                                <tr key={d.id}>
                                    <td data-label="Username" style={{...tdStyle, fontWeight: 'bold'}}>{d.username}</td>
                                    <td data-label="Amount" style={{...tdStyle, color: 'red'}}>{currencySymbol}{Math.abs(d.amount)}</td>
                                    <td data-label="Method" style={tdStyle}>{d.method}</td>
                                    <td data-label="Number" style={tdStyle}>{d.account_number}</td>
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

            {selectedWithdraw && (
                <div style={modalOverlayStyle} onClick={() => setSelectedWithdraw(null)}>
                    <div style={modalContentStyle} onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginTop: 0 }}>Withdraw Details</h2>
                        <div style={detailRowStyle}>
                            <span style={detailLabelStyle}>Transaction ID</span>
                            <span style={{fontFamily: 'monospace'}}>{selectedWithdraw.id}</span>
                        </div>
                        <div style={detailRowStyle}>
                            <span style={detailLabelStyle}>Username</span>
                            <span>{selectedWithdraw.username}</span>
                        </div>
                        <div style={detailRowStyle}>
                            <span style={detailLabelStyle}>Method</span>
                            <span>{selectedWithdraw.method}</span>
                        </div>
                         <div style={detailRowStyle}>
                            <span style={detailLabelStyle}>Account Number</span>
                            <span style={{fontWeight: 'bold', fontSize: '1.1rem'}}>{selectedWithdraw.account_number}</span>
                        </div>
                        <div style={detailRowStyle}>
                            <span style={detailLabelStyle}>Amount</span>
                            <span style={{fontWeight: 'bold', fontSize: '1.2rem', color: 'red'}}>{currencySymbol}{Math.abs(selectedWithdraw.amount).toFixed(2)}</span>
                        </div>
                        <div style={detailRowStyle}>
                            <span style={detailLabelStyle}>Date</span>
                            <span>{new Date(selectedWithdraw.date).toLocaleString()}</span>
                        </div>
                        <div style={detailRowStyle}>
                            <span style={detailLabelStyle}>Status</span>
                            <StatusBadge status={selectedWithdraw.status} />
                        </div>
                        
                         <div style={{marginTop: '1rem', padding: '0.5rem', backgroundColor: '#f7fafc', borderRadius: '4px'}}>
                             <p style={{margin: '0 0 0.5rem 0', fontSize: '0.8rem', fontWeight: 'bold', color: '#666'}}>Full Description:</p>
                             <p style={{margin: 0, fontSize: '0.9rem'}}>{selectedWithdraw.description}</p>
                        </div>
                        
                        {selectedWithdraw.status === 'PENDING' && (
                            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button onClick={() => handleProcessWithdrawal(selectedWithdraw.id, false)} style={{...buttonStyle, backgroundColor: '#f56565', padding: '0.8rem 1.5rem', fontSize: '1rem'}}>Reject</button>
                                <button onClick={() => handleProcessWithdrawal(selectedWithdraw.id, true)} style={{...buttonStyle, backgroundColor: '#48bb78', padding: '0.8rem 1.5rem', fontSize: '1rem'}}>Approve</button>
                            </div>
                        )}
                        <button onClick={() => setSelectedWithdraw(null)} style={{...buttonStyle, backgroundColor: '#718096', marginTop: '1rem', width: '100%'}}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WithdrawManagement;