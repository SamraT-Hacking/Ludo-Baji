
import React, { useState, useEffect } from 'react';
import { cleanupAndReload } from '../utils/cacheBuster';

interface LoadingScreenProps {
  message: string;
  onCancel?: () => void;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message, onCancel }) => {
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
      
      {/* Normal Cancel Button if provided */}
      {onCancel && (
          <button 
            onClick={onCancel} 
            style={{
                marginTop: '1rem', padding: '0.6rem 1.2rem', 
                background: '#e53e3e', color: 'white', 
                border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
            }}
          >
            Cancel
          </button>
      )}

      {/* Hard Reset Button if stuck for too long */}
      {showReset && (
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p style={{ fontSize: '0.9rem', marginBottom: '10px', color: '#666' }}>
                Taking too long?
            </p>
            <button 
                className="loading-reset-btn" 
                onClick={cleanupAndReload}
                style={{
                    padding: '0.5rem 1rem', border: '1px solid #ccc', 
                    borderRadius: '4px', background: 'white', cursor: 'pointer'
                }}
            >
                Fix Loading Issue
            </button>
        </div>
      )}
    </div>
  );
};

export default LoadingScreen;
