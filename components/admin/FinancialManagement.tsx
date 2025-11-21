import React, { useState, useEffect, useCallback, useContext } from 'react';
import { supabase } from '../../utils/supabase';
import { Transaction, TransactionStatus, TransactionType } from '../../types';
import { AppConfigContext } from '../../App';

const ITEMS_PER_PAGE = 20;

const FinancialManagement: React.FC = () => {
    const { currencySymbol } = useContext(AppConfigContext);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [typeFilter, setTypeFilter] = useState<TransactionType | 'ALL'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    const fetchTransactions = useCallback(async () => {
        if (!supabase) return;
        setLoading(true);
        setError(null); 
        try {
            const from = (page - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            let query = supabase
                .from('transactions')
                .select('*, profiles:user_id(username)', { count: 'exact' })
                .order('created_at', { ascending: false });

            if (typeFilter !== 'ALL') {
                query = query.eq('type', typeFilter);
            }

            if (dateFilter) {
                // Filter by specific date (ignoring time)
                const startDate = new Date(dateFilter);
                const endDate = new Date(dateFilter);
                endDate.setDate(endDate.getDate() + 1);
                query = query.gte('created_at', startDate.toISOString()).lt('created_at', endDate.toISOString());
            }

            if (searchTerm) {
                // Search by Transaction ID or Description.
                query = query.or(`id.eq.${searchTerm},description.ilike.%${searchTerm}%`);
            }

            const { data, error, count } = await query.range(from, to);
            if (error) throw error;
            
            setTransactions(data as any[] || []);
            setHasMore((count || 0) > to + 1);
        } catch (e: any) {
            setError("Failed to load transactions.");
            console.error(e); 
        } finally {
            setLoading(false);
        }
    }, [typeFilter, dateFilter, searchTerm, page]);

    useEffect(() => {
        setPage(1);
    }, [typeFilter, dateFilter, searchTerm]);

    useEffect(() => {
        const debounce = setTimeout(() => fetchTransactions(), 500);
        return () => clearTimeout(debounce);
    }, [fetchTransactions]);

    const StatusBadge = ({ status }: { status: TransactionStatus }) => {
        const style: React.CSSProperties = { padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' };
        switch (status) {
            case TransactionStatus.COMPLETED: style.backgroundColor = '#c6f6d5'; style.color = '#2f855a'; break;
            case TransactionStatus.PENDING: style.backgroundColor = '#fed7d7'; style.color = '#c53030'; break;
            case TransactionStatus.FAILED:
            case TransactionStatus.REJECTED: style.backgroundColor = '#f7fafc'; style.color = '#718096'; break;
            default: style.backgroundColor = '#e2e8f0'; style.color = '#4a5568';
        }
        return <span style={style}>{status}</span>;
    };
    
    const filters: (TransactionType | 'ALL')[] = ['ALL', TransactionType.DEPOSIT, TransactionType.WITHDRAWAL, TransactionType.WINNINGS, TransactionType.ENTRY_FEE, TransactionType.REFUND];

    const headerStyle: React.CSSProperties = { fontSize: '2rem', marginBottom: '1rem' };
    const containerStyle: React.CSSProperties = { backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.05)' };
    const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' };
    const thStyle: React.CSSProperties = { padding: '1rem', textAlign: 'left', backgroundColor: '#f7fafc', borderBottom: '2px solid #edf2f7', color: '#4a5568' };
    const tdStyle: React.CSSProperties = { padding: '1rem', borderBottom: '1px solid #edf2f7' };
    const filterContainerStyle: React.CSSProperties = { marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' };
    const filterButtonStyle: React.CSSProperties = { padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #ccc', cursor: 'pointer' };
    const inputStyle: React.CSSProperties = { padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc' };
    const paginationContainerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid #edf2f7' };
    const pageBtnStyle: React.CSSProperties = { padding: '0.5rem 1rem', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '0.9rem' };

    return (
        <div>
            <h1 style={headerStyle} className="admin-page-header">All Transactions</h1>

            <div style={filterContainerStyle}>
                <input 
                    type="text" 
                    placeholder="Search UUID/Description..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    style={{...inputStyle, width: '250px'}}
                />
                <input 
                    type="date" 
                    value={dateFilter} 
                    onChange={e => setDateFilter(e.target.value)} 
                    style={inputStyle}
                />
            </div>
            <div style={filterContainerStyle}>
                {filters.map(f => (
                    <button key={f} onClick={() => setTypeFilter(f)} style={{ ...filterButtonStyle, backgroundColor: typeFilter === f ? '#e2e8f0' : 'white' }}>{f}</button>
                ))}
            </div>

            <div style={containerStyle} className="table-container">
                {loading && <p style={{padding: '1rem'}}>Loading transactions...</p>}
                {error && <p style={{padding: '1rem', color: 'red'}}>{error}</p>}
                {!loading && !error && (
                    <table style={tableStyle} className="responsive-admin-table">
                        <thead>
                            <tr>
                                <th style={thStyle}>User</th>
                                <th style={thStyle}>Amount</th>
                                <th style={thStyle}>Type/Details</th>
                                <th style={thStyle}>Date</th>
                                <th style={thStyle}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map(t => {
                                const isCredit = [TransactionType.DEPOSIT, TransactionType.WINNINGS, TransactionType.REFUND, TransactionType.REFERRAL_BONUS].includes(t.type);
                                const displayAmount = Math.abs(Number(t.amount)).toFixed(2);
                                const sign = isCredit ? '+' : '-';
                                const color = isCredit ? 'green' : 'red';
                                return (
                                    <tr key={t.id}>
                                        <td data-label="User" style={{...tdStyle, fontWeight: 'bold'}}>{t.profiles?.username || 'N/A'}</td>
                                        <td data-label="Amount" style={{...tdStyle, color }}>{sign}{currencySymbol}{displayAmount}</td>
                                        <td data-label="Type/Details" style={tdStyle}>{t.description || t.type}</td>
                                        <td data-label="Date" style={tdStyle}>{new Date(t.created_at).toLocaleString()}</td>
                                        <td data-label="Status" style={tdStyle}><StatusBadge status={t.status} /></td>
                                    </tr>
                                )
                            })}
                            {transactions.length === 0 && <tr><td colSpan={5} style={{textAlign: 'center', padding: '2rem', color: '#666'}}>No transactions found.</td></tr>}
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
        </div>
    );
};

export default FinancialManagement;