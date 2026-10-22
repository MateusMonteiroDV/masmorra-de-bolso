/**
 * AudioService com sintetizador WebAudio chiptune/8-bit embutido.
 * Garante efeitos sonoros táteis e imediatos mesmo antes do artista
 * entregar os arquivos de áudio .wav/.mp3.
 */
class AudioManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private initCtx(): AudioContext | null {
    if (this.isMuted) return null;
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) this.ctx = new AudioContextClass();
    }
    if (this.ctx?.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  private playTone(
    type: OscillatorType,
    duration: number,
    gainVal: number,
    scheduleFreq: (freq: AudioParam, now: number) => void
  ) {
    const ctx = this.initCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    scheduleFreq(osc.frequency, now);
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  public playAttackSwing() {
    this.playTone('triangle', 0.12, 0.18, (f, now) => {
      f.setValueAtTime(320, now);
      f.exponentialRampToValueAtTime(80, now + 0.12);
    });
  }

  public playEmptyBowClick() {
    this.playTone('triangle', 0.04, 0.2, (f, now) => {
      f.setValueAtTime(800, now);
      f.exponentialRampToValueAtTime(120, now + 0.04);
    });
    this.playTone('square', 0.02, 0.15, (f, now) => {
      f.setValueAtTime(1200, now);
      f.exponentialRampToValueAtTime(300, now + 0.02);
    });
  }

  public playShieldBlock() {
    this.playTone('triangle', 0.14, 0.25, (f, now) => {
      f.setValueAtTime(920, now);
      f.exponentialRampToValueAtTime(460, now + 0.14);
    });
    this.playTone('square', 0.05, 0.18, (f, now) => {
      f.setValueAtTime(1400, now);
      f.exponentialRampToValueAtTime(300, now + 0.05);
    });
  }

  public playDash() {
    this.playTone('sine', 0.16, 0.2, (f, now) => {
      f.setValueAtTime(450, now);
      f.exponentialRampToValueAtTime(150, now + 0.16);
    });
  }

  public playEnemyHit() {
    this.playTone('square', 0.08, 0.15, (f, now) => {
      f.setValueAtTime(280, now);
      f.exponentialRampToValueAtTime(60, now + 0.08);
    });
  }

  public playPlayerHurt() {
    this.playTone('sawtooth', 0.2, 0.25, (f, now) => {
      f.setValueAtTime(160, now);
      f.exponentialRampToValueAtTime(40, now + 0.2);
    });
  }

  public playCoin() {
    this.playTone('sine', 0.25, 0.15, (f, now) => {
      f.setValueAtTime(987.77, now);
      f.setValueAtTime(1318.51, now + 0.07);
    });
  }

  public playBuyUpgrade() {
    this.playTone('triangle', 0.45, 0.2, (f, now) => {
      f.setValueAtTime(523.25, now);
      f.setValueAtTime(659.25, now + 0.08);
      f.setValueAtTime(783.99, now + 0.16);
      f.setValueAtTime(1046.5, now + 0.24);
    });
  }

  public playRoomCleared() {
    this.playTone('triangle', 0.35, 0.18, (f, now) => {
      f.setValueAtTime(440, now);
      f.setValueAtTime(554.37, now + 0.1);
      f.setValueAtTime(659.25, now + 0.2);
    });
  }

  public playMagicCast() {
    this.playTone('sine', 0.15, 0.12, (f, now) => {
      f.setValueAtTime(700, now);
      f.exponentialRampToValueAtTime(300, now + 0.15);
    });
  }

  public playHeavySlam() {
    this.playTone('triangle', 0.22, 0.28, (f, now) => {
      f.setValueAtTime(140, now);
      f.exponentialRampToValueAtTime(30, now + 0.22);
    });
  }

  public playMinotaurRoar() {
    this.playTone('sawtooth', 0.35, 0.22, (f, now) => {
      f.setValueAtTime(95, now);
      f.linearRampToValueAtTime(150, now + 0.15);
      f.exponentialRampToValueAtTime(55, now + 0.35);
    });
  }
}

export const AudioService = new AudioManager();

