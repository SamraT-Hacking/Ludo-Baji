
import React from 'react';
import { type Player, PieceState } from '../types';

interface PlayerInfoProps {
  player: Player;
  isCurrent: boolean;
  boardSize: number;
}

const PlayerInfo: React.FC<PlayerInfoProps> = ({ player, isCurrent, boardSize }) => {
    const color = player.color.toLowerCase();
    
    const baseFontSize = boardSize / 45; 
    const headerFontSize = Math.max(10, baseFontSize * 1.1);
    const textFontSize = Math.max(9, baseFontSize);

    const glowAnimation = `
        @keyframes player-info-glow {
            0% {
                box-shadow: 0 0 ${boardSize / 50}px gold;
                border-color: gold;
            }
            50% {
                box-shadow: 0 0 ${boardSize / 25}px gold, 0 0 ${boardSize / 40}px #fff3a3 inset;
                border-color: #fff3a3;
            }
            100% {
                box-shadow: 0 0 ${boardSize / 50}px gold;
                border-color: gold;
            }
        }
    `;

    const style: React.CSSProperties = {
        padding: '5%',
        border: `4px solid ${isCurrent ? 'gold' : `var(--${color}-base)`}`,
        borderRadius: '8px',
        backgroundColor: `var(--player-info-bg-${color})`,
        color: `var(--player-info-text-${color})`,
        boxShadow: isCurrent ? `0 0 ${boardSize/40}px gold` : '2px 2px 5px rgba(0,0,0,0.3)',
        textAlign: 'center',
        transition: 'all 0.3s ease',
        opacity: player.isRemoved ? 0.6 : 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        boxSizing: 'border-box',
        animation: isCurrent ? 'player-info-glow 2s infinite ease-in-out' : 'none',
    };
    
    const inactiveTurns = player.inactiveTurns || 0;
    const dotSize = Math.max(8, boardSize / 60); // Increased size slightly for better visibility
    const dotGap = Math.max(4, boardSize / 120);

    return (
        <>
            {isCurrent && <style>{glowAnimation}</style>}
            <div style={style}>
                <h3 style={{ margin: 0, textShadow: '1px 1px 2px rgba(0,0,0,0.4)', fontSize: `${headerFontSize}px`, wordBreak: 'break-word' }}>
                    {player.name}
                </h3>
                {inactiveTurns > 0 && (
                    <div style={{ 
                        display: 'flex', 
                        gap: `${dotGap}px`, 
                        marginTop: `${dotGap}px`, 
                        height: `${dotSize}px`, 
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%'
                    }}>
                        {Array.from({ length: inactiveTurns }).map((_, i) => (
                            <div key={i} style={{ 
                                width: `${dotSize}px`, 
                                height: `${dotSize}px`, 
                                backgroundColor: '#ff0000', // Bright Red
                                borderRadius: '50%',
                                border: '1px solid white',
                                boxShadow: '0 0 4px rgba(0,0,0,0.5)'
                            }} title="Missed Turn" />
                        ))}
                    </div>
                )}
                {player.isRemoved && <p style={{ margin: '0.25rem 0 0 0', fontSize: `${textFontSize}px`, fontWeight: 'bold' }}>(Left)</p>}
                <p style={{ margin: '0.25rem 0 0 0', fontSize: `${textFontSize}px` }}>
                    Finished: {player.pieces.filter(p => p.state === PieceState.Finished).length} / 4
                </p>
            </div>
        </>
    );
};

export default PlayerInfo;
