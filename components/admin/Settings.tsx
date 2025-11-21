
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { HowToPlayVideo, SecurityConfig } from '../../types';
import { TrashIconSVG, PlusIconSVG, CopyIconSVG } from '../../assets/icons';

type Tab = 'content' | 'setups' | 'videos' | 'deposit' | 'security';

interface OfflineMethod {
    id: string;
    name: string;
    number: string;
    color: string; // Retain for backward compatibility/fallback
    logo_url?: string; // New field for image URL
}

interface DepositGatewaySettings {
    active_gateway: 'offline' | 'uddoktapay' | 'paytm' | 'razorpay';
    uddoktapay: { api_key: string; api_url: string; };
    paytm: { merchant_id: string; merchant_key: string; website: string; };
    razorpay: { key_id: string; key_secret: string; };
    offline: { 
        instructions: string; 
        methods?: OfflineMethod[];
    };
}

// --- Rich Text Editor Component ---
interface RichTextEditorProps {
    initialValue: string;
    onChange: (html: string) => void;
}

const SimpleRichTextEditor: React.FC<RichTextEditorProps> = ({ initialValue, onChange }) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const [color, setColor] = useState('#000000');

    useEffect(() => {
        if (contentRef.current && contentRef.current.innerHTML !== initialValue) {
            if (contentRef.current.innerHTML === '' || initialValue !== '') {
                 contentRef.current.innerHTML = initialValue;
            }
        }
    }, []); 

    const handleInput = () => {
        if (contentRef.current) {
            onChange(contentRef.current.innerHTML);
        }
    };

    const exec = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        contentRef.current?.focus();
    };

    const toolbarBtnStyle: React.CSSProperties = {
        padding: '4px 8px',
        marginRight: '4px',
        border: '1px solid #ddd',
        backgroundColor: '#fff',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '14px',
        minWidth: '30px'
    };

    return (
        <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}>
            <div style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                <button type="button" onClick={() => exec('bold')} style={{ ...toolbarBtnStyle, fontWeight: 'bold' }} title="Bold">B</button>
                <button type="button" onClick={() => exec('italic')} style={{ ...toolbarBtnStyle, fontStyle: 'italic' }} title="Italic">I</button>
                <button type="button" onClick={() => exec('underline')} style={{ ...toolbarBtnStyle, textDecoration: 'underline' }} title="Underline">U</button>
                <div style={{ display: 'flex', alignItems: 'center', marginLeft: '8px', marginRight: '8px', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px' }}>
                    <label htmlFor="colorPicker" style={{ fontSize: '12px', marginRight: '4px', color: 'var(--text-secondary)', paddingLeft: '4px' }}>Color:</label>
                    <input 
                        id="colorPicker"
                        type="color" 
                        value={color}
                        onChange={(e) => {
                            setColor(e.target.value);
                            exec('foreColor', e.target.value);
                        }} 
                        title="Text Color" 
                        style={{ cursor: 'pointer', height: '24px', width: '30px', padding: 0, border: 'none', background: 'none' }} 
                    />
                </div>
                <button type="button" onClick={() => exec('insertOrderedList')} style={toolbarBtnStyle} title="Ordered List">1.</button>
                <button type="button" onClick={() => exec('insertUnorderedList')} style={toolbarBtnStyle} title="Bullet List">•</button>
                <button type="button" onClick={() => exec('justifyLeft')} style={toolbarBtnStyle} title="Align Left">L</button>
                <button type="button" onClick={() => exec('justifyCenter')} style={toolbarBtnStyle} title="Align Center">C</button>
                <button type="button" onClick={() => exec('justifyRight')} style={toolbarBtnStyle} title="Align Right">R</button>
            </div>
            <div
                ref={contentRef}
                contentEditable
                onInput={handleInput}
                style={{ minHeight: '250px', padding: '12px', outline: 'none', lineHeight: '1.6', fontSize: '16px', color: 'var(--text-main)' }}
            />
        </div>
    );
};

