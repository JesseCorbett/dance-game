export enum Judgement {
  MARVELOUS = "MARVELOUS",
  PERFECT = "PERFECT",
  GREAT = "GREAT",
  GOOD = "GOOD",
  BOO = "BOO",
  MISS = "MISS",
}

export interface TimingWindow {
  judgement: Judgement;
  windowMs: number;
  score: number;
}

// Standard StepMania 4 / ITG timing windows (approximate) in milliseconds
// Marvelous: +/- 0.022500 s
// Perfect: +/- 0.045000 s
// Great: +/- 0.090000 s
// Good: +/- 0.135000 s
// Boo: +/- 0.180000 s
export const STANDARD_TIMING_WINDOWS: TimingWindow[] = [
  { judgement: Judgement.MARVELOUS, windowMs: 22.5, score: 5 },
  { judgement: Judgement.PERFECT, windowMs: 45, score: 4 },
  { judgement: Judgement.GREAT, windowMs: 90, score: 3 },
  { judgement: Judgement.GOOD, windowMs: 135, score: 2 },
  { judgement: Judgement.BOO, windowMs: 180, score: 0 },
];

export class ScoringSystem {
  score: number = 0;
  combo: number = 0;
  maxCombo: number = 0;
  judgements: Map<Judgement, number> = new Map();

  constructor(private timingWindows: TimingWindow[] = STANDARD_TIMING_WINDOWS) {
    Object.values(Judgement).forEach((j) => this.judgements.set(j, 0));
  }

  reset() {
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    Object.values(Judgement).forEach((j) => this.judgements.set(j, 0));
  }

  // Returns the judgement if Hit, or null if outside windows
  getJudgement(timeDiffMs: number): Judgement | null {
    const absDiff = Math.abs(timeDiffMs);
    for (const window of this.timingWindows) {
      if (absDiff <= window.windowMs) {
        return window.judgement;
      }
    }
    return null;
  }

  addHit(judgement: Judgement) {
    this.combo++;
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }
    this.judgements.set(judgement, (this.judgements.get(judgement) || 0) + 1);

    const match = this.timingWindows.find((w) => w.judgement === judgement);
    if (match) {
      this.score += match.score; // Simple scoring for now
    }
  }

  addMiss() {
    this.combo = 0;
    this.judgements.set(
      Judgement.MISS,
      (this.judgements.get(Judgement.MISS) || 0) + 1,
    );
  }

  addHoldTick(deltaMs: number) {
    this.score += 10 * (deltaMs / 1000); // Small score for holding
  }

  droppedHold() {
    // Optional: Break combo or just stop scoring?
    // For now, let's just not add score. Classic SM doesn't always break combo on dropped hold, 
    // but usually counts as NG at the end. 
    // We will just not score for now.
  }
}
