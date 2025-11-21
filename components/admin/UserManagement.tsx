import React, { useState, useEffect, useCallback, useContext } from 'react';
import { supabase } from '../../utils/supabase';
import { AppConfigContext } from '../../App';
import { CopyIconSVG } from '../../assets/icons';

interface UserManagementProps {
    onSelectUser: (userId: string) => void;
}

const ITEMS_PER_PAGE = 20;

const UserManagement: React.FC<UserManagementProps> = ({ onSelectUser }) => {
    const { currencySymbol } = useContext(AppConfigContext);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    
    // New state for missing RPC detection
    const [missingRpc, setMissingRpc] = useState(false);
    const [showSqlModal, setShowSqlModal] = useState(false);
    const [copied, setCopied] = useState(false);

    const fetchUsers = useCallback(async () => {
        if (!supabase) return;
        setLoading(true);
        setError(null);
        try {
            const from = (page - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            // Attempt to fetch using the Admin RPC for full details
            const { data: rpcData, error: rpcError } = await supabase.rpc('get_admin_users_list');

            if (!rpcError && rpcData) {
                setMissingRpc(false);
                let filteredData = rpcData || [];
            
                if (searchTerm) {
                    const lowerTerm = searchTerm.toLowerCase();
                    filteredData = filteredData.filter((u: any) => 
                        (u.username && u.username.toLowerCase().includes(lowerTerm)) ||
                        (u.id && u.id.toLowerCase().includes(lowerTerm)) ||
                        (u.email && u.email.toLowerCase().includes(lowerTerm)) || 
                        (u.phone && u.phone.toLowerCase().includes(lowerTerm))
                    );
                }
                
                // Client-side pagination for RPC data
                const paginatedData = filteredData.slice(from, from + ITEMS_PER_PAGE);
                setUsers(paginatedData);
                setHasMore(filteredData.length > from + ITEMS_PER_PAGE);

            } else {
                // Fallback to standard profiles fetch
                if (rpcError) {
                    if (rpcError.code === '42883' || rpcError.message.includes('function')) {
                         setMissingRpc(true);
                    }
                }
                
                let query = supabase
                    .from('profiles')
                    .select('*', { count: 'exact' }) 
                    .order('created_at', { ascending: false });

                if (searchTerm) {
                    query = query.or(`username.ilike.%${searchTerm}%,id.eq.${searchTerm}`);
                }

                const { data, error, count } = await query.range(from, to);
                
                if (error) throw error;

                setUsers(data || []);
                setHasMore((count || 0) > to + 1);
            }
        } catch (e: any) {
            setError("Failed to load users: " + e.message);
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [searchTerm, page]);

    useEffect(() => {
        setPage(1);
    }, [searchTerm]);

    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchUsers();
        }, 300);
        return () => clearTimeout(debounce);
    }, [fetchUsers, searchTerm, page]);

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

    const headerStyle: React.CSSProperties = { fontSize: '2rem', marginBottom: '1rem' };
    const searchInputStyle: React.CSSProperties = { width: '100%', maxWidth: '400px', padding: '0.75rem', marginBottom: '1.5rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '1rem' };
    const containerStyle: React.CSSProperties = { backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.05)' };
    const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' };
    const thStyle: React.CSSProperties = { padding: '1rem', textAlign: 'left', backgroundColor: '#f7fafc', borderBottom: '2px solid #edf2f7', color: '#4a5568' };
    const tdStyle: React.CSSProperties = { padding: '1rem', borderBottom: '1px solid #edf2f7' };
    const actionButtonStyle: React.CSSProperties = { padding: '0.4rem 1rem', borderRadius: '5px', border: 'none', cursor: 'pointer', color: 'white', backgroundColor: '#4299e1', fontWeight: 'bold', fontSize: '0.9rem' };
    const alertStyle: React.CSSProperties = { backgroundColor: '#fffaf0', border: '1px solid #fbd38d', color: '#9c4221', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' };
    const modalOverlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 101 };
    const paginationContainerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid #edf2f7' };
    const pageBtnStyle: React.CSSProperties = { padding: '0.5rem 1rem', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '0.9rem' };

    return (
        <div>
            <h1 style={headerStyle} className="admin-page-header">User Management</h1>
            
            {missingRpc && (
                <div style={alertStyle}>
                    <div>
                        <strong>Database Update Available:</strong> Click 'Fix Database' to enable Last Login view and pagination support.
                    </div>
                    <button 
                        onClick={() => setShowSqlModal(true)}
                        style={{ backgroundColor: '#ed8936', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}
                    >
                        Fix Database
                    </button>
                </div>
            )}

            <input 
                type="text"
                placeholder="Search by Username, ID, or Phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={searchInputStyle}
            />
            {loading && <p>Loading users...</p>}
            {error && <div style={{color: '#c53030', backgroundColor: '#fff5f5', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #feb2b2'}}>{error}</div>}
            
            {!loading && !error && (
            <div style={containerStyle} className="table-container">
                <table style={tableStyle} className="responsive-admin-table">
                    <thead>
                        <tr>
                            <th style={thStyle}>Serial</th>
                            <th style={thStyle}>Username</th>
                            <th style={thStyle}>Email</th>
                            <th style={thStyle}>Phone</th>
                            <th style={thStyle}>Balance</th>
                            <th style={thStyle}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user, index) => {
                             const totalBalance = (user.deposit_balance || 0) + (user.winnings_balance || 0);
                             const email = user.email || 'N/A';
                             const phone = user.phone || user.mobile || 'N/A';
                             const serial = (page - 1) * ITEMS_PER_PAGE + index + 1;
                             
                             return (
                                <tr key={user.id}>
                                    <td data-label="Serial" style={tdStyle}>#{serial}</td>
                                    <td data-label="Username" style={{...tdStyle, fontWeight: 'bold'}}>
                                        {user.username || 'Unknown'}
                                        {user.is_banned && <span style={{color: 'red', fontSize: '0.8rem', marginLeft: '5px', fontWeight: 'bold'}}>(BANNED)</span>}
                                    </td>
                                    <td data-label="Email" style={{...tdStyle, fontSize: '0.9rem'}}>{email}</td>
                                    <td data-label="Phone" style={{...tdStyle, fontFamily: 'monospace', fontSize: '0.9rem'}}>{phone}</td>
                                    <td data-label="Balance" style={{...tdStyle, color: 'green', fontWeight: '600'}}>
                                        {currencySymbol}{totalBalance.toFixed(2)}
                                    </td>
                                    <td data-label="Action" style={tdStyle}>
                                        <button 
                                            onClick={() => onSelectUser(user.id)}
                                            style={actionButtonStyle}
                                        >
                                            User Details
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {users.length === 0 && (
                            <tr>
                                <td colSpan={6} style={{textAlign: 'center', padding: '2rem', color: '#666'}}>No users found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
                
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
                                onClick={() => { setShowSqlModal(false); fetchUsers(); }} 
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

export default UserManagement;