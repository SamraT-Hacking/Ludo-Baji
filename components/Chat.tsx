import React, { useState, useEffect, useRef } from 'react';
import { Player, ChatMessage } from '../types';

interface ChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  players: Player[];
  currentPlayerId: string | null;
}

const Chat: React.FC<ChatProps> = ({ messages, onSendMessage, players }) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };
  
  const titleStyle: React.CSSProperties = {
      marginTop: 0,
      textAlign: 'center',
      paddingBottom: '0.75rem',
      fontWeight: '600',
      color: '#2d3748',
      fontSize: '1.25rem',
  };

  const messagesListStyle: React.CSSProperties = {
    flexGrow: 1,
    overflowY: 'auto',
    padding: '0 0.5rem',
  };

  const messageWrapperStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: '1rem',
  };
  
  const senderNameStyle: React.CSSProperties = {
      fontWeight: 'bold',
      fontSize: '0.9rem',
      marginBottom: '0.25rem',
      marginLeft: '0.25rem'
  };

  const messageBubbleStyle: React.CSSProperties = {
      padding: '0.5rem 0.8rem',
      borderRadius: '18px',
      backgroundColor: '#fff',
      wordBreak: 'break-word',
      maxWidth: '90%',
      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
      lineHeight: 1.4,
  };


  const formStyle: React.CSSProperties = {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '1rem',
  };
  
  const inputStyle: React.CSSProperties = {
    flexGrow: 1,
    padding: '0.75rem 1rem',
    border: 'none',
    borderRadius: '25px',
    fontSize: '1rem',
    backgroundColor: 'white',
    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)',
  };
  
  const buttonStyle: React.CSSProperties = {
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '25px',
    backgroundColor: '#4CAF50',
    color: 'white',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold',
    transition: 'background-color 0.2s',
  };

  const getPlayer = (playerId: string) => {
    return players.find(p => p.playerId === playerId);
  };
  
  const getSenderName = (msg: ChatMessage) => {
      if (msg.name.toLowerCase() === 'admin') return 'Admin';
      return msg.name;
  }
  
  const getSenderColor = (msg: ChatMessage) => {
      if (msg.name.toLowerCase() === 'admin') return '#38a169'; // Green for Admin
      const player = getPlayer(msg.playerId);
      return player ? `var(--${player.color.toLowerCase()}-base)` : '#c53030'; // Red for other players as per example
  }

  return (
    <div className="chat-container">
      <h3 style={titleStyle}>Game Chat</h3>
      <div style={messagesListStyle}>
        {messages.map((msg) => (
            <div key={msg.id} style={messageWrapperStyle}>
                <strong style={{ ...senderNameStyle, color: getSenderColor(msg) }}>{getSenderName(msg)}</strong>
                <div style={messageBubbleStyle}>
                    <span>{msg.text}</span>
                </div>
            </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} style={formStyle}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          style={inputStyle}
          maxLength={100}
          aria-label="Chat message input"
        />
        <button type="submit" style={buttonStyle}>Send</button>
      </form>
    </div>
  );
};

export default Chat;