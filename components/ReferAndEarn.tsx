
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { supabase } from '../utils/supabase';
import { View, AppConfigContext } from '../App';
import { UserGroupIconSVG, TotalWinningsIconSVG } from '../assets/icons';
import { useLanguage } from '../contexts/LanguageContext';

interface ReferAndEarnProps {
    setView: (view: View) => void;
}

const ReferAndEarn: React.FC<ReferAndEarnProps> = ({ setView }) => {
    const { currencySymbol } = useContext(AppConfigContext);
    const { t } = useLanguage();
    const [totalRefers, setTotalRefers] = useState(0);
    const [totalEarnings, setTotalEarnings] = useState(0);
    const [referralCode, setReferralCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    // New states for claim feature
    const [isEligibleToClaim, setIsEligibleToClaim] = useState(false);
    const [claimCode, setClaimCode] = useState('');
    const [isClaiming, setIsClaiming] = useState(false);
    const [claimMessage, setClaimMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const fetchData = useCallback(async () => {
        if (!supabase) return;
        setLoading(true);
        try {
            const { data: { user } } = await (supabase.auth as any).getUser();
            if (!user) throw new Error("User not found");

            // Fetch profile for referral code and referred_by status
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('referral_code, referred_by')
                .eq('id', user.id)
                .single();
            if (profileError) throw profileError;
            setReferralCode(profile?.referral_code || null);

            // Check if user is eligible to claim a code
            // A user is eligible if they haven't been referred AND they haven't made a deposit yet.
            if (profile?.referred_by === null) {
                const { count, error: depositError } = await supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('type', 'DEPOSIT');
                if (depositError) throw depositError;
                if (count === 0) {
                    setIsEligibleToClaim(true);
                }
            } else {
                setIsEligibleToClaim(false);
            }

            // Fetch total valid referred users count (users who have deposited)
            const { data: count, error: countError } = await supabase.rpc('get_valid_referral_count', {
                p_user_id: user.id
            });
            if (countError) throw countError;
            setTotalRefers(count || 0);


            // Fetch total referral earnings
            const { data: earningsData, error: earningsError } = await supabase
                .from('transactions')
                .select('amount')
                .eq('user_id', user.id)
                .eq('type', 'REFERRAL_BONUS');
            if (earningsError) throw earningsError;
            const total = earningsData.reduce((acc, t) => acc + Number(t.amount), 0);
            setTotalEarnings(total);

        } catch (error) {
            console.error("Error fetching referral data:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCopyCode = async () => {
        if (!referralCode) return;
        try {
            if (!navigator.clipboard) {
                throw new Error('Clipboard API not available');
            }
            await navigator.clipboard.writeText(referralCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy referral code:", err);
            alert("Could not copy code automatically. Please copy it manually.");
        }
    };

    const handleClaimCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!claimCode.trim() || !supabase) return;
        
        setIsClaiming(true);
        setClaimMessage(null);

        try {
            const { data, error } = await supabase.rpc('claim_referral_code', {
                p_referral_code: claimCode.trim()
            });

            if (error) throw error;

            if (typeof data === 'string' && data.startsWith('Error:')) {
                setClaimMessage({ type: 'error', text: data.replace('Error: ', '') });
            } else {
                setClaimMessage({ type: 'success', text: data });
                setIsEligibleToClaim(false); // Hide the form on success
            }
        } catch (err: any) {
            setClaimMessage({ type: 'error', text: err.message });
        } finally {
            setIsClaiming(false);
        }
    };


    return (
        <div className="refer-page-container">
            <h1 style={{ margin: 0, paddingBottom: '1rem' }}>{t('refer_title', 'Refer & Earn')}</h1>

            <div className="refer-tabs-container">
                <button className="refer-tab-btn" onClick={() => setView('refer-history')}>{t('refer_btn_history', 'Refer History')}</button>
                <button className="refer-tab-btn active" onClick={() => setView('refer-leaderboard')}>{t('refer_btn_leaderboard', 'Refer Leaderboard')}</button>
            </div>
            
            <div className="refer-highlight-grid">
                <div className="refer-highlight-card refer-card-1">
                    <div className="value">{loading ? '...' : totalRefers}</div>
                    <div className="label">{t('refer_total_refer', 'Total Refer')}</div>
                    <div className="icon" dangerouslySetInnerHTML={{ __html: UserGroupIconSVG() }} />
                </div>

                <div className="refer-highlight-card refer-card-2">
                    <div className="value">{currencySymbol}{loading ? '...' : totalEarnings.toFixed(2)}</div>
                    <div className="label">{t('refer_total_earn', 'Total Refer Earn')}</div>
                    <div className="icon" dangerouslySetInnerHTML={{ __html: TotalWinningsIconSVG() }} />
                </div>
            </div>

            <div className="referral-code-card">
                <p className="label">{t('refer_your_code', 'Your Referral Code')}</p>
                <div className="referral-code-value" onClick={handleCopyCode}>
                    {loading ? '...' : (referralCode || 'N/A')}
                </div>
                <p style={{ color: 'var(--text-gray)', fontSize: '0.9rem', minHeight: '1.2em' }}>
                    {copied ? 'Copied!' : t('refer_copy_msg', 'Tap to copy & share with your friends!')}
                </p>
            </div>
            
            {isEligibleToClaim && !loading && (
                <div className="claim-code-card">
                    <h3 className="claim-card-title">{t('refer_claim_title', 'Claim Referral Code')}</h3>
                    <p className="claim-card-subtitle">{t('refer_claim_subtitle', "Did a friend refer you? Enter their code below to claim your reward.")}</p>
                    <form onSubmit={handleClaimCode} className="claim-form">
                        <input
                            type="text"
                            placeholder="Enter friend's code"
                            value={claimCode}
                            onChange={(e) => setClaimCode(e.target.value)}
                            className="claim-input"
                            disabled={isClaiming}
                        />
                        <button type="submit" className="claim-button" disabled={isClaiming}>
                            {isClaiming ? '...' : t('refer_btn_claim', 'Claim')}
                        </button>
                    </form>
                    {claimMessage && (
                        <p className={`claim-message ${claimMessage.type}`}>
                            {claimMessage.text}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default ReferAndEarn;
