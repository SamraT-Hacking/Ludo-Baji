import React from 'react';

interface SimpleMessageModalProps {
  title: string;
  message: string;
  onClose: () => void;
}

const SimpleMessageModal: React.FC<SimpleMessageModalProps> = ({ title, message, onClose }) => {
  return (
    <div className="game-over-overlay">
      <div className="game-over-modal">
        <div className="game-over-header">
          <div className="no-winner-highlight">
            <h2>{title}</h2>
          </div>
        </div>
        <div className="game-over-body" style={{ paddingBottom: '2rem' }}>
          <p style={{ textAlign: 'center', fontSize: '1.1rem', margin: 0 }}>{message}</p>
        </div>
        <div className="game-over-footer">
          <button className="game-over-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimpleMessageModal;
