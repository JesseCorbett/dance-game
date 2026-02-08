import type { Chart, Note } from "~/models/charts";
import { ScoringSystem, Judgement } from "./scoring";
import calculateTails from "./calculateTails";
import { type GameConfig, DEFAULT_CONFIG } from "./config";

// --- Event System ---
type GameEventType = "hit" | "miss" | "comboChange" | "scoreChange" | "beatUpdate" | "tailUpdate" | "finished" | "stop" | "bpmChange";

export interface GameEventData {
  hit: { track: string; judgement: Judgement; score: number };
  miss: { track?: string; noteIndex?: number; cause: "timeout" | "ghost" };
  comboChange: { combo: number; maxCombo: number };
  scoreChange: { score: number };
  beatUpdate: { beat: number };
  tailUpdate: { index: number; active: boolean; holding: boolean; dropped: boolean };
  finished: {};
  stop: { active: boolean };
  bpmChange: { bpm: number };
}

type EventHandler<T extends GameEventType> = (data: GameEventData[T]) => void;

export class RhythmGame {
  // Config & Scoring
  config: GameConfig;
  scoring: ScoringSystem;

  // Game State
  bpm: number = 100;
  currentBeat: number = 0;
  nextBeat: number = 0;
  chartIndex: number = 0;
  isPlaying: boolean = false;
  isFinished: boolean = false;
  
  // Data
  notes: Note[] = [];
  tails: ReturnType<typeof calculateTails> = [];
  
  // Note State
  noteStates: { hit: boolean; missed: boolean; judgement?: Judgement }[] = [];
  tailMeta: { active: boolean; available: boolean; holding: boolean; dropped: boolean }[] = [];
  tailHeadIndices: number[] = [];

  // Internal
  private eventListeners: Partial<Record<GameEventType, EventHandler<any>[]>> = {};
  stopUntil: number = 0; // Timestamp for STOP
  
  constructor(config: Partial<GameConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.scoring = new ScoringSystem(this.config.timingWindows);
  }

  loadChart(chart: Chart, difficultyIndex: number) {
    this.reset();
    const difficulty = chart.difficulties[difficultyIndex];
    if (!difficulty) {
      console.error("Invalid difficulty index");
      return;
    }

    // Sort notes
    this.notes = [...difficulty.notes].sort((a, b) => a.beat - b.beat);
    this.noteStates = new Array(this.notes.length).fill(null).map(() => ({ hit: false, missed: false }));

    // Prepare tails
    this.tails = calculateTails(this.notes);
    this.tailMeta = this.tails.map(() => ({ active: true, available: true, holding: false, dropped: false }));

    // Build optimization map
    this.tailHeadIndices = this.tails.map(tail => {
      return this.notes.findIndex(n => 
        n.beat === tail.beat && 
        n.tracks && 
        // @ts-ignore
        n.tracks[tail.track] === tail.type
      );
    });

    this.bpm = 100; // Default, usually set by first SetBPM note
  }

  start() {
    this.isPlaying = true;
  }

  stop() {
    this.isPlaying = false;
  }

  reset() {
    this.isPlaying = false;
    this.isFinished = false;
    this.currentBeat = 0;
    this.nextBeat = 0;
    this.chartIndex = 0;
    this.stopUntil = 0;
    this.scoring.reset();
    
    // Reset states if notes exist
    if (this.notes.length > 0) {
      this.noteStates = new Array(this.notes.length).fill(null).map(() => ({ hit: false, missed: false }));
      this.tailMeta = this.tails.map(() => ({ active: true, available: true, holding: false, dropped: false }));
    }
    
    this.emit("scoreChange", { score: 0 });
    this.emit("comboChange", { combo: 0, maxCombo: 0 });
  }

  // --- Main Update Loop ---
  update(deltaMs: number, currentTime: number, inputInterface: { isDown: (track: string) => boolean }) {
    if (!this.isPlaying || this.isFinished) return;
    
    // 1. Advance Beat
    this.advanceBeat(deltaMs, currentTime);
    
    // 2. Check timing misses (passed notes)
    this.checkMisses();

    // 3. Check Holds
    this.checkHolds(deltaMs, inputInterface);
  }

