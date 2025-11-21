
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { LudoLogoSVG, ShieldBanIconSVG } from '../assets/icons';
import { useLanguage } from '../contexts/LanguageContext';
import { performSecurityChecks, getDeviceFingerprint } from '../utils/security';

const Auth: React.FC = () => {
  const { t, languages, currentLang, changeLanguage } = useLanguage();
  
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showBanNotice, setShowBanNotice] = useState(false);

  // Form fields
  const [identifier, setIdentifier] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');

  useEffect(() => {
    // On mount, check if a ban notice needs to be displayed from a previous login attempt
    if (sessionStorage.getItem('showBanNotice') === 'true') {
        setShowBanNotice(true);
        sessionStorage.removeItem('showBanNotice');
    }
  }, []);

  const handleAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
        // 1. Preliminary Security Checks (Incognito, VPN - Client Side)
        const securityCheck = await performSecurityChecks(isLogin ? 'login' : 'signup');
        if (!securityCheck.allowed) {
            throw new Error(securityCheck.reason || "Access denied by security policy.");
        }

      if (isLogin) {
        const { data, error } = await (supabase!.auth as any).signInWithPassword({
          email: identifier,
          password: password,
        });
        if (error) throw error;
        
        if (data.user) {
            const { data: profile } = await supabase!
                .from('profiles')
                .select('is_banned')
                .eq('id', data.user.id)
                .single();
            
            if (profile?.is_banned) {
                sessionStorage.setItem('showBanNotice', 'true');
                await (supabase!.auth as any).signOut();
                return; 
            }
        }
      } else {
        // 2. Advanced Security Checks (IP Limit, Device Limit - Backend via RPC)
        const deviceId = await getDeviceFingerprint();
        // We assume client IP is handled by the edge function or passed via header if using Supabase Edge Functions.
        // For simple RPC, we pass a placeholder or rely on postgres `inet_client_addr()` if direct connection, 
        // but Supabase JS runs client side. We'll attempt to get IP via public API or rely on RPC to fetch from context if possible.
        // Since `inet_client_addr()` is often the Supabase Auth server IP in edge cases, passing IP from client is risky but standard for simple implementations.
        let ipAddress = 'unknown';
        try {
            const ipRes = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipRes.json();
            ipAddress = ipData.ip;
        } catch (e) { console.warn('Could not fetch IP'); }

        // Call Backend Security Check
        const { data: eligibility, error: checkError } = await supabase!.rpc('check_signup_eligibility', {
            p_ip: ipAddress,
            p_device_id: deviceId
        });

        if (checkError) {
            console.warn("Security RPC missing or error:", checkError);
            // Fail open or closed? Closed for security.
            // throw new Error("Security check failed. Contact support.");
        } else if (eligibility && !eligibility.allowed) {
            throw new Error(eligibility.reason);
        }

        const { data: signUpData, error } = await (supabase!.auth as any).signUp({
            email: email,
            password: password,
            options: {
                data: {
                  full_name: fullName,
                  phone: phoneNumber,
                  mobile: phoneNumber,
                  referral_code: referralCode.trim(),
                },
            }
          }
        );
        if (error) throw error;
        
        // Log the signup for security tracking
        if (signUpData.user) {
            await supabase!.rpc('log_user_signup', {
                p_user_id: signUpData.user.id,
                p_ip: ipAddress,
                p_device_id: deviceId
            });
        }

        setMessage(t('auth_verify_email', 'Check your email for the verification link!'));
      }
    } catch (error: any) {
      setError(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!identifier) {
        setError(t('auth_enter_email_reset', 'Please enter your email to reset your password.'));
        return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
        const { error } = await (supabase!.auth as any).resetPasswordForEmail(identifier, {
            redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMessage(t('auth_reset_success', 'Password reset link sent! Please check your email inbox.'));
    } catch (error: any) {
        setError(error.error_description || error.message);
    } finally {
        setLoading(false);
    }
  };

  const IconUser = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
  const IconMail = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>;
  const IconPhone = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>;
  const IconLock = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>;
  const IconGift = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>;

  return (
    <div className={`auth-container ${showBanNotice ? 'banned' : ''}`}>
      {showBanNotice ? (
          <div className="ban-notice-content">
              <div className="ban-notice-icon" dangerouslySetInnerHTML={{ __html: ShieldBanIconSVG() }} />
              <h1>{t('ban_notice_title', 'Account Suspended')}</h1>
              <p>
                  {t('ban_notice_p1', 'Your account has been suspended due to a violation of our terms of service. If you believe this is a mistake, please contact our support team.')}
              </p>
              <p>
                  {t('ban_notice_p2_1', 'Support Email:')} <a href="mailto:support@dreamludo.com">support@dreamludo.com</a>
              </p>
              <button className="ban-notice-back-btn" onClick={() => setShowBanNotice(false)}>
                  {t('ban_notice_btn', 'Try another account')}
              </button>
          </div>
      ) : (
        <>
          {/* Language selector */}
          <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem'}}>
            <select 
                value={currentLang} 
                onChange={(e) => changeLanguage(e.target.value)}
                style={{
                    padding: '5px 10px',
                    borderRadius: '20px',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    backgroundColor: 'var(--bg-main)',
                    color: 'var(--text-main)'
                }}
            >
                {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>
                        {lang.flag_icon} {lang.name}
                    </option>
                ))}
            </select>
          </div>

          {/* Header */}
          <div className="auth-header">
            <div className="auth-logo" dangerouslySetInnerHTML={{ __html: LudoLogoSVG(48) }} />
            <h1>{isLogin ? t('auth_welcome_back', 'Welcome Back!') : t('auth_create_account', 'Create an Account')}</h1>
            <p>{isLogin ? t('auth_login_subtitle', 'Log in to continue your game.') : t('auth_signup_subtitle', 'Join the fun and start playing.')}</p>
          </div>

          <form onSubmit={handleAuth} className="auth-form">
            
            {error && <div className="auth-message error">{error}</div>}
            {message && <div className="auth-message success">{message}</div>}

            {/* Full Name */}
            {!isLogin && (
              <div className="input-group">
                <span className="input-icon"><IconUser/></span>
                <input 
                  type="text" 
                  placeholder={t('auth_input_fullname', 'Full Name')} 
                  value={fullName} 
                  onChange={e => setFullName(e.target.value)} 
                  required 
                  className="auth-input" 
                />
              </div>
            )}

            {/* Email / Identifier */}
            {isLogin ? (
              <div className="input-group">
                <span className="input-icon"><IconMail/></span>
                <input 
                  type="text" 
                  placeholder={t('auth_input_email', 'Email or Phone Number')} 
                  value={identifier} 
                  onChange={e => setIdentifier(e.target.value)} 
                  required 
                  className="auth-input" 
                />
              </div>
            ) : (
              <>
                <div className="input-group">
                  <span className="input-icon"><IconMail/></span>
                  <input 
                    type="email" 
                    placeholder={t('auth_input_email_address', 'Email Address')} 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    required 
                    className="auth-input" 
                  />
                </div>
                <div className="input-group">
                  <span className="input-icon"><IconPhone/></span>
                  <input 
                    type="tel" 
                    placeholder={t('auth_input_phone', 'Phone Number')} 
                    value={phoneNumber} 
                    onChange={e => setPhoneNumber(e.target.value)} 
                    className="auth-input" 
                  />
                </div>
              </>
            )}

            {/* Password */}
            <div className="input-group">
              <span className="input-icon"><IconLock/></span>
              <input 
                type="password" 
                placeholder={t('auth_input_password', 'Password')} 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                className="auth-input" 
              />
            </div>

            {/* Referral Code */}
            {!isLogin && (
              <div className="input-group">
                <span className="input-icon"><IconGift/></span>
                <input 
                  type="text" 
                  placeholder={t('auth_input_referral', 'Referral Code (Optional)')}
                  value={referralCode} 
                  onChange={e => setReferralCode(e.target.value)} 
                  className="auth-input" 
                />
              </div>
            )}

            {/* Forgot Password */}
            {isLogin && (
                <div className="auth-actions">
                    <button 
                      type="button" 
                      className="forgot-password-btn" 
                      onClick={handleForgotPassword}
                    >
                      {t('auth_forgot_pass', 'Forgot Password?')}
                    </button>
                </div>
            )}

            {/* Submit */}
            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading 
                ? t('auth_processing', 'Processing...') 
                : (isLogin ? t('auth_btn_login', 'Log In') : t('auth_btn_signup', 'Sign Up'))
              }
            </button>
          </form>

          {/* Toggle */}
          <div className="auth-toggle">
            {isLogin
              ? t('auth_dont_have_account', "Don't have an account?")
              : t('auth_already_have_account', "Already have an account?")
            }{' '}
            <button 
              onClick={() => { 
                setIsLogin(!isLogin); 
                setError(null); 
                setMessage(null); 
              }} 
              className="auth-toggle-btn"
            >
              {isLogin ? t('auth_btn_signup', 'Sign Up') : t('auth_btn_login', 'Log In')}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Auth;
