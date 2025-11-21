
import React, { useState, useEffect } from 'react';
import { cleanupAndReload } from '../utils/cacheBuster';

interface LoadingScreenProps {
  message: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message }) => {
  const [showReset, setShowReset] = useState(false);

  useEffect(() => {
    // If loading takes more than 8 seconds, show the reset button
    const timer = setTimeout(() => {
        setShowReset(true);
    }, 8000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="loading-overlay">
      <div className="spinner"></div>
      <p>{message}</p>
      {showReset && (
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p style={{ fontSize: '0.9rem', marginBottom: '10px', color: '#666' }}>
                Taking too long?
            </p>
            <button 
                className="loading-reset-btn" 
                onClick={cleanupAndReload}
            >
                Fix Loading Issue
            </button>
        </div>
      )}
    </div>
  );
};

export default LoadingScreen;