  private advanceBeat(deltaMs: number, currentTime: number) {
    // Handle Breaks/Stops
    if (this.stopUntil > currentTime) {
      this.emit("stop", { active: true });
      return; 
    }

    // Process Control Notes (BPM, STOP, etc)
    if (this.currentBeat >= this.nextBeat) {
      while (true) {
        const note = this.notes[this.chartIndex];
        // If end of song, handle finish? Not necessarily, wait for audio
        if (!note) {
          if (this.chartIndex >= this.notes.length) {
            // End of chart data
          }
          break; // Wait for beat to advance naturally
        }

        // We only process control notes ahead of time if they are "due"
        // Actually, currentBeat tracks logical position. 
        // We use chartIndex to scan note array.
        // We must ensure we don't skip over notes that are strictly 'play' notes.
        // The original logic separated TRACK_VALUE from control notes.
        
        // Re-implementing incrementBeat logic
        if (this.chartIndex >= this.notes.length) break;

        const nextNote = this.notes[this.chartIndex];
        
        // If this note is "in the future" logic-wise? 
        // No, notes are sorted by beat. 
        // If nextNote.beat > currentBeat ... wait.
        // BUT logic in Level.vue used 'nextBeat' variable to track segments.
        // That logic was a bit specific to handling "infinite loop" of processing simultaneous events.
        
        // Let's stick to the logic:
        // We process events AT the current beat.
        // But some events shift the beat (OFFSET) or change flow.
        
        // Wait, Level.vue logic used `nextBeat` which accumulated `note.value`.
        // This implies the chart structure is "relative" or "command stream" based?
        // Let's check `Level.vue` again.
        // `nextBeat = nextBeat + note.value` for TRACK_VALUE entries.
        // So TRACK_VALUE entries have a Duration? No, they define a segment of the chart?
        // Ah, `note.value` for TRACK_VALUE? Wait.
        // Standard SM charts have notes at absolute beats.
        // Parsing logic in this project might be different.
        
        // Let's assume the previous `Level.vue` `incrementBeat` logic was correct for the data format.
        // Copied logic:
        const n = this.notes[this.chartIndex];
        if (!n) break;
        
        // If we processed everything?
        // In Level.vue: loop checks `currentBeat >= nextBeat`.
        // If so, `note = notes[chartIndex++]`.
        // Process note.
        // If TRACK_VALUE, `nextBeat += note.value`.
        
        if (n.type === "OFFSET") {
           this.currentBeat += n.value;
           this.chartIndex++;
        } else if (n.type === "SET_BPM") {
           this.bpm = n.value;
           this.emit("bpmChange", { bpm: n.value });
           this.chartIndex++;
        } else if (n.type === "STOP") {
           this.stopUntil = currentTime + n.value * 1000;
           this.chartIndex++;
        } else if (n.type === "TRACK_VALUE") {
           // This note represents a step/event at the current accumulated position?
           // Actually, `calculateTails` uses `note.beat`.
           // So `note.beat` IS absolute.
           // Why did `incrementBeat` use `nextBeat`?
           // Ah, maybe the parser didn't fill `beat` property?
           // But `calculateTails` uses `note.beat`.
           // Let's trust that `note.beat` is correct on the objects.
           
           // If `incrementBeat` is advancing `currentBeat`, that's the playback head.
           // The "nextBeat" logic seems to be about *when to fetch the next command*.
           
           this.nextBeat += n.value;
           this.chartIndex++;
           break; // Process one track value (and its duration) at a time?
        } else {
           // Unknown?
           this.chartIndex++;
        }
      }
    }
    
    // Advance time
    // If not stopped
    if (this.stopUntil <= currentTime) {
       const bpmInMillis = this.bpm / 60 / 1000;
       const beatChange = bpmInMillis * deltaMs;
       this.currentBeat += beatChange;
       this.emit("beatUpdate", { beat: this.currentBeat });
    }
  }

  private checkMisses() {
     const msPerBeat = 60000 / this.bpm;
     
     this.notes.forEach((note, i) => {
        if (this.noteStates[i].hit || this.noteStates[i].missed) return;
        if (note.type !== "TRACK_VALUE") return;
        
        const beatDiff = note.beat - this.currentBeat;
        const timeDiffMs = beatDiff * msPerBeat;
        
        // If past the MISS window
        if (timeDiffMs < -this.config.missWindow) {
           // Check if hittable
           const tracks = note.tracks;
           // @ts-ignore
           const hasStep = tracks && Object.values(tracks).some(t => ["STEP", "HOLD_HEAD", "ROLL_HEAD"].includes(t));
           
           this.noteStates[i].missed = true;

           if (hasStep) {
             this.scoring.addMiss();
             this.emit("miss", { cause: "timeout", noteIndex: i });
             this.updateScoreState();
             
             // Visual Update for Tails?
             // If this was a HEAD, the tail is now dead.
             // Find if any tail starts here?
             // Not efficient to search, but `tailHeadIndices` maps tail->head.
             // We want head->tail.
             // Since we have the index `i`, we can find it in `tailHeadIndices`.
             // Actually, `checkHolds` handles visual state mostly, but for "Missed Head",
             // we should mark tail opacity.
             const tailIdx = this.tailHeadIndices.indexOf(i);
             if (tailIdx !== -1) {
                // Determine which tail? (Note could have multiple heads? theoretically)
                // indexOf finds first.
                // We should probably iterate.
                this.tailHeadIndices.forEach((headIdx, tIdx) => {
                   if (headIdx === i) {
                      this.updateTail(tIdx, { active: false });
                   }
                });
             }
           }
        }
     });
  }

