
import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../../utils/supabase';
import { AppConfigContext } from '../../App';
import { 
    IdentityIconSVG, MoneyBagIconSVG, 
    TransactionHistoryIconSVG, TrophyIconSVG, UserGroupIconSVG,
    BanIconSVG, TrashIconSVG, CopyIconSVG, PlusIconSVG
} from '../../assets/icons';

interface UserDetailsProps {
    userId: string;
    onBack: () => void;
}

// Helper component for Cards
const DetailCard: React.FC<{ title: string; icon: string; children: React.ReactNode; gradient?: string }> = ({ title, icon, children, gradient }) => (
    <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        border: '1px solid #f0f0f0',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
    }}>
        <div style={{ 
            padding: '1rem 1.5rem', 
            background: gradient || 'linear-gradient(135deg, #f6f8fc 0%, #f0f4f8 100%)',
            borderBottom: '1px solid #eef2f6',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
        }}>
            <div style={{ color: gradient ? 'white' : '#4a5568' }} dangerouslySetInnerHTML={{ __html: icon }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: gradient ? 'white' : '#2d3748' }}>{title}</h3>
        </div>
        <div style={{ padding: '1.5rem', flex: 1 }}>
            {children}
        </div>
    </div>
);

const UserDetails: React.FC<UserDetailsProps> = ({ userId, onBack }) => {
    const { currencySymbol } = useContext(AppConfigContext);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [matchHistory, setMatchHistory] = useState<any[]>([]);
    const [referrals, setReferrals] = useState<any[]>([]);
    
    const [authData, setAuthData] = useState<{email?: string, phone?: string | null, last_sign_in_at?: string}>({});
    
    // State for missing RPC detection
    const [missingRpc, setMissingRpc] = useState(false);
    const [showSqlModal, setShowSqlModal] = useState(false);
    const [copied, setCopied] = useState(false);

    // State for Balance Management Modal
    const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
    const [balanceAction, setBalanceAction] = useState<'credit' | 'debit'>('credit');
    const [balanceAmount, setBalanceAmount] = useState('');
    const [balanceNote, setBalanceNote] = useState('');
    const [debitSource, setDebitSource] = useState<'deposit' | 'winnings'>('winnings'); // New state for debit source
    const [processingBalance, setProcessingBalance] = useState(false);

    const fetchData = async () => {
        if (!supabase) return;
        setLoading(true);
        try {
            // 1. Profile
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*') 
                .eq('id', userId)
                .single();
            
            if (profileError) throw profileError;
            setProfile(profileData);

            // 2. Transactions
            const { data: transData } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            setTransactions(transData || []);

            // 3. Game History
            const { data: gameData } = await supabase
                .from('tournament_results')
                .select('*, tournaments(title, prize_pool)')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            setMatchHistory(gameData || []);

            // 4. Referrals
            const { data: refData } = await supabase
                .from('profiles')
                .select('username, created_at')
                .eq('referred_by', userId);
            setReferrals(refData || []);
            
            // 5. Fetch Auth Data (Email/Phone/LastLogin) using RPC
            let email = profileData.email;
            let rpcPhone = null;
            let lastSignIn = null;
            
            const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_email_phone', { user_id: userId });
            
            if (rpcError && (rpcError.code === '42883' || rpcError.message.includes('function'))) {
                setMissingRpc(true);
            }
            
            if (!rpcError && rpcData && rpcData.length > 0) {
                const data = rpcData[0];
                if (!email) email = data.email;
                if (data.phone) rpcPhone = data.phone;
                if (data.last_sign_in_at) lastSignIn = data.last_sign_in_at;
            }
            
            const finalPhone = rpcPhone || profileData.phone || null;

            setAuthData({
                email: email || 'Hidden (Auth Restricted)', 
                phone: finalPhone, 
                last_sign_in_at: lastSignIn 
            });

        } catch (err) {
            console.error("Error fetching user details:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [userId]);

    const handleBanUser = async () => {
        if (!supabase || !profile) return;
        const newStatus = !profile.is_banned;
        if (window.confirm(`Are you sure you want to ${newStatus ? 'BAN' : 'UNBAN'} this user?`)) {
            const { error } = await supabase.from('profiles').update({ is_banned: newStatus }).eq('id', userId);
            if (!error) {
                setProfile({ ...profile, is_banned: newStatus });
                alert(`User ${newStatus ? 'banned' : 'unbanned'} successfully.`);
            } else {
                alert("Error updating status: " + error.message);
            }
        }
    };

    const handleDeleteUser = async () => {
        if (window.confirm("DANGER: Are you sure you want to DELETE this user? This action removes all their data and cannot be undone easily.")) {
            alert("To permanently delete a user including Auth data, please use the Supabase Dashboard or a backend Admin function for security.");
        }
    };

    const openBalanceModal = (action: 'credit' | 'debit') => {
        setBalanceAction(action);
        setBalanceAmount('');
        setBalanceNote('');
        setDebitSource('winnings'); // Reset to default
        setIsBalanceModalOpen(true);
    };

    const handleBalanceSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase || !profile) return;

        const amount = parseFloat(balanceAmount);
        if (isNaN(amount) || amount <= 0) {
            alert("Please enter a valid positive amount.");
            return;
        }

        // Check sufficient balance for debit
        if (balanceAction === 'debit') {
            if (debitSource === 'winnings' && amount > profile.winnings_balance) {
                alert(`Insufficient winnings balance. User has ${currencySymbol}${profile.winnings_balance.toFixed(2)}.`);
                return;
            }
            if (debitSource === 'deposit' && amount > profile.deposit_balance) {
                alert(`Insufficient deposit balance. User has ${currencySymbol}${profile.deposit_balance.toFixed(2)}.`);
                return;
            }
        }

        setProcessingBalance(true);
        try {
            if (balanceAction === 'credit') {
                // Update Profile: Add to Deposit Balance
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({ deposit_balance: Number(profile.deposit_balance) + amount })
                    .eq('id', userId);
                
                if (profileError) throw profileError;

                // Add Transaction Record
                const { error: txError } = await supabase
                    .from('transactions')
                    .insert({
                        user_id: userId,
                        amount: amount,
                        type: 'DEPOSIT',
                        status: 'COMPLETED',
                        description: `Added Money From Admin ${balanceNote ? '- ' + balanceNote : ''}`
                    });
                if (txError) throw txError;

            } else {
                // DEBIT LOGIC
                let updateData = {};
                let descSource = '';

                if (debitSource === 'winnings') {
                    updateData = { winnings_balance: Number(profile.winnings_balance) - amount };
                    descSource = '(Winning Balance)';
                } else {
                    updateData = { deposit_balance: Number(profile.deposit_balance) - amount };
                    descSource = '(Deposit Balance)';
                }

                // Update Profile: Deduct
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update(updateData)
                    .eq('id', userId);
                
                if (profileError) throw profileError;

                // Add Transaction Record
                const { error: txError } = await supabase
                    .from('transactions')
                    .insert({
                        user_id: userId,
                        amount: -amount, 
                        type: 'WITHDRAWAL',
                        status: 'COMPLETED',
                        description: `Debit Money From Admin ${descSource} ${balanceNote ? '- ' + balanceNote : ''}`
                    });
                if (txError) throw txError;
            }

            alert(`${balanceAction === 'credit' ? 'Money Added' : 'Money Deducted'} successfully.`);
            setIsBalanceModalOpen(false);
            fetchData(); // Refresh all data

        } catch (e: any) {
            console.error("Balance update error:", e);
            alert(`Failed to update balance: ${e.message}`);
        } finally {
            setProcessingBalance(false);
        }
    };
    
    const handleCopySql = () => {
        const sql = `
-- 1. Check Admin Function (Dependency)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. User List Function (Retrieves phone & last login from Auth Metadata)
CREATE OR REPLACE FUNCTION public.get_admin_users_list()
RETURNS TABLE (
  id uuid,
  username text,
  email text,
  phone text,
  deposit_balance numeric,
  winnings_balance numeric,
  is_banned boolean,
  created_at timestamptz,
  last_sign_in_at timestamptz
) SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    au.email::text,
    COALESCE(au.phone, au.raw_user_meta_data->>'phone', au.raw_user_meta_data->>'mobile')::text as phone,
    p.deposit_balance,
    p.winnings_balance,
    p.is_banned,
    p.created_at,
    au.last_sign_in_at
  FROM public.profiles p
  LEFT JOIN auth.users au ON p.id = au.id
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 3. Single User Details Function (Retrieves phone & last login from Auth Metadata)
CREATE OR REPLACE FUNCTION public.get_user_email_phone(user_id uuid)
RETURNS TABLE (email text, phone text, last_sign_in_at timestamptz) 
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY 
  SELECT 
    au.email::text, 
    COALESCE(au.phone, au.raw_user_meta_data->>'phone', au.raw_user_meta_data->>'mobile')::text,
    au.last_sign_in_at
  FROM auth.users au 
  WHERE au.id = user_id;
END;
$$ LANGUAGE plpgsql;
`.trim();
        navigator.clipboard.writeText(sql);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading User Details...</div>;
    if (!profile) return <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>User not found.</div>;

    // -- Derived Stats --
    const currentBalance = (profile.deposit_balance || 0) + (profile.winnings_balance || 0);
    
    const lastDeposit = transactions.find(t => t.type === 'DEPOSIT' && t.status === 'COMPLETED');
    const lastWithdraw = transactions.find(t => t.type === 'WITHDRAWAL');
    
    const totalReferEarn = transactions
        .filter(t => t.type === 'REFERRAL_BONUS')
        .reduce((acc, t) => acc + Number(t.amount), 0);

    const totalMatches = (profile.wins || 0) + (profile.losses || 0);
    
    const lastActivityDisplay = authData.last_sign_in_at 
        ? `${new Date(authData.last_sign_in_at).toLocaleDateString()} ${new Date(authData.last_sign_in_at).toLocaleTimeString()}`
        : (profile.updated_at ? `${new Date(profile.updated_at).toLocaleDateString()} (Profile Update)` : 'N/A');

    // Styles
    const gridStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem',
        marginTop: '1.5rem'
    };

    const labelStyle: React.CSSProperties = { fontSize: '0.85rem', color: '#718096', marginBottom: '0.25rem', display: 'block' };
    const valueStyle: React.CSSProperties = { fontSize: '1.1rem', fontWeight: '600', color: '#2d3748', marginBottom: '1rem' };
    const rowStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #edf2f7', padding: '0.75rem 0' };
    const listScrollStyle: React.CSSProperties = { maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' };

    const btnStyle = (color: string): React.CSSProperties => ({
        padding: '0.6rem 1rem', borderRadius: '6px', border: 'none', color: 'white', cursor: 'pointer',
        background: color, fontWeight: 'bold', fontSize: '0.9rem', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
    });
    
    const alertStyle: React.CSSProperties = { backgroundColor: '#fffaf0', border: '1px solid #fbd38d', color: '#9c4221', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' };
    const modalOverlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 101 };
    const modalContentStyle: React.CSSProperties = { backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' };
    const inputStyle: React.CSSProperties = { width: '100%', padding: '0.8rem', marginBottom: '1rem', border: '1px solid #ccc', borderRadius: '6px', fontSize: '1rem' };

    return (
        <div className="user-details-page">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <button onClick={onBack} style={{ background: 'none', border: '1px solid #cbd5e0', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', fontSize: '1.2rem' }}>&larr;</button>
                <h1 style={{ margin: 0, fontSize: '1.8rem' }}>User Details: {profile.username}</h1>
            </div>

            {missingRpc && (
                <div style={alertStyle}>
                    <div>
                        <strong>Database Update Needed:</strong> To see full user details like 'Last Login', click 'Fix Database' and run the provided SQL in your Supabase project.
                    </div>
                    <button 
                        onClick={() => setShowSqlModal(true)}
                        style={{ backgroundColor: '#ed8936', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}
                    >
                        Fix Database
                    </button>
                </div>
            )}

            <div style={gridStyle}>
                {/* Card 1: Personal Information */}
                <DetailCard title="Personal Information" icon={IdentityIconSVG()} gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#e2e8f0', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', color: '#4a5568', fontWeight: 'bold' }}>
                            {profile.username?.charAt(0).toUpperCase()}
                        </div>
                        <h2 style={{ margin: 0 }}>{profile.username}</h2>
                        <span style={{ 
                            background: profile.is_banned ? '#fed7d7' : '#c6f6d5', 
                            color: profile.is_banned ? '#c53030' : '#2f855a',
                            padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold'
                        }}>
                            {profile.is_banned ? 'BANNED' : 'ACTIVE'}
                        </span>
                    </div>

                    <div>
                        <span style={labelStyle}>Email</span>
                        <div style={valueStyle}>{authData.email || 'N/A'}</div>
                        
                        <span style={labelStyle}>Phone</span>
                        <div style={{...valueStyle, fontFamily: 'monospace'}}>
                            {authData.phone || 'N/A'}
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <span style={labelStyle}>Joined</span>
                                <div style={{...valueStyle, fontSize: '0.9rem'}}>{new Date(profile.created_at).toLocaleDateString()}</div>
                            </div>
                            <div>
                                <span style={labelStyle}>Last Login (Activity)</span>
                                <div style={{...valueStyle, fontSize: '0.9rem'}}>{lastActivityDisplay}</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                        <button onClick={handleBanUser} style={btnStyle(profile.is_banned ? '#48bb78' : 'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)')}>
                            <div dangerouslySetInnerHTML={{__html: BanIconSVG()}} style={{width:'18px'}} />
                            {profile.is_banned ? 'Unban User' : 'Ban User'}
                        </button>
                        <button onClick={handleDeleteUser} style={btnStyle('linear-gradient(135deg, #434343 0%, #000000 100%)')}>
                            <div dangerouslySetInnerHTML={{__html: TrashIconSVG()}} style={{width:'18px'}} />
                            Delete User
                        </button>
                    </div>
                </DetailCard>

                {/* Card 2: Wallet Management */}
                <DetailCard title="Wallet Management" icon={MoneyBagIconSVG()} gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)">
                    <div style={{ textAlign: 'center', padding: '1rem', background: '#f7fafc', borderRadius: '8px', marginBottom: '1.5rem' }}>
                        <span style={labelStyle}>Current Balance</span>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2c5282' }}>{currencySymbol}{currentBalance.toFixed(2)}</div>
                    </div>

                    <div style={rowStyle}>
                        <span style={{ color: '#718096' }}>Deposit Balance</span>
                        <span style={{ fontWeight: 'bold' }}>{currencySymbol}{profile.deposit_balance?.toFixed(2)}</span>
                    </div>
                    <div style={rowStyle}>
                        <span style={{ color: '#718096' }}>Winnings Balance</span>
                        <span style={{ fontWeight: 'bold', color: '#48bb78' }}>{currencySymbol}{profile.winnings_balance?.toFixed(2)}</span>
                    </div>
                    <div style={rowStyle}>
                        <span style={{ color: '#718096' }}>Last Deposit</span>
                        <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>
                            {lastDeposit ? `${new Date(lastDeposit.created_at).toLocaleDateString()} (${currencySymbol}${lastDeposit.amount})` : 'Never'}
                        </span>
                    </div>
                    <div style={rowStyle}>
                        <span style={{ color: '#718096' }}>Last Withdraw</span>
                        <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>
                             {lastWithdraw ? `${new Date(lastWithdraw.created_at).toLocaleDateString()} (${currencySymbol}${Math.abs(lastWithdraw.amount)})` : 'Never'}
                        </span>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                        <button onClick={() => openBalanceModal('credit')} style={btnStyle('#48bb78')}>
                            <div dangerouslySetInnerHTML={{__html: PlusIconSVG()}} style={{width:'16px'}} />
                            Credit Deposit
                        </button>
                        <button onClick={() => openBalanceModal('debit')} style={btnStyle('#f56565')}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Debit Balance
                        </button>
                    </div>
                </DetailCard>

                {/* Card 3: Game Statistics */}
                <DetailCard title="Game Statistics" icon={TrophyIconSVG()} gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', textAlign: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ background: '#edf2f7', padding: '0.5rem', borderRadius: '6px' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{totalMatches}</div>
                            <div style={{ fontSize: '0.75rem', color: '#718096' }}>Played</div>
                        </div>
                        <div style={{ background: '#f0fff4', padding: '0.5rem', borderRadius: '6px', color: '#276749' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{profile.wins || 0}</div>
                            <div style={{ fontSize: '0.75rem' }}>Won</div>
                        </div>
                        <div style={{ background: '#fff5f5', padding: '0.5rem', borderRadius: '6px', color: '#c53030' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{profile.losses || 0}</div>
                            <div style={{ fontSize: '0.75rem' }}>Lost</div>
                        </div>
                    </div>
                    
                    <h4 style={{ fontSize: '0.9rem', color: '#4a5568', marginBottom: '0.5rem' }}>Recent History</h4>
                    <div style={listScrollStyle}>
                        {matchHistory.length === 0 ? <p style={{ fontSize: '0.85rem', color: '#a0aec0' }}>No records.</p> : (
                            <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                                <tbody>
                                    {matchHistory.map((match) => (
                                        <tr key={match.id} style={{ borderBottom: '1px solid #f7fafc' }}>
                                            <td style={{ padding: '4px 0' }}>{match.tournaments?.title || 'Match'}</td>
                                            <td style={{ padding: '4px 0', fontWeight: 'bold', color: match.result === 'WIN' ? 'green' : (match.result === 'LOSE' ? 'red' : 'grey') }}>
                                                {match.result}
                                            </td>
                                            <td style={{ padding: '4px 0', textAlign: 'right', color: '#a0aec0' }}>
                                                {new Date(match.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </DetailCard>

                {/* Card 4: Referral Information */}
                <DetailCard title="Referral Info" icon={UserGroupIconSVG()} gradient="linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)">
                     <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '1.5rem' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2b6cb0' }}>{referrals.length}</div>
                            <div style={{ fontSize: '0.8rem', color: '#718096' }}>Total Referred</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#276749' }}>{currencySymbol}{totalReferEarn.toFixed(2)}</div>
                            <div style={{ fontSize: '0.8rem', color: '#718096' }}>Total Earnings</div>
                        </div>
                    </div>

                    <h4 style={{ fontSize: '0.9rem', color: '#4a5568', marginBottom: '0.5rem' }}>Referred Users</h4>
                    <div style={listScrollStyle}>
                        {referrals.length === 0 ? <p style={{ fontSize: '0.85rem', color: '#a0aec0' }}>No referrals yet.</p> : (
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {referrals.map((ref, idx) => (
                                    <li key={idx} style={{ padding: '0.5rem 0', borderBottom: '1px solid #eee', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{ref.username || 'Unknown'}</span>
                                        <span style={{ color: '#a0aec0', fontSize: '0.8rem' }}>{new Date(ref.created_at).toLocaleDateString()}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </DetailCard>
            </div>

            {/* Card 5: Transaction History (Full Width) */}
            <div style={{ marginTop: '1.5rem' }}>
                <DetailCard title="Transaction History" icon={TransactionHistoryIconSVG()} gradient="linear-gradient(120deg, #fdfbfb 0%, #ebedee 100%)">
                    <div style={{ overflowX: 'auto' }}>
                        {transactions.length === 0 ? <p style={{ textAlign: 'center', padding: '2rem', color: '#a0aec0' }}>No transactions found.</p> : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', color: '#718096' }}>
                                        <th style={{ padding: '0.75rem' }}>Date</th>
                                        <th style={{ padding: '0.75rem' }}>Type</th>
                                        <th style={{ padding: '0.75rem' }}>Details</th>
                                        <th style={{ padding: '0.75rem' }}>Amount</th>
                                        <th style={{ padding: '0.75rem' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((t) => {
                                        const isCredit = ['DEPOSIT', 'WINNINGS', 'REFUND', 'REFERRAL_BONUS'].includes(t.type);
                                        return (
                                            <tr key={t.id} style={{ borderTop: '1px solid #edf2f7' }}>
                                                <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>{new Date(t.created_at).toLocaleString()}</td>
                                                <td style={{ padding: '0.75rem' }}>{t.type}</td>
                                                <td style={{ padding: '0.75rem' }}>{t.description}</td>
                                                <td style={{ padding: '0.75rem', fontWeight: 'bold', color: isCredit ? 'green' : 'red' }}>
                                                    {isCredit ? '+' : '-'}{currencySymbol}{Math.abs(t.amount).toFixed(2)}
                                                </td>
                                                <td style={{ padding: '0.75rem' }}>
                                                    <span style={{
                                                        padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 'bold',
                                                        background: t.status === 'COMPLETED' ? '#c6f6d5' : (t.status === 'PENDING' ? '#feebc8' : '#fed7d7'),
                                                        color: t.status === 'COMPLETED' ? '#22543d' : (t.status === 'PENDING' ? '#9c4221' : '#822727')
                                                    }}>
                                                        {t.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </DetailCard>
            </div>

            {/* Balance Management Modal */}
            {isBalanceModalOpen && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h2 style={{ marginTop: 0, marginBottom: '1rem', textAlign: 'center' }}>
                            {balanceAction === 'credit' ? 'Credit User Balance' : 'Debit User Balance'}
                        </h2>
                        <p style={{ textAlign: 'center', fontSize: '0.9rem', color: '#666', marginBottom: '1.5rem' }}>
                            {balanceAction === 'credit' 
                                ? 'Add funds to the user\'s DEPOSIT balance.' 
                                : 'Deduct funds from the user\'s account.'}
                        </p>
                        <form onSubmit={handleBalanceSubmit}>
                            
                            {balanceAction === 'debit' && (
                                <div style={{marginBottom: '1rem'}}>
                                    <label style={labelStyle}>Debit From</label>
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.9rem' }}>
                                            <input 
                                                type="radio" 
                                                name="debitSource" 
                                                value="winnings"
                                                checked={debitSource === 'winnings'}
                                                onChange={() => setDebitSource('winnings')}
                                                style={{ marginRight: '0.5rem' }}
                                            />
                                            Winning Balance ({currencySymbol}{profile.winnings_balance?.toFixed(2)})
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.9rem' }}>
                                            <input 
                                                type="radio" 
                                                name="debitSource" 
                                                value="deposit"
                                                checked={debitSource === 'deposit'}
                                                onChange={() => setDebitSource('deposit')}
                                                style={{ marginRight: '0.5rem' }}
                                            />
                                            Deposit Balance ({currencySymbol}{profile.deposit_balance?.toFixed(2)})
                                        </label>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label style={labelStyle}>Amount ({currencySymbol})</label>
                                <input 
                                    type="number" 
                                    value={balanceAmount} 
                                    onChange={e => setBalanceAmount(e.target.value)} 
                                    style={inputStyle}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                    required 
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Remark (Visible in Transaction)</label>
                                <input 
                                    type="text" 
                                    value={balanceNote} 
                                    onChange={e => setBalanceNote(e.target.value)} 
                                    style={inputStyle}
                                    placeholder="e.g., Bonus, Correction, Penalty"
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setIsBalanceModalOpen(false)} style={{ ...btnStyle('#718096'), flex: 1 }}>Cancel</button>
                                <button type="submit" style={{ ...btnStyle(balanceAction === 'credit' ? '#48bb78' : '#f56565'), flex: 1 }} disabled={processingBalance}>
                                    {processingBalance ? 'Processing...' : 'Confirm'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showSqlModal && (
                <div style={modalOverlayStyle}>
                    <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
                        <h2 style={{ marginTop: 0 }}>Database Setup</h2>
                        <p style={{ lineHeight: 1.5 }}>
                            To securely view user Emails, Phone numbers, and Last Login times, you must update specific helper functions in your Supabase database.
                            <br/><br/>
                            <strong>Instructions:</strong><br/>
                            1. Copy the SQL code below.<br/>
                            2. Go to your Supabase Dashboard.<br/>
                            3. Open the <strong>SQL Editor</strong> tab.<br/>
                            4. Paste and Run the code.
                        </p>
                        
                        <div style={{ backgroundColor: '#1e1e1e', color: '#d4d4d4', padding: '1rem', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.85rem', overflowX: 'auto', marginBottom: '1.5rem', position: 'relative' }}>
                            <button 
                                onClick={handleCopySql}
                                style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', cursor: 'pointer', padding: '4px', color: 'white' }}
                                title="Copy SQL"
                            >
                                <div dangerouslySetInnerHTML={{__html: CopyIconSVG(copied)}} />
                            </button>
                            <pre style={{ margin: 0 }}>{`-- 1. Check Admin Function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. User List Function
CREATE OR REPLACE FUNCTION public.get_admin_users_list()
RETURNS TABLE (
  id uuid,
  username text,
  email text,
  phone text,
  deposit_balance numeric,
  winnings_balance numeric,
  is_banned boolean,
  created_at timestamptz,
  last_sign_in_at timestamptz
) SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    au.email::text,
    COALESCE(au.phone, au.raw_user_meta_data->>'phone', au.raw_user_meta_data->>'mobile')::text as phone,
    p.deposit_balance,
    p.winnings_balance,
    p.is_banned,
    p.created_at,
    au.last_sign_in_at
  FROM public.profiles p
  LEFT JOIN auth.users au ON p.id = au.id
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 3. Single User Details Function
CREATE OR REPLACE FUNCTION public.get_user_email_phone(user_id uuid)
RETURNS TABLE (email text, phone text, last_sign_in_at timestamptz) 
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY 
  SELECT 
    au.email::text, 
    COALESCE(au.phone, au.raw_user_meta_data->>'phone', au.raw_user_meta_data->>'mobile')::text,
    au.last_sign_in_at
  FROM auth.users au 
  WHERE au.id = user_id;
END;
$$ LANGUAGE plpgsql;`}</pre>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button 
                                onClick={() => { setShowSqlModal(false); window.location.reload(); }} 
                                style={{ padding: '0.75rem 1.5rem', backgroundColor: '#4299e1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserDetails;
