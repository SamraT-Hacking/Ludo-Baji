
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../utils/supabase';
import { PopupNotification } from '../../types';
import { TrashIconSVG, CheckIconSVG, PlusIconSVG } from '../../assets/icons';

const PopupManagement: React.FC = () => {
    const [popups, setPopups] = useState<PopupNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<PopupNotification>>({
        title: '',
        image_url: '',
        action_btn_text: '',
        action_url: '',
        trigger_type: 'ALWAYS',
        frequency_limit: 1,
        auto_close_ms: 0,
        is_dismissible: true,
        is_active: true,
        schedule_start: '',
        schedule_end: ''
    });
    const [imageFile, setImageFile] = useState<File | null>(null);

    const fetchPopups = useCallback(async () => {
        if (!supabase) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('popup_notifications')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (!error && data) {
            setPopups(data as PopupNotification[]);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchPopups();
    }, [fetchPopups]);

    const handleImageUpload = async (file: File) => {
        if (!supabase) return null;
        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `popup_${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('popup-images')
                .upload(fileName, file);
            
            if (uploadError) throw uploadError;
            
            const { data } = supabase.storage.from('popup-images').getPublicUrl(fileName);
            return data.publicUrl;
        } catch (e) {
            alert('Image upload failed');
            return null;
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;

        let imageUrl = formData.image_url;
        if (imageFile) {
            const url = await handleImageUpload(imageFile);
            if (url) imageUrl = url;
        }

        const payload = {
            ...formData,
            image_url: imageUrl,
            // Ensure dates are null if empty string
            schedule_start: formData.schedule_start || null,
            schedule_end: formData.schedule_end || null
        };

        const { error } = await supabase.from('popup_notifications').insert([payload]);
        
        if (error) {
            alert(`Error: ${error.message}`);
        } else {
            setIsModalOpen(false);
            setFormData({
                title: '',
                image_url: '',
                action_btn_text: '',
                action_url: '',
                trigger_type: 'ALWAYS',
                frequency_limit: 1,
                auto_close_ms: 0,
                is_dismissible: true,
                is_active: true,
                schedule_start: '',
                schedule_end: ''
            });
            setImageFile(null);
            fetchPopups();
        }
    };

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        if (!supabase) return;
        await supabase.from('popup_notifications').update({ is_active: !currentStatus }).eq('id', id);
        fetchPopups();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this popup?")) return;
        if (!supabase) return;
        await supabase.from('popup_notifications').delete().eq('id', id);
        fetchPopups();
    };

    // Styles
    const headerStyle: React.CSSProperties = { fontSize: '2rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
    const buttonStyle: React.CSSProperties = { padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', color: 'white', fontWeight: 'bold' };
    const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', marginTop: '1rem', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden' };
    const thStyle: React.CSSProperties = { textAlign: 'left', padding: '1rem', backgroundColor: '#f7fafc', borderBottom: '2px solid #edf2f7' };
    const tdStyle: React.CSSProperties = { padding: '1rem', borderBottom: '1px solid #edf2f7' };
    const modalOverlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
    const modalContentStyle: React.CSSProperties = { backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' };
    const inputStyle: React.CSSProperties = { width: '100%', padding: '0.5rem', marginBottom: '1rem', borderRadius: '4px', border: '1px solid #ccc' };
    const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' };

    return (
        <div>
            <div style={headerStyle}>
                <h1 className="admin-page-header" style={{margin: 0}}>Live Popups</h1>
                <button onClick={() => setIsModalOpen(true)} style={{...buttonStyle, backgroundColor: '#48bb78', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                    <div dangerouslySetInnerHTML={{__html: PlusIconSVG()}} style={{width: '16px'}}/> Create Popup
                </button>
            </div>

            {loading ? <p>Loading...</p> : (
                <div className="table-container" style={{boxShadow: '0 4px 6px rgba(0,0,0,0.05)'}}>
                    <table style={tableStyle} className="responsive-admin-table">
                        <thead>
                            <tr>
                                <th style={thStyle}>Image</th>
                                <th style={thStyle}>Title</th>
                                <th style={thStyle}>Type</th>
                                <th style={thStyle}>Status</th>
                                <th style={thStyle}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {popups.map(p => (
                                <tr key={p.id}>
                                    <td style={tdStyle}>
                                        {p.image_url ? <img src={p.image_url} alt="popup" style={{width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px'}} /> : 'No Img'}
                                    </td>
                                    <td style={tdStyle}>
                                        <strong>{p.title || 'Untitled'}</strong><br/>
                                        <small style={{color: '#666'}}>{p.action_btn_text}</small>
                                    </td>
                                    <td style={tdStyle}>
                                        <span style={{padding: '2px 6px', borderRadius: '4px', backgroundColor: '#ebf8ff', color: '#2c5282', fontSize: '0.8rem'}}>{p.trigger_type}</span>
                                    </td>
                                    <td style={tdStyle}>
                                        <button 
                                            onClick={() => handleToggleActive(p.id, p.is_active)}
                                            style={{
                                                border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '12px',
                                                backgroundColor: p.is_active ? '#c6f6d5' : '#fed7d7',
                                                color: p.is_active ? '#22543d' : '#822727',
                                                fontWeight: 'bold', fontSize: '0.8rem'
                                            }}
                                        >
                                            {p.is_active ? 'ACTIVE' : 'DISABLED'}
                                        </button>
                                    </td>
                                    <td style={tdStyle}>
                                        <button onClick={() => handleDelete(p.id)} style={{background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer'}}>
                                            <div dangerouslySetInnerHTML={{__html: TrashIconSVG()}} style={{width: '18px'}} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {popups.length === 0 && <tr><td colSpan={5} style={{padding: '2rem', textAlign: 'center', color: '#666'}}>No popups created.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {isModalOpen && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h2 style={{marginTop: 0}}>Create Live Popup</h2>
                        <form onSubmit={handleSubmit}>
                            <div>
                                <label style={labelStyle}>Title (Optional)</label>
                                <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} style={inputStyle} />
                            </div>
                            
                            <div>
                                <label style={labelStyle}>Image</label>
                                <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} style={{marginBottom: '1rem'}} />
                            </div>

                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                                <div>
                                    <label style={labelStyle}>Trigger Type</label>
                                    <select 
                                        value={formData.trigger_type} 
                                        onChange={e => setFormData({...formData, trigger_type: e.target.value as any})}
                                        style={inputStyle}
                                    >
                                        <option value="ALWAYS">Always Show</option>
                                        <option value="ONCE_PER_USER">Once Per User (One Time)</option>
                                        <option value="DAILY_LIMIT">Daily Limit</option>
                                        <option value="SCHEDULE">Scheduled Time</option>
                                    </select>
                                </div>
                                {formData.trigger_type === 'DAILY_LIMIT' && (
                                    <div>
                                        <label style={labelStyle}>Times per Day</label>
                                        <input type="number" min="1" value={formData.frequency_limit} onChange={e => setFormData({...formData, frequency_limit: parseInt(e.target.value)})} style={inputStyle} />
                                    </div>
                                )}
                            </div>

                            {formData.trigger_type === 'SCHEDULE' && (
                                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                                    <div>
                                        <label style={labelStyle}>Start Time</label>
                                        <input type="datetime-local" value={formData.schedule_start} onChange={e => setFormData({...formData, schedule_start: e.target.value})} style={inputStyle} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>End Time</label>
                                        <input type="datetime-local" value={formData.schedule_end} onChange={e => setFormData({...formData, schedule_end: e.target.value})} style={inputStyle} />
                                    </div>
                                </div>
                            )}

                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                                <div>
                                    <label style={labelStyle}>Button Text (Optional)</label>
                                    <input type="text" value={formData.action_btn_text || ''} onChange={e => setFormData({...formData, action_btn_text: e.target.value})} style={inputStyle} placeholder="e.g. Join Now" />
                                </div>
                                <div>
                                    <label style={labelStyle}>Button URL (Optional)</label>
                                    <input type="text" value={formData.action_url || ''} onChange={e => setFormData({...formData, action_url: e.target.value})} style={inputStyle} placeholder="https://..." />
                                </div>
                            </div>

                            <div style={{display: 'flex', gap: '2rem', marginBottom: '1rem'}}>
                                <div>
                                    <label style={labelStyle}>Auto Close (Seconds)</label>
                                    <input 
                                        type="number" 
                                        min="0" 
                                        value={(formData.auto_close_ms || 0) / 1000} 
                                        onChange={e => setFormData({...formData, auto_close_ms: parseInt(e.target.value) * 1000})} 
                                        style={{...inputStyle, width: '100px'}} 
                                        placeholder="0 = Disable"
                                    />
                                </div>
                                <div style={{display: 'flex', alignItems: 'center', paddingTop: '1rem'}}>
                                    <label style={{display: 'flex', alignItems: 'center', cursor: 'pointer'}}>
                                        <input type="checkbox" checked={formData.is_dismissible} onChange={e => setFormData({...formData, is_dismissible: e.target.checked})} style={{marginRight: '0.5rem'}} />
                                        User can Close (Cancelable)
                                    </label>
                                </div>
                            </div>

                            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem'}}>
                                <button type="button" onClick={() => setIsModalOpen(false)} style={{...buttonStyle, backgroundColor: '#a0aec0'}}>Cancel</button>
                                <button type="submit" disabled={uploading} style={{...buttonStyle, backgroundColor: '#48bb78'}}>
                                    {uploading ? 'Uploading...' : 'Save Popup'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PopupManagement;
