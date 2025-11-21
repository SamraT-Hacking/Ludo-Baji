
import React from 'react';

interface TimerProps {
  timeLeft: number;
  timeLimit: number;
}

const Timer: React.FC<TimerProps> = ({ timeLeft, timeLimit }) => {
  const radius = 45;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const progress = timeLeft / timeLimit;
  const strokeDashoffset = circumference * (1 - progress);

  // Force yellow color as requested
  const getTimeColor = () => '#FFD700'; 

  const timerContainerStyle: React.CSSProperties = {
    position: 'relative',
    width: '80px', // Slightly smaller to fit well
    height: '80px',
    margin: '0 10px',
  };

  const svgStyle: React.CSSProperties = {
    transform: 'rotate(-90deg)',
  };

  const circleStyle: React.CSSProperties = {
    transition: 'stroke-dashoffset 0.35s linear, stroke 0.35s ease',
    transform: `scale(1) translate(0px, 0px)`,
    transformOrigin: '50% 50%',
  };

  const textStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    fontFamily: 'monospace',
    color: '#FFD700', // Match the ring color
    textShadow: '0 0 2px black'
  };

  return (
    <div style={timerContainerStyle} aria-live="polite" aria-atomic="true">
      <svg height="100%" width="100%" viewBox="0 0 100 100" style={svgStyle}>
        <circle
          stroke="rgba(255, 255, 255, 0.2)"
          cx="50"
          cy="50"
          r={normalizedRadius}
          strokeWidth={stroke}
          fill="transparent"
        />
        <circle
          stroke={getTimeColor()}
          cx="50"
          cy="50"
          r={normalizedRadius}
          strokeWidth={stroke}
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ ...circleStyle, strokeDashoffset }}
        />
      </svg>
      <div style={textStyle}>{timeLeft}</div>
    </div>
  );
};

export default Timer;
