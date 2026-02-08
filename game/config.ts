import { Judgement, type TimingWindow } from "./scoring";

/**
 * Configuration options for the RhythmGame engine.
 */
export interface GameConfig {
  /**
   * List of timing windows defining how close a hit must be to the perfect beat.
   * Ordered from best (Marvellous) to worst (Boo).
   */
  timingWindows: TimingWindow[];
  
  /**
   * Points awarded per tick when holding a Hold note.
   */
  holdTickScore: number;
  
  /**
   * The timing window (in ms) after which a note is considered missed.
   * Usually matches the end of the widest timing window (e.g. BOO).
   */
  missWindow: number;
}

export const STANDARD_TIMING_WINDOWS: TimingWindow[] = [
  { judgement: Judgement.MARVELOUS, windowMs: 22.5, score: 5 },
  { judgement: Judgement.PERFECT, windowMs: 45, score: 4 },
  { judgement: Judgement.GREAT, windowMs: 90, score: 3 },
  { judgement: Judgement.GOOD, windowMs: 135, score: 2 },
  { judgement: Judgement.BOO, windowMs: 180, score: 0 },
];

export const DEFAULT_CONFIG: GameConfig = {
  timingWindows: STANDARD_TIMING_WINDOWS,
  holdTickScore: 1,
  missWindow: 180, // Default to BOO window end
};