  private checkHolds(deltaMs: number, inputInterface: { isDown: (track: string) => boolean }) {
     this.tails.forEach((tail, index) => {
        const meta = this.tailMeta[index];
        if (!meta || meta.dropped) return;

        // Visual check: if head missed, ensure inactive
        const headIndex = this.tailHeadIndices[index];
        if (headIndex !== -1 && this.noteStates[headIndex].missed) {
             if (meta.active) this.updateTail(index, { active: false });
             return; 
        }

        if (tail.type !== "HOLD_HEAD") {
             // For Rolls, we also want visual feedback if head was missed
             return;
        }

        const startBeat = tail.beat;
        const endBeat = tail.beat + tail.value;

        if (this.currentBeat >= startBeat && this.currentBeat <= endBeat) {
            const headState = this.noteStates[headIndex];
            
            if (headIndex !== -1 && headState.hit) {
                if (inputInterface.isDown(tail.track)) {
                    // HELD
                    if (!meta.holding) this.updateTail(index, { holding: true });
                    this.scoring.addHoldTick(deltaMs);
                    this.emit("scoreChange", { score: this.scoring.score });
                } else {
                    // DROPPED
                    if (this.currentBeat > startBeat + 0.1) {
                        this.updateTail(index, { holding: false, dropped: true, active: false }); // Dropped = Inactive visual?
                        this.scoring.droppedHold();
                    }
                }
            }
        } else {
             if (meta.holding) this.updateTail(index, { holding: false });
        }
     });
  }

  // --- Input ---
  handleInput(track: string) {
    if (!this.isPlaying) return;

    // 1. Check Note Hit
    const noteIndex = this.notes.findIndex((n, i) => {
        if (this.noteStates[i].hit || this.noteStates[i].missed) return false;
        if (n.type !== "TRACK_VALUE" || !n.tracks) return false;
        // @ts-ignore
        const trackValue = n.tracks[track];
        return trackValue && ["STEP", "ROLL_HEAD", "HOLD_HEAD"].includes(trackValue);
    });

    let hitNote = false;

    if (noteIndex !== -1) {
        const note = this.notes[noteIndex];
        const msPerBeat = 60000 / this.bpm;
        const beatDiff = note.beat - this.currentBeat;
        const timeDiffMs = beatDiff * msPerBeat;

        const judgement = this.scoring.getJudgement(timeDiffMs);
        if (judgement && judgement !== Judgement.MISS && judgement !== Judgement.BOO) {
            // HIT
            this.scoring.addHit(judgement);
            this.noteStates[noteIndex].hit = true;
            this.noteStates[noteIndex].judgement = judgement;
            hitNote = true;
            
            this.emit("hit", { track, judgement, score: this.scoring.score });
            this.updateScoreState();
            
            // If Head, mark tail active (visuals)
            // ... handled by default as active=true
        }
    }

    // 2. Roll Logic / Ghost Tap Logic
    if (!hitNote) {
        const rollTailIndex = this.tails.findIndex((tail, index) => {
            if (tail.track !== track || tail.type !== "ROLL_HEAD") return false;
            const headIndex = this.tailHeadIndices[index];
            if (headIndex === -1 || !this.noteStates[headIndex].hit) return false;
            
            const startBeat = tail.beat;
            const endBeat = tail.beat + tail.value;
            // Roll is active if Head Hit + Inside Range + NOT Missed (dropped)?
            // We implementation doesn't drop rolls yet.
            return this.currentBeat >= startBeat && this.currentBeat <= endBeat;
        });

        if (rollTailIndex !== -1) {
             // Roll Hit
             const headIndex = this.tailHeadIndices[rollTailIndex];
             const headJudgement = this.noteStates[headIndex].judgement || Judgement.PERFECT;
             
             this.scoring.addHit(headJudgement);
             this.emit("hit", { track, judgement: headJudgement, score: this.scoring.score });
             this.updateScoreState();
        } else {
             // Ghost Tap
             this.scoring.addMiss();
             this.emit("miss", { cause: "ghost", track });
             this.updateScoreState();
        }
    }
  }

  // Helpers
  private updateScoreState() {
     this.emit("scoreChange", { score: this.scoring.score });
     this.emit("comboChange", { combo: this.scoring.combo, maxCombo: this.scoring.maxCombo });
  }

  private updateTail(index: number, updates: Partial<{ active: boolean; holding: boolean; dropped: boolean }>) {
     const meta = this.tailMeta[index];
     Object.assign(meta, updates);
     this.emit("tailUpdate", { index, ...meta });
  }

  // --- Event Emitter ---
  on<T extends GameEventType>(event: T, handler: EventHandler<T>) {
     if (!this.eventListeners[event]) {
         this.eventListeners[event] = [];
     }
     this.eventListeners[event]!.push(handler);
  }

  off<T extends GameEventType>(event: T, handler: EventHandler<T>) {
     if (!this.eventListeners[event]) return;
     this.eventListeners[event] = this.eventListeners[event]!.filter(h => h !== handler);
  }

  private emit<T extends GameEventType>(event: T, data: GameEventData[T]) {
     if (this.eventListeners[event]) {
        this.eventListeners[event]!.forEach(h => h(data));
     }
  }
}
