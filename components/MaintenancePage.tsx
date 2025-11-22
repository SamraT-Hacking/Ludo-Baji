
import React, { useState, useEffect } from 'react';

interface MaintenancePageProps {
    endTime?: string | null;
}

const MaintenancePage: React.FC<MaintenancePageProps> = ({ endTime }) => {
    const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

    useEffect(() => {
        if (!endTime) return;

        const calculateTimeLeft = () => {
            const difference = new Date(endTime).getTime() - new Date().getTime();
            if (difference > 0) {
                return {
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60)
                };
            } else {
                // Time is up, reload to check if site is live
                window.location.reload();
                return null;
            }
        };

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        // Initial calc
        setTimeLeft(calculateTimeLeft());

        return () => clearInterval(timer);
    }, [endTime]);

    const handleRetry = () => {
        window.location.reload();
    };

    // Styles
    const containerStyle: React.CSSProperties = {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a202c 0%, #2d3748 100%)',
        color: '#ffd700', // Gold
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem',
        textAlign: 'center',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    };

    const cardStyle: React.CSSProperties = {
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '3rem 2rem',
        border: '1px solid rgba(255, 215, 0, 0.3)',
        maxWidth: '600px',
        width: '100%',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
    };

    const iconStyle: React.CSSProperties = {
        fontSize: '4rem',
        marginBottom: '1.5rem',
        animation: 'pulse 2s infinite ease-in-out'
    };

    const titleStyle: React.CSSProperties = {
        fontSize: '2.5rem',
        fontWeight: 'bold',
        marginBottom: '1rem',
        textTransform: 'uppercase',
        letterSpacing: '2px',
        background: 'linear-gradient(to right, #ffd700, #fff, #ffd700)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    };

    const textStyle: React.CSSProperties = {
        fontSize: '1.1rem',
        color: '#e2e8f0',
        marginBottom: '2rem',
        lineHeight: '1.6'
    };

    const timerContainerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'center',
        gap: '1.5rem',
        marginBottom: '2.5rem',
        flexWrap: 'wrap'
    };

    const timeBoxStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'rgba(0, 0, 0, 0.3)',
        padding: '1rem',
        borderRadius: '10px',
        minWidth: '80px',
        border: '1px solid rgba(255, 215, 0, 0.1)'
    };

    const timeValStyle: React.CSSProperties = {
        fontSize: '2rem',
        fontWeight: 'bold',
        color: '#fff'
    };

    const timeLabelStyle: React.CSSProperties = {
        fontSize: '0.8rem',
        color: '#ffd700',
        textTransform: 'uppercase',
        marginTop: '0.25rem'
    };

    const buttonStyle: React.CSSProperties = {
        padding: '1rem 2.5rem',
        background: 'linear-gradient(45deg, #ffd700, #ffa500)',
        border: 'none',
        borderRadius: '50px',
        color: '#1a202c',
        fontWeight: 'bold',
        fontSize: '1.1rem',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        boxShadow: '0 5px 15px rgba(255, 215, 0, 0.3)'
    };

    return (
        <div style={containerStyle}>
            <style>
                {`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.1); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
                `}
            </style>
            <div style={cardStyle}>
                <div style={iconStyle}>⚙️</div>
                <h1 style={titleStyle}>Under Maintenance</h1>
                <p style={textStyle}>
                    We are currently performing scheduled maintenance to improve your experience. 
                    We will be back shortly. Thank you for your patience!
                </p>

                {timeLeft && (
                    <div style={timerContainerStyle}>
                        <div style={timeBoxStyle}>
                            <span style={timeValStyle}>{String(timeLeft.days).padStart(2, '0')}</span>
                            <span style={timeLabelStyle}>Days</span>
                        </div>
                        <div style={timeBoxStyle}>
                            <span style={timeValStyle}>{String(timeLeft.hours).padStart(2, '0')}</span>
                            <span style={timeLabelStyle}>Hours</span>
                        </div>
                        <div style={timeBoxStyle}>
                            <span style={timeValStyle}>{String(timeLeft.minutes).padStart(2, '0')}</span>
                            <span style={timeLabelStyle}>Mins</span>
                        </div>
                        <div style={timeBoxStyle}>
                            <span style={timeValStyle}>{String(timeLeft.seconds).padStart(2, '0')}</span>
                            <span style={timeLabelStyle}>Secs</span>
                        </div>
                    </div>
                )}

                <button 
                    style={buttonStyle} 
                    onClick={handleRetry}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    Retry Now
                </button>
            </div>
        </div>
    );
};

export default MaintenancePage;
