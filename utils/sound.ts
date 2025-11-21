

// A simple sound utility using the Web Audio API to avoid adding assets.

let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window !== 'undefined' && !audioContext) {
    try {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
        console.error("Web Audio API is not supported in this browser");
        return null;
    }
  }
  return audioContext;
};

const playTone = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
  const context = getAudioContext();
  if (!context || context.state === 'suspended') {
    context?.resume();
  }
  if (!context) return;

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, context.currentTime);
  gainNode.gain.setValueAtTime(0.1, context.currentTime); // Lower volume
  gainNode.gain.exponentialRampToValueAtTime(0.00001, context.currentTime + duration);

  oscillator.start(context.currentTime);
  oscillator.stop(context.currentTime + duration);
};

export const playDiceRollSound = () => {
  playTone(440, 0.1, 'square');
  setTimeout(() => playTone(330, 0.1, 'square'), 50);
  setTimeout(() => playTone(550, 0.15, 'square'), 100);
};

export const playMoveSound = () => {
  playTone(660, 0.05, 'triangle');
};

export const playStartSound = () => {
    playTone(783.99, 0.1, 'triangle'); // G5
};

export const playCaptureSound = () => {
  playTone(220, 0.2, 'sawtooth');
};

export const playFinishPieceSound = () => {
    playTone(880, 0.2, 'sine');
}

export const playWinSound = () => {
  playTone(523.25, 0.15, 'sine'); // C5
  setTimeout(() => playTone(659.26, 0.15, 'sine'), 150); // E5
  setTimeout(() => playTone(783.99, 0.15, 'sine'), 300); // G5
  setTimeout(() => playTone(1046.50, 0.3, 'sine'), 450); // C6
};

export const playCountdownBipSound = () => {
  playTone(1200, 0.08, 'sine');
};

export const playMatchReadySound = () => {
    // Play a distinct sequence for match ready
    const context = getAudioContext();
    if (!context) return;
    if(context.state === 'suspended') context.resume();
    
    // Simple repeating pattern for a few seconds
    for (let i = 0; i < 6; i++) {
        setTimeout(() => {
             playTone(880, 0.1, 'square');
             setTimeout(() => playTone(1100, 0.1, 'square'), 100);
        }, i * 800);
    }
};

export const playMessageSound = () => {
    playTone(800, 0.1, 'sine');
    setTimeout(() => playTone(600, 0.1, 'sine'), 100);
};