// --- Settings Component ---
const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('content');
    const [rules, setRules] = useState('');
    const [aboutUs, setAboutUs] = useState('');
    const [privacyPolicy, setPrivacyPolicy] = useState('');
    const [terms, setTerms] = useState('');
    const [faq, setFaq] = useState('');
    const [savingContentKey, setSavingContentKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    
    const [adminStatus, setAdminStatus] = useState<'online' | 'offline'>('offline');
    const [savingStatus, setSavingStatus] = useState(false);
    const [commission, setCommission] = useState<number>(0);
    const [savingCommission, setSavingCommission] = useState(false);
    const [appTitle, setAppTitle] = useState('Dream Ludo');
    const [currencySymbol, setCurrencySymbol] = useState('৳');
    const [savingConfig, setSavingConfig] = useState(false);
    
    // Group Chat Settings
    const [groupChatEnabled, setGroupChatEnabled] = useState(true);
    const [groupChatBlockLinks, setGroupChatBlockLinks] = useState(false);
    const [groupChatBannedWords, setGroupChatBannedWords] = useState('');
    const [savingGroupChat, setSavingGroupChat] = useState(false);
    
    const [referralBonus, setReferralBonus] = useState<number>(0);
    const [refereeBonus, setRefereeBonus] = useState<number>(0);
    const [referralMatchBonus, setReferralMatchBonus] = useState<number>(0);
    const [savingReferral, setSavingReferral] = useState(false);

    const [videos, setVideos] = useState<HowToPlayVideo[]>([]);
    const [loadingVideos, setLoadingVideos] = useState(true);
    const [errorVideos, setErrorVideos] = useState<string | null>(null);
    const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
    const [editingVideo, setEditingVideo] = useState<HowToPlayVideo | null>(null);
    const [videoFormState, setVideoFormState] = useState({ title: '', youtube_url: '' });
    const [savingVideos, setSavingVideos] = useState(false);

    const [depositSettings, setDepositSettings] = useState<DepositGatewaySettings>({
        active_gateway: 'offline',
        uddoktapay: { api_key: '', api_url: '' },
        paytm: { merchant_id: '', merchant_key: '', website: 'DEFAULT' },
        razorpay: { key_id: '', key_secret: '' },
        offline: { instructions: '', methods: [] }
    });
    const [savingDeposit, setSavingDeposit] = useState(false);
    const [newMethodName, setNewMethodName] = useState('');
    const [newMethodNumber, setNewMethodNumber] = useState('');
    const [newMethodLogoFile, setNewMethodLogoFile] = useState<File | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);

    // Security Settings State
    const [securityConfig, setSecurityConfig] = useState<SecurityConfig>({
        ipLimitEnabled: false,
        vpnBlockEnabled: false,
        incognitoBlockEnabled: false,
        deviceLockEnabled: false,
        vpnApiKey: ''
    });
    const [savingSecurity, setSavingSecurity] = useState(false);
    const [showSqlModal, setShowSqlModal] = useState(false);
    const [sqlCopied, setSqlCopied] = useState(false);


    const fetchSettings = useCallback(async () => {
        if (!supabase) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('app_settings')
                .select('key, value');

            if (error) throw error;
            
            const getSetting = (key: string, defaultValue: any) => {
                const setting = data.find(s => s.key === key);
                return setting ? { ...defaultValue, ...setting.value } : defaultValue;
            }

            setRules(getSetting('rules_and_policy', { text: '' }).text);
            setAboutUs(getSetting('content_about_us', { text: '' }).text);
            setPrivacyPolicy(getSetting('content_privacy_policy', { text: '' }).text);
            setTerms(getSetting('content_terms', { text: '' }).text);
            setFaq(getSetting('content_faq', { text: '' }).text);
            
            setAdminStatus(getSetting('admin_status', { status: 'offline' }).status);
            setCommission(getSetting('admin_commission_percent', { percentage: 0 }).percentage);
            
            const groupChatConfig = getSetting('group_chat_status', { enabled: true, block_links: false, banned_words: [] });
            setGroupChatEnabled(groupChatConfig.enabled);
            setGroupChatBlockLinks(groupChatConfig.block_links || false);
            setGroupChatBannedWords(Array.isArray(groupChatConfig.banned_words) ? groupChatConfig.banned_words.join(', ') : '');
            
            const config = getSetting('app_config', { title: 'Dream Ludo', currencySymbol: '৳' });
            setAppTitle(config.title);
            setCurrencySymbol(config.currencySymbol);

            setReferralBonus(getSetting('referral_bonus_amount', { amount: 0 }).amount);
            setRefereeBonus(getSetting('referee_bonus_amount', { amount: 0 }).amount);
            setReferralMatchBonus(getSetting('referral_match_bonus', { amount: 0 }).amount);
            
            setSecurityConfig(getSetting('security_config', {
                ipLimitEnabled: false, vpnBlockEnabled: false, incognitoBlockEnabled: false, 
                deviceLockEnabled: false, vpnApiKey: ''
            }));
            
            const fetchedDepositSettings = getSetting('deposit_gateway_settings', {
                active_gateway: 'offline',
                uddoktapay: { api_key: '', api_url: '' },
                paytm: { merchant_id: '', merchant_key: '', website: 'DEFAULT' },
                razorpay: { key_id: '', key_secret: '' },
                offline: { instructions: '', methods: [] }
            });
            if (!fetchedDepositSettings.paytm) {
                fetchedDepositSettings.paytm = { merchant_id: '', merchant_key: '', website: 'DEFAULT' };
            } else if (!fetchedDepositSettings.paytm.website) {
                fetchedDepositSettings.paytm.website = 'DEFAULT';
            }
            if (!fetchedDepositSettings.razorpay) {
                fetchedDepositSettings.razorpay = { key_id: '', key_secret: '' };
            }
            if (!fetchedDepositSettings.offline.methods) {
                fetchedDepositSettings.offline.methods = [];
            }
            setDepositSettings(fetchedDepositSettings);


        } catch (e: any) {
            setMessage({ type: 'error', text: 'Failed to load settings.' });
        } finally {
            setLoading(false);
        }
    }, []);
    
    const fetchVideos = useCallback(async () => {
        if (!supabase) return;
        setLoadingVideos(true);
        try {
            const { data, error } = await supabase.from('how_to_play_videos').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setVideos(data || []);
            setErrorVideos(null);
        } catch (e: any) {
            setErrorVideos("Failed to load videos.");
        } finally {
            setLoadingVideos(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
        fetchVideos();
    }, [fetchSettings, fetchVideos]);

    const saveContentSection = async (key: string, content: string, sectionName: string) => {
        if (!supabase) return;
        setSavingContentKey(key);
        setMessage(null);

        try {
            const { error } = await supabase
                .from('app_settings')
                .upsert({ key, value: { text: content }, updated_at: new Date().toISOString() });
            
            if (error) throw error;
            setMessage({ type: 'success', text: `${sectionName} updated successfully!` });
            setTimeout(() => setMessage(null), 3000);
        } catch (e: any) {
            setMessage({ type: 'error', text: `Error saving ${sectionName}: ${e.message}` });
            setTimeout(() => setMessage(null), 5000);
        } finally {
            setSavingContentKey(null);
        }
    };
    
    const handleSaveAppConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;
        setSavingConfig(true);
        setMessage(null);
        try {
            const { error } = await supabase
                .from('app_settings')
                .upsert({ key: 'app_config', value: { title: appTitle, currencySymbol: currencySymbol } });

            if (error) throw error;
            setMessage({ type: 'success', text: 'App configuration updated successfully!' });
            setTimeout(() => setMessage(null), 3000);
        } catch (e: any) {
            setMessage({ type: 'error', text: `Error saving config: ${e.message}` });
            setTimeout(() => setMessage(null), 5000);
        } finally {
            setSavingConfig(false);
        }
    };

    const handleSaveStatus = async () => {
        if (!supabase) return;
        setSavingStatus(true);
        setMessage(null);
        try {
            const { error } = await supabase
                .from('app_settings')
                .upsert({ key: 'admin_status', value: { status: adminStatus } });

            if (error) throw error;
            setMessage({ type: 'success', text: 'Admin status updated!' });
            setTimeout(() => setMessage(null), 3000);
        } catch (e: any) {
            setMessage({ type: 'error', text: `Error: ${e.message}` });
        } finally {
            setSavingStatus(false);
        }
    };
    
    const handleSaveGroupChatSettings = async () => {
        if (!supabase) return;
        setSavingGroupChat(true);
        setMessage(null);
        
        const bannedWordsArray = groupChatBannedWords.split(',').map(w => w.trim()).filter(w => w.length > 0);

        try {
            const { error } = await supabase
                .from('app_settings')
                .upsert({ 
                    key: 'group_chat_status', 
                    value: { 
                        enabled: groupChatEnabled,
                        block_links: groupChatBlockLinks,
                        banned_words: bannedWordsArray
                    } 
                });

            if (error) throw error;
            setMessage({ type: 'success', text: 'Group Chat settings saved!' });
            setTimeout(() => setMessage(null), 3000);
        } catch (e: any) {
            setMessage({ type: 'error', text: `Error: ${e.message}` });
        } finally {
            setSavingGroupChat(false);
        }
    };

    const handleSaveCommission = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;
        setSavingCommission(true);
        setMessage(null);
        try {
            const { error } = await supabase
                .from('app_settings')
                .upsert({ key: 'admin_commission_percent', value: { percentage: commission } });

            if (error) throw error;
            setMessage({ type: 'success', text: 'Commission updated!' });
            setTimeout(() => setMessage(null), 3000);
        } catch (e: any) {
            setMessage({ type: 'error', text: `Error: ${e.message}` });
        } finally {
            setSavingCommission(false);
        }
    };

    const handleSaveReferral = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;
        setSavingReferral(true);
        setMessage(null);
        try {
            await supabase.from('app_settings').upsert({ key: 'referral_bonus_amount', value: { amount: referralBonus } });
            await supabase.from('app_settings').upsert({ key: 'referee_bonus_amount', value: { amount: refereeBonus } });
            await supabase.from('app_settings').upsert({ key: 'referral_match_bonus', value: { amount: referralMatchBonus } });
            
            setMessage({ type: 'success', text: 'Referral settings updated!' });
            setTimeout(() => setMessage(null), 3000);
        } catch (e: any) {
             setMessage({ type: 'error', text: `Error: ${e.message}` });
        } finally {
            setSavingReferral(false);
        }
    };

    const handleSaveDepositSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;
        setSavingDeposit(true);
        setMessage(null);
        try {
             const { error } = await supabase
                .from('app_settings')
                .upsert({ key: 'deposit_gateway_settings', value: depositSettings });
             if (error) throw error;
             setMessage({ type: 'success', text: 'Deposit settings saved successfully!' });
             setTimeout(() => setMessage(null), 3000);
        } catch (e: any) {
            setMessage({ type: 'error', text: `Error saving deposit settings: ${e.message}` });
            setTimeout(() => setMessage(null), 5000);
        } finally {
            setSavingDeposit(false);
        }
    };
    
    const handleSaveSecurityConfig = async () => {
        if (!supabase) return;
        setSavingSecurity(true);
        setMessage(null);
        try {
             const { error } = await supabase
                .from('app_settings')
                .upsert({ key: 'security_config', value: securityConfig });
             if (error) throw error;
             setMessage({ type: 'success', text: 'Security settings saved successfully!' });
             setTimeout(() => setMessage(null), 3000);
        } catch (e: any) {
            setMessage({ type: 'error', text: `Error saving security settings: ${e.message}` });
            setTimeout(() => setMessage(null), 5000);
        } finally {
            setSavingSecurity(false);
        }
    };
    
    const handleCopySql = () => {
        const sql = `
-- 1. Create IP Log Table
CREATE TABLE IF NOT EXISTS public.ip_logs (
    id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    ip_address inet NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- 2. Create IP Rate Limit Check Function
CREATE OR REPLACE FUNCTION public.check_ip_rate_limit()
RETURNS trigger AS $$
DECLARE
    ip_count integer;
BEGIN
    SELECT count(*) INTO ip_count
    FROM public.ip_logs
    WHERE ip_address = new.ip AND created_at >= now() - interval '24 hours';

    IF ip_count >= 3 THEN
        RAISE EXCEPTION 'IP_LIMIT_EXCEEDED';
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Trigger to Check IP on Sign Up
DROP TRIGGER IF EXISTS on_auth_user_created_check_ip on auth.users;
CREATE TRIGGER on_auth_user_created_check_ip
    BEFORE INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.check_ip_rate_limit();

-- 4. Create Function to Log IP after successful Sign Up
CREATE OR REPLACE FUNCTION public.log_ip_after_signup()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.ip_logs (ip_address)
    VALUES (new.ip);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create Trigger to Log IP after Sign Up
DROP TRIGGER IF EXISTS on_auth_user_created_log_ip on auth.users;
CREATE TRIGGER on_auth_user_created_log_ip
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.log_ip_after_signup();

-- 6. Create Device ID Check Function for Signup
CREATE OR REPLACE FUNCTION public.check_device_id_on_signup()
RETURNS trigger AS $$
DECLARE
    device_id_count integer;
    device_id_from_meta text := new.raw_user_meta_data->>'device_id';
BEGIN
    IF device_id_from_meta IS NOT NULL THEN
        SELECT count(*) INTO device_id_count
        FROM auth.users
        WHERE raw_user_meta_data->>'device_id' = device_id_from_meta;

        IF device_id_count > 0 THEN
            RAISE EXCEPTION 'DEVICE_ID_IN_USE';
        END IF;
    END IF;
    RETURN new;
END;
$$ LANGUAGE plpgsql;

-- 7. Create Trigger to Check Device ID on Sign Up
DROP TRIGGER IF EXISTS on_auth_user_created_check_device_id on auth.users;
CREATE TRIGGER on_auth_user_created_check_device_id
    BEFORE INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.check_device_id_on_signup();
`.trim();
        navigator.clipboard.writeText(sql);
        setSqlCopied(true);
        setTimeout(() => setSqlCopied(false), 2000);
    };


    const handleAddMethod = async () => {
        if (!newMethodName || !newMethodNumber || !supabase) return;
        
        let logoUrl = '';
        if (newMethodLogoFile) {
            setUploadingLogo(true);
            try {
                const fileExt = newMethodLogoFile.name.split('.').pop();
                const fileName = `${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from('payment-methods').upload(fileName, newMethodLogoFile);
                if (uploadError) throw uploadError;
                
                const { data } = supabase.storage.from('payment-methods').getPublicUrl(fileName);
                logoUrl = data.publicUrl;
            } catch (e: any) {
                console.error("Logo upload failed:", e);
                alert("Failed to upload logo. Please try again.");
                setUploadingLogo(false);
                return;
            }
            setUploadingLogo(false);
        }

        const newMethod: OfflineMethod = {
            id: Date.now().toString(),
            name: newMethodName,
            number: newMethodNumber,
            color: '#ffffff', // Default fallback
            logo_url: logoUrl
        };

        setDepositSettings(prev => ({
            ...prev,
            offline: {
                ...prev.offline,
                methods: [...(prev.offline.methods || []), newMethod]
            }
        }));
        setNewMethodName('');
        setNewMethodNumber('');
        setNewMethodLogoFile(null);
    };

    const handleDeleteMethod = (id: string) => {
        setDepositSettings(prev => ({
            ...prev,
            offline: {
                ...prev.offline,
                methods: (prev.offline.methods || []).filter(m => m.id !== id)
            }
        }));
    };


    const openVideoModal = (video: HowToPlayVideo | null = null) => {
        setEditingVideo(video);
        if (video) {
            setVideoFormState({ title: video.title, youtube_url: video.youtube_url });
        } else {
            setVideoFormState({ title: '', youtube_url: '' });
        }
        setIsVideoModalOpen(true);
    };

    const closeVideoModal = () => setIsVideoModalOpen(false);

    const handleVideoSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;
        setSavingVideos(true);
        setMessage(null);
        try {
            if (editingVideo) {
                const { error } = await supabase.from('how_to_play_videos').update(videoFormState).eq('id', editingVideo.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('how_to_play_videos').insert([videoFormState]);
                if (error) throw error;
            }
            fetchVideos();
            closeVideoModal();
            setMessage({ type: 'success', text: `Video ${editingVideo ? 'updated' : 'added'} successfully!`});
            setTimeout(() => setMessage(null), 3000);
        } catch (e: any) {
            setMessage({ type: 'error', text: `Error saving video: ${e.message}` });
            setTimeout(() => setMessage(null), 5000);
        } finally {
            setSavingVideos(false);
        }
    };

    const handleVideoDelete = async (id: string) => {
        if (!supabase || !window.confirm("Are you sure you want to delete this video?")) return;
        setSavingVideos(true);
        setMessage(null);
        try {
            const { error } = await supabase.from('how_to_play_videos').delete().eq('id', id);
            if (error) throw error;
            fetchVideos();
            setMessage({ type: 'success', text: 'Video deleted successfully!'});
            setTimeout(() => setMessage(null), 3000);
        } catch (e: any) {
            setMessage({ type: 'error', text: `Error deleting video: ${e.message}` });
             setTimeout(() => setMessage(null), 5000);
        } finally {
            setSavingVideos(false);
        }
    };

    // Styles
    const headerStyle: React.CSSProperties = { fontSize: '2rem', marginBottom: '2rem' };
    const containerStyle: React.CSSProperties = { backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 8px var(--shadow-color)', marginBottom: '1.5rem', border: '1px solid var(--border-color)' };
    const labelStyle: React.CSSProperties = { fontWeight: 'bold', marginBottom: '0.5rem', display: 'block', fontSize: '1.2rem', color: 'var(--text-main)' };
    const buttonStyle: React.CSSProperties = { padding: '0.75rem 1.5rem', borderRadius: '5px', border: 'none', cursor: 'pointer', color: 'white', backgroundColor: '#48bb78', fontSize: '1.1rem', marginTop: '1rem' };
    const messageStyle: React.CSSProperties = { padding: '1rem', borderRadius: '5px', marginBottom: '1.5rem', textAlign: 'center', color: 'white' };
    const radioGroupStyle: React.CSSProperties = { display: 'flex', gap: '1.5rem', marginTop: '1rem', marginBottom: '1rem' };
    const radioLabelStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '1rem' };
    const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' };
    const thStyle: React.CSSProperties = { padding: '1rem', textAlign: 'left', backgroundColor: 'var(--bg-main)', borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' };
    const videoTdStyle: React.CSSProperties = { padding: '1rem', borderBottom: '1px solid var(--border-color)', whiteSpace: 'normal', wordBreak: 'break-all' };
    const modalOverlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 };
    const modalContentStyle: React.CSSProperties = { backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: '8px', width: '90%', maxWidth: '500px' };
    const inputStyle: React.CSSProperties = { width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', boxSizing: 'border-box', backgroundColor: 'var(--input-bg)', color: 'var(--text-main)' };
    const tabContainerStyle: React.CSSProperties = { display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '2rem', overflowX: 'auto' };
    const tabButtonStyle: React.CSSProperties = { padding: '1rem 1.5rem', border: 'none', background: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 500, borderBottom: '3px solid transparent', whiteSpace: 'nowrap' };
    const activeTabButtonStyle: React.CSSProperties = { color: 'var(--primary-red)', fontWeight: 600, borderBottom: '3px solid var(--primary-red)' };
    const methodCardStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '0.5rem' };
    const methodLogoStyle: React.CSSProperties = { width: '40px', height: '40px', objectFit: 'contain', marginRight: '1rem', borderRadius: '4px', backgroundColor: 'var(--bg-main)' };

    const TABS: { id: Tab; label: string }[] = [
        { id: 'content', label: 'Content & Rules' },
        { id: 'setups', label: 'App Setups' },
        { id: 'deposit', label: 'Deposit' },
        { id: 'videos', label: 'How to Play Videos' },
        { id: 'security', label: 'Security' }
    ];

    return (
        <div>
            <h1 style={headerStyle} className="admin-page-header">App Settings</h1>

            {message && (
                <div style={{ ...messageStyle, backgroundColor: message.type === 'success' ? '#4CAF50' : '#f44336', marginTop: 0 }}>
                    {message.text}
                </div>
            )}
            
            <div style={tabContainerStyle}>
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        style={activeTab === tab.id ? { ...tabButtonStyle, ...activeTabButtonStyle } : tabButtonStyle}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'content' && (
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                     <div style={containerStyle}>
                        <label style={labelStyle}>Game Rules</label>
                        {loading ? <p>Loading...</p> : <SimpleRichTextEditor initialValue={rules} onChange={setRules} />}
                        <button onClick={() => saveContentSection('rules_and_policy', rules, 'Game Rules')} style={buttonStyle} disabled={savingContentKey === 'rules_and_policy' || loading}>{savingContentKey === 'rules_and_policy' ? 'Saving...' : 'Save Rules'}</button>
                    </div>
                     <div style={containerStyle}>
                        <label style={labelStyle}>About Us</label>
                        {loading ? <p>Loading...</p> : <SimpleRichTextEditor initialValue={aboutUs} onChange={setAboutUs} />}
                        <button onClick={() => saveContentSection('content_about_us', aboutUs, 'About Us')} style={buttonStyle} disabled={savingContentKey === 'content_about_us' || loading}>{savingContentKey === 'content_about_us' ? 'Saving...' : 'Save About Us'}</button>
                    </div>
                     <div style={containerStyle}>
                        <label style={labelStyle}>Privacy Policy</label>
                         {loading ? <p>Loading...</p> : <SimpleRichTextEditor initialValue={privacyPolicy} onChange={setPrivacyPolicy} />}
                        <button onClick={() => saveContentSection('content_privacy_policy', privacyPolicy, 'Privacy Policy')} style={buttonStyle} disabled={savingContentKey === 'content_privacy_policy' || loading}>{savingContentKey === 'content_privacy_policy' ? 'Saving...' : 'Save Policy'}</button>
                    </div>
                    <div style={containerStyle}>
                        <label style={labelStyle}>Terms & Conditions</label>
                         {loading ? <p>Loading...</p> : <SimpleRichTextEditor initialValue={terms} onChange={setTerms} />}
                        <button onClick={() => saveContentSection('content_terms', terms, 'Terms & Conditions')} style={buttonStyle} disabled={savingContentKey === 'content_terms' || loading}>{savingContentKey === 'content_terms' ? 'Saving...' : 'Save Terms'}</button>
                    </div>
                     <div style={containerStyle}>
                        <label style={labelStyle}>FAQ</label>
                        {loading ? <p>Loading...</p> : <SimpleRichTextEditor initialValue={faq} onChange={setFaq} />}
                        <button onClick={() => saveContentSection('content_faq', faq, 'FAQ')} style={buttonStyle} disabled={savingContentKey === 'content_faq' || loading}>{savingContentKey === 'content_faq' ? 'Saving...' : 'Save FAQ'}</button>
                    </div>
                </div>
            )}

            {activeTab === 'setups' && (
                <>
                    {/* General App Config */}
                    <div style={containerStyle}>
                        <form onSubmit={handleSaveAppConfig}>
                            <label style={labelStyle}>General App Settings</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
                                <div>
                                    <label style={{fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem'}}>App Title</label>
                                    <input type="text" value={appTitle} onChange={e => setAppTitle(e.target.value)} style={inputStyle} placeholder="e.g., Dream Ludo" />
                                </div>
                                <div>
                                    <label style={{fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem'}}>Currency Symbol</label>
                                    <input type="text" value={currencySymbol} onChange={e => setCurrencySymbol(e.target.value)} style={inputStyle} placeholder="e.g., ৳, $, ₹" />
                                </div>
                            </div>
                            <button type="submit" style={buttonStyle} disabled={savingConfig || loading}>
                                {savingConfig ? 'Saving...' : 'Save Configuration'}
                            </button>
                        </form>
                    </div>

                    {/* Group Chat Settings */}
                    <div style={containerStyle}>
                        <label style={labelStyle}>Global Group Chat</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                            <label className="switch">
                                <input type="checkbox" checked={groupChatEnabled} onChange={(e) => setGroupChatEnabled(e.target.checked)} />
                                <span className="slider"></span>
                            </label>
                            <span style={{fontWeight: 600, color: groupChatEnabled ? '#48bb78' : '#e53e3e'}}>{groupChatEnabled ? 'ENABLED' : 'DISABLED'}</span>
                        </div>

                        <div style={{marginBottom: '1rem'}}>
                            <label style={{display: 'flex', alignItems: 'center', cursor: 'pointer'}}>
                                <input type="checkbox" checked={groupChatBlockLinks} onChange={(e) => setGroupChatBlockLinks(e.target.checked)} style={{marginRight: '0.5rem'}} />
                                <span style={{fontWeight: 500}}>Block Links</span>
                            </label>
                            <p style={{color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.2rem 0 0 1.5rem'}}>
                                If enabled, users cannot send messages containing URLs.
                            </p>
                        </div>

                        <div>
                            <label style={{fontWeight: 500, display: 'block', marginBottom: '0.5rem'}}>Forbidden Words (Comma Separated)</label>
                            <textarea value={groupChatBannedWords} onChange={(e) => setGroupChatBannedWords(e.target.value)} style={{...inputStyle, minHeight: '80px'}} placeholder="badword1, badword2, spam" />
                            <p style={{color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem'}}> Messages containing these words will be blocked. </p>
                        </div>
                        
                        <button onClick={handleSaveGroupChatSettings} style={buttonStyle} disabled={savingGroupChat || loading}>
                            {savingGroupChat ? 'Saving...' : 'Save Chat Settings'}
                        </button>
                    </div>

                    {/* Admin Status */}
                    <div style={containerStyle}>
                        <label style={labelStyle}>Admin Status</label>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>This status is displayed to users in the app header.</p>
                        <div style={radioGroupStyle}>
                            <label style={radioLabelStyle}><input type="radio" name="adminStatus" value="online" checked={adminStatus === 'online'} onChange={() => setAdminStatus('online')} /> Online</label>
                            <label style={radioLabelStyle}><input type="radio" name="adminStatus" value="offline" checked={adminStatus === 'offline'} onChange={() => setAdminStatus('offline')} /> Offline</label>
                        </div>
                        <button onClick={handleSaveStatus} style={buttonStyle} disabled={savingStatus || loading}>
                            {savingStatus ? 'Saving...' : 'Update Status'}
                        </button>
                    </div>
                    
                    {/* Commission */}
                    <div style={containerStyle}>
                        <form onSubmit={handleSaveCommission}>
                            <label style={labelStyle}>Admin Commission (%)</label>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Percentage deducted from the prize pool of every match.</p>
                            <input type="number" value={commission} onChange={e => setCommission(Number(e.target.value))} style={inputStyle} min="0" max="100" step="0.1" />
                            <button type="submit" style={buttonStyle} disabled={savingCommission || loading}>
                                {savingCommission ? 'Saving...' : 'Update Commission'}
                            </button>
                        </form>
                    </div>

                    {/* Referral Settings */}
                    <div style={containerStyle}>
                        <form onSubmit={handleSaveReferral}>
                            <label style={labelStyle}>Referral Settings ({currencySymbol})</label>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Set the bonus amounts for the referral program.</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'bold'}}>Referrer Bonus (One-time)</label>
                                    <input type="number" value={referralBonus} onChange={e => setReferralBonus(Number(e.target.value))} style={inputStyle} min="0" />
                                </div>
                                <div>
                                    <label style={{fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'bold'}}>Referee (New User) Bonus</label>
                                    <input type="number" value={refereeBonus} onChange={e => setRefereeBonus(Number(e.target.value))} style={inputStyle} min="0" />
                                </div>
                                <div style={{gridColumn: '1 / -1'}}>
                                     <label style={{fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'bold'}}>Per-Match Commission to Referrer</label>
                                     <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 0}}>Amount the referrer gets every time their referred user wins a match.</p>
                                     <input type="number" value={referralMatchBonus} onChange={e => setReferralMatchBonus(Number(e.target.value))} style={inputStyle} min="0" />
                                </div>
                            </div>
                            <button type="submit" style={buttonStyle} disabled={savingReferral || loading}>
                                {savingReferral ? 'Saving...' : 'Update Referral Settings'}
                            </button>
                        </form>
                    </div>
                </>
            )}

            {activeTab === 'deposit' && (
                <div style={containerStyle}>
                    <form onSubmit={handleSaveDepositSettings}>
                        <label style={labelStyle}>Deposit Gateway Settings</label>
                        {loading ? <p>Loading settings...</p> : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <p style={{ fontWeight: 500, margin: 0 }}>Active Gateway</p>
                                    <div style={radioGroupStyle}>
                                        <label style={radioLabelStyle}><input type="radio" name="gateway" value="offline" checked={depositSettings.active_gateway === 'offline'} onChange={() => setDepositSettings(s => ({...s, active_gateway: 'offline'}))} /> Offline</label>
                                        <label style={radioLabelStyle}><input type="radio" name="gateway" value="uddoktapay" checked={depositSettings.active_gateway === 'uddoktapay'} onChange={() => setDepositSettings(s => ({...s, active_gateway: 'uddoktapay'}))} /> UddoktaPay</label>
                                        <label style={radioLabelStyle}><input type="radio" name="gateway" value="paytm" checked={depositSettings.active_gateway === 'paytm'} onChange={() => setDepositSettings(s => ({...s, active_gateway: 'paytm'}))} /> Paytm</label>
                                        <label style={radioLabelStyle}><input type="radio" name="gateway" value="razorpay" checked={depositSettings.active_gateway === 'razorpay'} onChange={() => setDepositSettings(s => ({...s, active_gateway: 'razorpay'}))} /> Razorpay</label>
                                    </div>
                                </div>
                                
                                {depositSettings.active_gateway === 'offline' && (
                                    <>
                                        <hr style={{border: 'none', borderTop: '1px solid var(--border-color)'}} />
                                        <div>
                                            <h3 style={{marginTop: 0}}>Offline Payment Methods</h3>
                                            <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>Manage the payment methods (e.g., Bkash, Nagad) displayed to users for manual deposits.</p>
                                            
                                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '0.5rem', alignItems: 'end', marginBottom: '1.5rem', backgroundColor: 'var(--bg-main)', padding: '1rem', borderRadius: '8px'}}>
                                                <div>
                                                    <label style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Method Name</label>
                                                    <input type="text" placeholder="e.g. Bkash Personal" value={newMethodName} onChange={e => setNewMethodName(e.target.value)} style={inputStyle} />
                                                </div>
                                                <div>
                                                    <label style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Wallet Number</label>
                                                    <input type="text" placeholder="e.g. 017..." value={newMethodNumber} onChange={e => setNewMethodNumber(e.target.value)} style={inputStyle} />
                                                </div>
                                                <div>
                                                     <label style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Method Logo</label>
                                                     <input type="file" accept="image/*" onChange={e => setNewMethodLogoFile(e.target.files ? e.target.files[0] : null)} style={{border: '1px solid var(--border-color)', padding: '4px', borderRadius: '4px', backgroundColor: 'var(--bg-card)', width: '100%', color: 'var(--text-main)'}} />
                                                </div>
                                                <button type="button" onClick={handleAddMethod} disabled={uploadingLogo} style={{...buttonStyle, marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                                    {uploadingLogo ? 'Uploading...' : <><div dangerouslySetInnerHTML={{__html: PlusIconSVG()}} /> Add</>}
                                                </button>
                                            </div>

                                            <div>
                                                {depositSettings.offline.methods?.map(method => (
                                                    <div key={method.id} style={methodCardStyle}>
                                                        <div style={{display: 'flex', alignItems: 'center'}}>
                                                            {method.logo_url ? (
                                                                <img src={method.logo_url} alt={method.name} style={methodLogoStyle} />
                                                            ) : (
                                                                <div style={{...methodLogoStyle, backgroundColor: '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '10px'}}>NO LOGO</div>
                                                            )}
                                                            <div>
                                                                <div style={{fontWeight: 'bold'}}>{method.name}</div>
                                                                <div style={{fontFamily: 'monospace', color: 'var(--text-secondary)'}}>{method.number}</div>
                                                            </div>
                                                        </div>
                                                        <button type="button" onClick={() => handleDeleteMethod(method.id)} style={{background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e'}}>
                                                            <div dangerouslySetInnerHTML={{__html: TrashIconSVG()}} />
                                                        </button>
                                                    </div>
                                                ))}
                                                {(!depositSettings.offline.methods || depositSettings.offline.methods.length === 0) && (
                                                    <p style={{color: '#999', textAlign: 'center', fontStyle: 'italic'}}>No payment methods added yet.</p>
                                                )}
                                            </div>

                                            <div style={{marginTop: '1.5rem'}}>
                                                <label style={{...labelStyle, fontSize: '1rem'}}>General Instructions (Optional)</label>
                                                <textarea value={depositSettings.offline.instructions} onChange={e => setDepositSettings(s => ({...s, offline: {...s.offline, instructions: e.target.value}}))} style={{...inputStyle, minHeight: '80px'}} placeholder="Any extra instructions for the user..." />
                                            </div>
                                        </div>
                                    </>
                                )}
                                
                                {depositSettings.active_gateway === 'uddoktapay' && (
                                    <>
                                        <hr style={{border: 'none', borderTop: '1px solid var(--border-color)'}} />
                                        <div>
                                            <h3 style={{marginTop: 0}}>UddoktaPay Settings</h3>
                                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                                                <div><label style={{...labelStyle, fontSize: '1rem'}}>API Key</label><input type="text" value={depositSettings.uddoktapay.api_key} onChange={e => setDepositSettings(s => ({...s, uddoktapay: {...s.uddoktapay, api_key: e.target.value}}))} style={inputStyle} /></div>
                                                <div><label style={{...labelStyle, fontSize: '1rem'}}>API URL</label><input type="text" value={depositSettings.uddoktapay.api_url} onChange={e => setDepositSettings(s => ({...s, uddoktapay: {...s.uddoktapay, api_url: e.target.value}}))} style={inputStyle} /></div>
                                            </div>
                                        </div>
                                    </>
                                )}
                                
                                {depositSettings.active_gateway === 'paytm' && (
                                    <>
                                        <hr style={{border: 'none', borderTop: '1px solid var(--border-color)'}} />
                                        <div>
                                            <h3 style={{marginTop: 0}}>Paytm Settings</h3>
                                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                                                <div><label style={{...labelStyle, fontSize: '1rem'}}>Merchant ID (MID)</label><input type="text" value={depositSettings.paytm.merchant_id} onChange={e => setDepositSettings(s => ({...s, paytm: {...s.paytm, merchant_id: e.target.value}}))} style={inputStyle} /></div>
                                                <div><label style={{...labelStyle, fontSize: '1rem'}}>Merchant Key</label><input type="text" value={depositSettings.paytm.merchant_key} onChange={e => setDepositSettings(s => ({...s, paytm: {...s.paytm, merchant_key: e.target.value}}))} style={inputStyle} /></div>
                                                <div>
                                                    <label style={{...labelStyle, fontSize: '1rem'}}>Website</label>
                                                    <select value={depositSettings.paytm.website} onChange={e => setDepositSettings(s => ({...s, paytm: {...s.paytm, website: e.target.value}}))} style={inputStyle} >
                                                        <option value="WEBSTAGING">Testing (WEBSTAGING)</option>
                                                        <option value="DEFAULT">Production (DEFAULT)</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {depositSettings.active_gateway === 'razorpay' && (
                                    <>
                                        <hr style={{border: 'none', borderTop: '1px solid var(--border-color)'}} />
                                        <div>
                                            <h3 style={{marginTop: 0}}>Razorpay Settings</h3>
                                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                                                <div><label style={{...labelStyle, fontSize: '1rem'}}>Key ID</label><input type="text" value={depositSettings.razorpay.key_id} onChange={e => setDepositSettings(s => ({...s, razorpay: {...s.razorpay, key_id: e.target.value}}))} style={inputStyle} /></div>
                                                <div><label style={{...labelStyle, fontSize: '1rem'}}>Key Secret</label><input type="text" value={depositSettings.razorpay.key_secret} onChange={e => setDepositSettings(s => ({...s, razorpay: {...s.razorpay, key_secret: e.target.value}}))} style={inputStyle} /></div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                        <button type="submit" style={buttonStyle} disabled={savingDeposit || loading}>
                            {savingDeposit ? 'Saving...' : 'Save Deposit Settings'}
                        </button>
                    </form>
                </div>
            )}

            {activeTab === 'videos' && (
                 <div style={containerStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                        <h2 style={{...labelStyle, marginBottom: 0}}>Manage Videos</h2>
                        <button onClick={() => openVideoModal()} style={{...buttonStyle, marginTop: 0}}>Add Video</button>
                    </div>
                     <table style={tableStyle} className="responsive-admin-table">
                        <thead>
                            <tr>
                                <th style={thStyle}>Title</th>
                                <th style={thStyle}>YouTube URL</th>
                                <th style={thStyle}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {videos.map(v => (
                                <tr key={v.id}>
                                    <td data-label="Title" style={{ ...videoTdStyle, fontWeight: 'bold' }}>{v.title}</td>
                                    <td data-label="YouTube URL" style={videoTdStyle}>{v.youtube_url}</td>
                                    <td data-label="Actions" style={{ ...videoTdStyle, display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <button onClick={() => openVideoModal(v)} style={{ ...buttonStyle, backgroundColor: '#4299e1', marginTop: 0, padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>Edit</button>
                                        <button onClick={() => handleVideoDelete(v.id)} style={{ ...buttonStyle, backgroundColor: '#f56565', marginTop: 0, padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            {activeTab === 'security' && (
                <div>
                    <div className="security-grid">
                        <div className="security-card">
                            <div className="security-card-header">
                                <h3>Incognito Mode Block</h3>
                                <label className="switch">
                                    <input type="checkbox" checked={securityConfig.incognitoBlockEnabled} onChange={e => setSecurityConfig(s => ({...s, incognitoBlockEnabled: e.target.checked}))} />
                                    <span className="slider"></span>
                                </label>
                            </div>
                            <p>Prevent users from signing up or logging in from a private/incognito browser window.</p>
                        </div>
                         <div className="security-card">
                            <div className="security-card-header">
                                <h3>VPN / Proxy Detection</h3>
                                <label className="switch">
                                    <input type="checkbox" checked={securityConfig.vpnBlockEnabled} onChange={e => setSecurityConfig(s => ({...s, vpnBlockEnabled: e.target.checked}))} />
                                    <span className="slider"></span>
                                </label>
                            </div>
                            <p>Block signups from users on a VPN, proxy, or hosting network. Requires a free API key from a service like ipinfo.io.</p>
                            <div className="security-card-footer">
                                <input 
                                    type="text" 
                                    placeholder="Enter ipinfo.io API Key" 
                                    style={inputStyle}
                                    value={securityConfig.vpnApiKey || ''}
                                    onChange={e => setSecurityConfig(s => ({...s, vpnApiKey: e.target.value}))}
                                />
                            </div>
                        </div>
                        <div className="security-card">
                            <div className="security-card-header">
                                <h3>IP-based Signup Limit</h3>
                                <label className="switch">
                                    <input type="checkbox" checked={securityConfig.ipLimitEnabled} onChange={e => setSecurityConfig(s => ({...s, ipLimitEnabled: e.target.checked}))} />
                                    <span className="slider"></span>
                                </label>
                            </div>
                            <p>Limit new account creations to 3 per IP address every 24 hours. Requires backend setup.</p>
                        </div>

                        <div className="security-card">
                            <div className="security-card-header">
                                <h3>One Account Per Device</h3>
                                <label className="switch">
                                    <input type="checkbox" checked={securityConfig.deviceLockEnabled} onChange={e => setSecurityConfig(s => ({...s, deviceLockEnabled: e.target.checked}))} />
                                    <span className="slider"></span>
                                </label>
                            </div>
                            <p>Prevent users from creating more than one account on the same device using browser fingerprinting. Requires backend setup.</p>
                        </div>
                    </div>
                    
                    <div style={{ ...containerStyle, marginTop: '1.5rem', background: 'var(--bg-main)' }}>
                        <h3 style={{ marginTop: 0 }}>Backend Setup</h3>
                        <p>To enable IP and Device limits, you must run a script in your Supabase SQL Editor. Click the button below to generate the required code.</p>
                        <button style={{ ...buttonStyle, backgroundColor: '#3182ce', marginTop: 0 }} onClick={() => setShowSqlModal(true)}>
                            Generate SQL
                        </button>
                    </div>
                    
                     <button onClick={handleSaveSecurityConfig} style={{...buttonStyle, width: '100%'}} disabled={savingSecurity || loading}>
                        {savingSecurity ? 'Saving...' : 'Save Security Settings'}
                    </button>
                </div>
            )}
            
            {isVideoModalOpen && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle} className="admin-modal-content">
                        <h2>{editingVideo ? 'Edit Video' : 'Add Video'}</h2>
                        <form onSubmit={handleVideoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{...labelStyle, fontSize: '1rem'}} htmlFor="title">Title</label>
                                <input id="title" style={inputStyle} type="text" value={videoFormState.title} onChange={e => setVideoFormState({ ...videoFormState, title: e.target.value })} required />
                            </div>
                            <div>
                                <label style={{...labelStyle, fontSize: '1rem'}} htmlFor="youtube_url">YouTube URL</label>
                                <input id="youtube_url" style={inputStyle} type="url" value={videoFormState.youtube_url} onChange={e => setVideoFormState({ ...videoFormState, youtube_url: e.target.value })} required placeholder="e.g., https://www.youtube.com/watch?v=..." />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                                <button type="button" onClick={closeVideoModal} style={{ ...buttonStyle, backgroundColor: '#718096' }}>Cancel</button>
                                <button type="submit" style={{ ...buttonStyle, backgroundColor: '#48bb78' }}>Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {showSqlModal && (
                <div style={modalOverlayStyle} onClick={() => setShowSqlModal(false)}>
                    <div style={{ ...modalContentStyle, maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginTop: 0 }}>Backend Security Setup</h2>
                        <p>Copy and run this SQL code in your Supabase SQL Editor to enable IP and Device ID checks.</p>
                        <div style={{ backgroundColor: '#1e1e1e', color: '#d4d4d4', padding: '1rem', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.85rem', overflowX: 'auto', marginBottom: '1.5rem', position: 'relative', maxHeight: '40vh' }}>
                             <button onClick={handleCopySql} style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', cursor: 'pointer', padding: '4px', color: 'white' }} title="Copy SQL">
                                <div dangerouslySetInnerHTML={{ __html: CopyIconSVG(sqlCopied) }} />
                            </button>
                            <pre style={{ margin: 0 }}>{`
-- 1. Create IP Log Table
CREATE TABLE IF NOT EXISTS public.ip_logs (
    id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    ip_address inet NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- 2. Create IP Rate Limit Check Function
CREATE OR REPLACE FUNCTION public.check_ip_rate_limit()
RETURNS trigger AS $$
DECLARE
    ip_count integer;
BEGIN
    SELECT count(*) INTO ip_count
    FROM public.ip_logs
    WHERE ip_address = new.ip AND created_at >= now() - interval '24 hours';

    IF ip_count >= 3 THEN
        RAISE EXCEPTION 'IP_LIMIT_EXCEEDED';
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Trigger to Check IP on Sign Up
DROP TRIGGER IF EXISTS on_auth_user_created_check_ip on auth.users;
CREATE TRIGGER on_auth_user_created_check_ip
    BEFORE INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.check_ip_rate_limit();

-- 4. Create Function to Log IP after successful Sign Up
CREATE OR REPLACE FUNCTION public.log_ip_after_signup()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.ip_logs (ip_address)
    VALUES (new.ip);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create Trigger to Log IP after Sign Up
DROP TRIGGER IF EXISTS on_auth_user_created_log_ip on auth.users;
CREATE TRIGGER on_auth_user_created_log_ip
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.log_ip_after_signup();

-- 6. Create Device ID Check Function for Signup
CREATE OR REPLACE FUNCTION public.check_device_id_on_signup()
RETURNS trigger AS $$
DECLARE
    device_id_count integer;
    device_id_from_meta text := new.raw_user_meta_data->>'device_id';
BEGIN
    IF device_id_from_meta IS NOT NULL THEN
        SELECT count(*) INTO device_id_count
        FROM auth.users
        WHERE raw_user_meta_data->>'device_id' = device_id_from_meta;

        IF device_id_count > 0 THEN
            RAISE EXCEPTION 'DEVICE_ID_IN_USE';
        END IF;
    END IF;
    RETURN new;
END;
$$ LANGUAGE plpgsql;

-- 7. Create Trigger to Check Device ID on Sign Up
DROP TRIGGER IF EXISTS on_auth_user_created_check_device_id on auth.users;
CREATE TRIGGER on_auth_user_created_check_device_id
    BEFORE INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.check_device_id_on_signup();`}</pre>
                        </div>
                         <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowSqlModal(false)} style={{ ...buttonStyle, backgroundColor: '#718096', marginTop: 0 }}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
