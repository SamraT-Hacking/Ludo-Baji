
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { supabase } from '../utils/supabase';
import { Transaction, TransactionType } from '../types';
import { AppConfigContext } from '../App';

const TransactionHistory: React.FC = () => {
    const { currencySymbol } = useContext(AppConfigContext);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTransactions = useCallback(async () => {
        if (!supabase) return;
        try {
            const { data: { user } } = await (supabase.auth as any).getUser();
            if (!user) throw new Error("User not authenticated");

            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTransactions(data as Transaction[]);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);
    
    useEffect(() => {
        if (!supabase) return;
        
        const setupSubscription = async () => {
            const { data: { user } } = await (supabase as any).auth.getUser();
            if (!user) return;

            const channel = supabase.channel('transaction-history-realtime')
                .on('postgres_changes', { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'transactions', 
                    filter: `user_id=eq.${user.id}` 
                }, fetchTransactions)
                .on('postgres_changes', { 
                    event: 'UPDATE', 
                    schema: 'public', 
                    table: 'transactions', 
                    filter: `user_id=eq.${user.id}` 
                }, fetchTransactions)
                .subscribe();
            
            return () => supabase.removeChannel(channel);
        };
        
        const unsub = setupSubscription();
        return () => { unsub.then(fn => fn && fn()); };
    }, [fetchTransactions]);

    const headerStyle: React.CSSProperties = { fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', marginBottom: '2rem', borderBottom: '1px solid #ddd', paddingBottom: '1rem' };

    return (
        <div>
            <h1 style={headerStyle}>Transaction History</h1>
            <div className="transaction-history-container">
                {loading && <p>Loading history...</p>}
                {error && <p style={{color: 'red'}}>Error: {error}</p>}
                {!loading && (
                    <>
                        {transactions.length > 0 ? transactions.map(t => {
                            const isCredit = [TransactionType.DEPOSIT, TransactionType.WINNINGS, TransactionType.REFUND, TransactionType.REFERRAL_BONUS].includes(t.type);
                            const displayAmount = Math.abs(Number(t.amount)).toFixed(2);
                            const sign = isCredit ? '+' : '-';
                            const amountClass = isCredit ? 'credit' : 'debit';
                            const statusClass = `status-${t.status.toLowerCase()}`;

                            return (
                                <div key={t.id} className="transaction-card">
                                    <div className="transaction-card-main">
                                        <div className="transaction-details">
                                            <span className="transaction-description">{t.description || t.type}</span>
                                            <span className="transaction-date">{new Date(t.created_at).toLocaleString()}</span>
                                        </div>
                                        <div className={`transaction-amount ${amountClass}`}>
                                            {sign}{currencySymbol}{displayAmount}
                                        </div>
                                    </div>
                                    <div className="transaction-card-footer">
                                        <span className={`transaction-status-badge ${statusClass}`}>{t.status}</span>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div style={{textAlign: 'center', padding: '2rem', color: '#666', backgroundColor: 'var(--white)', borderRadius: '12px'}}>
                                No transactions found.
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default TransactionHistory;
