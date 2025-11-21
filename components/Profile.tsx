
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { Profile as ProfileType } from '../types';
import { TotalMatchesIconSVG, TotalWinsIconSVG, TotalLossesIconSVG, TotalWinningsIconSVG } from '../assets/icons';
import { useLanguage } from '../contexts/LanguageContext';

interface ProfileProps {
  session: any;
}

const Profile: React.FC<ProfileProps> = ({ session }) => {
    const { t } = useLanguage();

    // Personal Info State
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [profileMessage, setProfileMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
    const [fullName, setFullName] = useState(session.user.user_metadata.full_name || '');
    const email = session.user.email || '';
    // Initial phone from session or metadata
    const [phoneNumber, setPhoneNumber] = useState(session.user.phone || session.user.user_metadata?.mobile || session.user.user_metadata?.phone || '');

    // Game Stats State
    const [profileData, setProfileData] = useState<ProfileType | null>(null);
    const [totalWinnings, setTotalWinnings] = useState<number>(0);
    const [loadingStats, setLoadingStats] = useState(true);

    // Password Change State
    const [loadingPassword, setLoadingPassword] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const fetchProfileData = useCallback(async () => {
        if (!supabase) return;
        setLoadingStats(true);
        try {
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (profileError) throw profileError;

            setProfileData(profile);

            if (!fullName && profile.username) {
                setFullName(profile.username);
            }
            
            // Update phone number from profile if available and not set from session
            if (profile.mobile && !session.user.phone) {
                setPhoneNumber(profile.mobile);
            }

            const { data: transactions, error: transError } = await supabase
                .from('transactions')
                .select('amount')
                .eq('user_id', session.user.id)
                .eq('type', 'WINNINGS');

            if (transError) throw transError;

            const winnings = transactions.reduce((acc, t) => acc + Number(t.amount), 0);
            setTotalWinnings(winnings);

        } catch (error: any) {
            setProfileMessage({ type: 'error', text: t('prof_error_load_stats', 'Failed to load stats:') + ' ' + error.message });
        } finally {
            setLoadingStats(false);
        }
    }, [session.user.id, fullName, session.user.phone, t]);

    useEffect(() => {
        fetchProfileData();
    }, [fetchProfileData]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingProfile(true);
        setProfileMessage(null);

        // Update Auth metadata
        const { data: { user }, error: authError } = await (supabase!.auth as any).updateUser({
            data: { full_name: fullName, mobile: phoneNumber }
        });

        if (authError) {
            setProfileMessage({ type: 'error', text: authError.message });
            setLoadingProfile(false);
            return;
        }

        if (user) {
            // Update Profiles table
            const { error: profileError } = await supabase!
                .from('profiles')
                .update({ 
                    username: fullName, 
                    mobile: phoneNumber,
                    updated_at: new Date().toISOString() 
                })
                .eq('id', user.id);

            if (profileError) {
                setProfileMessage({ type: 'error', text: profileError.message });
            } else {
                setProfileMessage({ type: 'success', text: t('prof_update_success', 'Profile updated successfully!') });
                setTimeout(() => setProfileMessage(null), 3000);
            }
        }
        setLoadingProfile(false);
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            setPasswordMessage({ type: 'error', text: t('prof_pass_mismatch', 'New passwords do not match.') });
            return;
        }
        if (newPassword.length < 6) {
            setPasswordMessage({ type: 'error', text: t('prof_pass_min_length', 'Password must be at least 6 characters long.') });
            return;
        }
        
        setLoadingPassword(true);
        setPasswordMessage(null);
        
        const { error } = await (supabase!.auth as any).updateUser({ password: newPassword });

        if (error) {
            setPasswordMessage({ type: 'error', text: error.message });
        } else {
            setPasswordMessage({ type: 'success', text: t('prof_pass_update_success', 'Password updated successfully!') });
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => setPasswordMessage(null), 3000);
        }
        setLoadingPassword(false);
    }
    
    const messageStyle: React.CSSProperties = {
        padding: '0.75rem', borderRadius: '5px', marginTop: '1rem', textAlign: 'center', color: 'white', fontSize: '0.9rem'
    };

    const StatCard: React.FC<{ icon: string; value: string | number; label: string; color: string; }> = ({ icon, value, label, color }) => (
        <div className="stat-item">
            <div className="stat-icon" style={{ backgroundColor: color }}>
                <div dangerouslySetInnerHTML={{ __html: icon }} />
            </div>
            <div className="stat-info">
                <div className="stat-value">{loadingStats ? '...' : value}</div>
                <div className="stat-label">{label}</div>
            </div>
        </div>
    );
    
    return (
        <div className="profile-page-container">
            {/* Personal Info Card */}
            <div className="profile-card">
                <h2 className="profile-card-header">{t('prof_personal_info', 'Personal Information')}</h2>
                <form onSubmit={handleUpdateProfile} className="profile-form-grid">

                    <div className="profile-input-group">
                        <label htmlFor="fullName">{t('auth_input_fullname', 'Full Name')}</label>
                        <input id="fullName" type="text" value={fullName}
                               onChange={(e) => setFullName(e.target.value)}
                               className="profile-input" />
                    </div>

                    <div className="profile-input-group">
                        <label htmlFor="email">{t('auth_input_email', 'Email')}</label>
                        <input id="email" type="email" value={email} disabled className="profile-input" />
                    </div>

                    <div className="profile-input-group">
                        <label htmlFor="phone">{t('auth_input_phone', 'Phone')}</label>
                        <input 
                            id="phone" 
                            type="tel" 
                            value={phoneNumber} 
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="profile-input"
                            placeholder={t('prof_not_provided', 'Not provided')}
                            disabled
                        />
                    </div>

                    <div>
                        <button type="submit" className="profile-submit-btn" disabled={loadingProfile}>
                            {loadingProfile ? t('prof_saving', 'Saving...') : t('prof_btn_save', 'Save Changes')}
                        </button>
                    </div>
                </form>

                {profileMessage &&
                    <div style={{ ...messageStyle, backgroundColor: profileMessage.type === 'success' ? '#4CAF50' : '#f44336' }}>
                        {profileMessage.text}
                    </div>}
            </div>

            {/* Game Statistics Card */}
            <div className="profile-card">
                <h2 className="profile-card-header">{t('prof_game_stats', 'Game Statistics')}</h2>
                <div className="game-stats-grid">
                    <StatCard 
                        icon={TotalMatchesIconSVG()}
                        value={(profileData?.wins ?? 0) + (profileData?.losses ?? 0)}
                        label={t('prof_stat_matches', 'Total Matches')}
                        color="#4299e1"
                    />

                    <StatCard 
                        icon={TotalWinsIconSVG()}
                        value={profileData?.wins ?? 0}
                        label={t('prof_stat_wins', 'Total Wins')}
                        color="#48bb78"
                    />

                    <StatCard 
                        icon={TotalLossesIconSVG()}
                        value={profileData?.losses ?? 0}
                        label={t('prof_stat_losses', 'Total Losses')}
                        color="#f56565"
                    />

                    <StatCard 
                        icon={TotalWinningsIconSVG()}
                        value={`৳${totalWinnings.toFixed(2)}`}
                        label={t('prof_stat_winnings', 'Total Winnings')}
                        color="#ed8936"
                    />
                </div>
            </div>

            {/* Password Reset Card */}
            <div className="profile-card">
                <h2 className="profile-card-header">{t('prof_change_pass', 'Change Password')}</h2>

                <form onSubmit={handlePasswordChange} className="profile-form-grid">

                    <div className="profile-input-group">
                        <label htmlFor="oldPassword">{t('prof_old_pass', 'Old Password')}</label>
                        <input id="oldPassword" type="password" value={oldPassword}
                               onChange={(e) => setOldPassword(e.target.value)}
                               className="profile-input"
                               placeholder={t('prof_placeholder_old_pass', 'Enter your current password')} />
                    </div>

                    <div className="profile-input-group">
                        <label htmlFor="newPassword">{t('prof_new_pass', 'New Password')}</label>
                        <input id="newPassword" type="password" value={newPassword}
                               onChange={(e) => setNewPassword(e.target.value)}
                               className="profile-input"
                               placeholder={t('prof_placeholder_new_pass', 'Enter a new password')} />
                    </div>

                    <div className="profile-input-group">
                        <label htmlFor="confirmPassword">{t('prof_confirm_pass', 'Confirm New Password')}</label>
                        <input id="confirmPassword" type="password" value={confirmPassword}
                               onChange={(e) => setConfirmPassword(e.target.value)}
                               className="profile-input"
                               placeholder={t('prof_placeholder_confirm_pass', 'Confirm the new password')} />
                    </div>

                    <div>
                        <button type="submit" className="profile-submit-btn" disabled={loadingPassword}>
                            {loadingPassword ? t('prof_updating', 'Updating...') : t('prof_btn_update_pass', 'Update Password')}
                        </button>
                    </div>
                </form>

                {passwordMessage &&
                    <div style={{ ...messageStyle, backgroundColor: passwordMessage.type === 'success' ? '#4CAF50' : '#f44336' }}>
                        {passwordMessage.text}
                    </div>}
            </div>
        </div>
    );
};

export default Profile;
