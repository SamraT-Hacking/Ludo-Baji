import React, { useState, useEffect } from 'react';
import { Shield, Search, Lock, Unlock, RefreshCw, User, Globe, Calendar, AlertCircle, CheckCircle, BarChart, ToggleLeft, ToggleRight, Server } from 'lucide-react';

const API_URL = 'http://localhost:4000/api';

function App() {
  const [token, setToken] = useState(localStorage.getItem('admin_token'));
  const [password, setPassword] = useState('');
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [serverMode, setServerMode] = useState('live');

  useEffect(() => {
    if (token) {
      fetchLicenses();
      fetchServerMode();
    }
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('admin_token', data.token);
        setToken(data.token);
        setError('');
      } else {
        setError('Invalid Password');
      }
    } catch (err) {
      setError('Connection failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
  };

  const fetchLicenses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/licenses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      const data = await res.json();
      setLicenses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchServerMode = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/mode`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setServerMode(data.mode);
    } catch (err) {
      console.error("Failed to fetch mode", err);
    }
  };

  const toggleServerMode = async () => {
    const newMode = serverMode === 'live' ? 'test' : 'live';
    if (!confirm(`Switch system to ${newMode.toUpperCase()} mode? \n\n${newMode === 'test' ? 'Test Mode allows bypass codes and loose API validation.' : 'Live Mode enforces strict API and Domain checks.'}`)) return;

    try {
      const res = await fetch(`${API_URL}/admin/mode`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ mode: newMode })
      });
      const data = await res.json();
      if (data.success) setServerMode(newMode);
    } catch (err) {
      alert("Failed to update mode");
    }
  };

  const toggleBlock = async (id, currentStatus) => {
    if (!confirm(`Are you sure you want to ${currentStatus === 'active' ? 'BLOCK' : 'UNBLOCK'} this license?`)) return;
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
    
    await fetch(`${API_URL}/admin/block`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ id, status: newStatus })
    });
    fetchLicenses();
  };

  const forceDeactivate = async (id) => {
    if (!confirm("This will clear the domain lock, allowing the buyer to install on a new domain. Continue?")) return;
    
    await fetch(`${API_URL}/admin/deactivate`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ id })
    });
    fetchLicenses();
  };

  const filteredLicenses = licenses.filter(l => 
    l.purchase_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.buyer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.domain || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: licenses.length,
    active: licenses.filter(l => l.status === 'active').length,
    blocked: licenses.filter(l => l.status === 'blocked').length,
    extended: licenses.filter(l => l.license_type && l.license_type.includes('Extended')).length
  };

  // --- Styles ---
  const containerStyle = { padding: '2rem', maxWidth: '1400px', margin: '0 auto' };
  const cardStyle = { backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '2rem' };
  const tableStyle = { width: '100%', borderCollapse: 'collapse', marginTop: '1rem' };
  const thStyle = { textAlign: 'left', padding: '1rem', borderBottom: '2px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.875rem' };
  const tdStyle = { padding: '1rem', borderBottom: '1px solid var(--border)', color: 'var(--text-main)' };
  const badgeStyle = (color) => ({ backgroundColor: `${color}20`, color: color, padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' });
  const btnStyle = { padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', transition: 'opacity 0.2s' };

  if (!token) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <form onSubmit={handleLogin} style={{ ...cardStyle, width: '100%', maxWidth: '400px' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <Shield size={48} color="var(--primary)" />
            <h1 style={{ marginTop: '1rem' }}>Admin Login</h1>
          </div>
          {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
          <input 
            type="password" 
            placeholder="Enter Admin Password" 
            value={password} 
            onChange={e => setPassword(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: '#0f172a', color: 'white', marginBottom: '1rem' }}
          />
          <button type="submit" style={{ ...btnStyle, backgroundColor: 'var(--primary)', color: 'white', width: '100%', justifyContent: 'center' }}>Access Dashboard</button>
        </form>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Shield size={32} color="var(--primary)" />
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>License Manager</h1>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {/* Mode Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--bg-card)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <Server size={16} color="var(--text-muted)" />
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>System Mode:</span>
            <button 
              onClick={toggleServerMode}
              style={{ 
                background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                color: serverMode === 'live' ? 'var(--success)' : '#f59e0b',
                fontWeight: 'bold', fontSize: '0.875rem'
              }}
            >
              {serverMode === 'live' ? 'LIVE' : 'TEST'}
              {serverMode === 'live' ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
            </button>
          </div>

          <button onClick={handleLogout} style={{ ...btnStyle, backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Logout</button>
        </div>
      </header>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={cardStyle}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Licenses</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.total}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Active Installations</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>{stats.active}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Extended Licenses</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#a855f7' }}>{stats.extended}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Blocked</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--danger)' }}>{stats.blocked}</div>
        </div>
      </div>

      {/* Main Content */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ margin: 0 }}>Buyer List</h2>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search code, domain, buyer..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ padding: '0.6rem 1rem 0.6rem 2.5rem', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: '#0f172a', color: 'white', width: '300px' }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Buyer</th>
                <th style={thStyle}>Purchase Code</th>
                <th style={thStyle}>Item</th>
                <th style={thStyle}>License Type</th>
                <th style={thStyle}>Domain</th>
                <th style={thStyle}>Activation Date</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{...tdStyle, textAlign: 'center'}}>Loading...</td></tr>
              ) : filteredLicenses.length === 0 ? (
                <tr><td colSpan={8} style={{...tdStyle, textAlign: 'center'}}>No licenses found.</td></tr>
              ) : (
                filteredLicenses.map(license => (
                  <tr key={license.id}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={16} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{license.buyer || 'Unknown'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontFamily: 'monospace', background: '#334155', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                        {license.purchase_code}
                      </div>
                    </td>
                    <td style={tdStyle}>{license.item_name}</td>
                    <td style={tdStyle}>
                      {license.license_type && license.license_type.includes('Extended') ? (
                        <span style={badgeStyle('#a855f7')}><BarChart size={12} /> Extended</span>
                      ) : (
                        <span style={badgeStyle('#94a3b8')}>Regular</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      {license.domain ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Globe size={14} color="var(--text-muted)" />
                          <a href={`//${license.domain}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>{license.domain}</a>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not Installed</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                        <Calendar size={14} />
                        {new Date(license.activated_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      {license.status === 'blocked' ? (
                        <span style={badgeStyle('var(--danger)')}><AlertCircle size={12} /> Blocked</span>
                      ) : (
                        <span style={badgeStyle('var(--success)')}><CheckCircle size={12} /> Active</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => toggleBlock(license.id, license.status || 'active')}
                          title={license.status === 'active' ? "Block License" : "Unblock License"}
                          style={{ ...btnStyle, backgroundColor: license.status === 'active' ? '#ef444420' : '#22c55e20', color: license.status === 'active' ? 'var(--danger)' : 'var(--success)' }}
                        >
                          {license.status === 'active' ? <Lock size={16} /> : <Unlock size={16} />}
                        </button>
                        <button 
                          onClick={() => forceDeactivate(license.id)}
                          title="Force Deactivate (Reset Domain)"
                          disabled={!license.domain}
                          style={{ ...btnStyle, backgroundColor: '#3b82f620', color: 'var(--primary)', opacity: !license.domain ? 0.5 : 1, cursor: !license.domain ? 'not-allowed' : 'pointer' }}
                        >
                          <RefreshCw size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;