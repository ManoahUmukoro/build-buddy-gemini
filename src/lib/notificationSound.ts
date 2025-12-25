// Calm notification sounds using Web Audio API
// Creates gentle, non-alarming tones

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

// Gentle chime - for task reminders
export function playReminderSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Create a gentle two-tone chime
    const frequencies = [523.25, 659.25]; // C5 and E5 - pleasant interval
    
    frequencies.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, now);
      
      // Gentle fade in and out
      gainNode.gain.setValueAtTime(0, now + i * 0.15);
      gainNode.gain.linearRampToValueAtTime(0.15, now + i * 0.15 + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, now + i * 0.15 + 0.4);
      
      oscillator.start(now + i * 0.15);
      oscillator.stop(now + i * 0.15 + 0.5);
    });
  } catch (e) {
    console.log('Audio playback not supported:', e);
  }
}

// Success chime - for focus session completion
export function playSuccessSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Ascending three-tone success sound
    const frequencies = [392, 493.88, 587.33]; // G4, B4, D5 - major chord arpeggio
    
    frequencies.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, now);
      
      // Gentle envelope
      gainNode.gain.setValueAtTime(0, now + i * 0.12);
      gainNode.gain.linearRampToValueAtTime(0.12, now + i * 0.12 + 0.03);
      gainNode.gain.linearRampToValueAtTime(0.08, now + i * 0.12 + 0.15);
      gainNode.gain.linearRampToValueAtTime(0, now + i * 0.12 + 0.5);
      
      oscillator.start(now + i * 0.12);
      oscillator.stop(now + i * 0.12 + 0.6);
    });
  } catch (e) {
    console.log('Audio playback not supported:', e);
  }
}

// Soft notification ping - for general notifications
export function playSoftPing(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, now); // A5 - clear but not harsh
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.1, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    
    oscillator.start(now);
    oscillator.stop(now + 0.35);
  } catch (e) {
    console.log('Audio playback not supported:', e);
  }
}
