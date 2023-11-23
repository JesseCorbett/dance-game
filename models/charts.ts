export interface Chart {
  title: string;
  subtitle?: string;
  genre?: string;
  author: string;
  artist: string;
  songUrl: string;
  backgroundUrl?: string;
  bannerUrl?: string;
  lyricsUrl?: string;
  cdCoverUrl?: string;
  sampleStartMs: number;
  sampleEndMs: number;
  sampleLevel?: string;
  selectable: boolean;
  difficulties: ChartLevel[];
}

export interface ChartLevel {
  label: string;
  difficultyMeter: number;
  notes: Note[];
}

export interface Note {
  type: NoteType;
  value: number;
  beat: number;
  tracks?: {
    left: TrackPosition;
    down: TrackPosition;
    up: TrackPosition;
    right: TrackPosition;
  };
}

export enum NoteType {
  setBPM = "SET_BPM",
  offset = "OFFSET",
  trackValue = "TRACK_VALUE",
  stop = "STOP",
}

export enum TrackPosition {
  empty = "NONE",
  step = "STEP",
  hold = "HOLD",
  roll = "ROLL",
  holdHead = "HOLD_HEAD",
  holdTail = "HOLD_TAIL",
  holdTailEnd = "HOLD_TAIL_END",
  rollHead = "ROLL_HEAD",
  rollTail = "ROLL_TAIL",
  rollTailEnd = "ROLL_TAIL_END",
  mine = "MINE",
  // TODO: Keysounds? Lift notes? Fake notes? https://github.com/stepmania/stepmania/wiki/sm#note-values
}
