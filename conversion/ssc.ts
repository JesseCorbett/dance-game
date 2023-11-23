import type { Chart, ChartLevel, Note } from "@/models/charts";
import { NoteType, TrackPosition } from "@/models/charts";

export async function convertFromSSC(inputFile: File): Promise<Chart> {
  let rootPath: string | string[] = inputFile.webkitRelativePath.split("/");
  rootPath.pop();
  rootPath = rootPath.join("/") + "/";

  const commentRegex = /(\s*)\/\/(.*)/;
  let file = await inputFile.text();
  while (file.match(commentRegex) !== null) {
    file = file.replace(commentRegex, "");
  }

  const fields: string[] = file.split("#");
  const keyPairs = fields
    .map((field) => field.split(":"))
    .filter((pair) => pair.length == 2)
    .map((pair) => [pair[0], pair[1].split(";")[0]]);

  const levels: ChartLevel[] = parseLevels(keyPairs);

  const chart: Chart = {
    title: fieldValue(keyPairs, "TITLE")!,
    subtitle: fieldValue(keyPairs, "SUBTITLE"),
    genre: fieldValue(keyPairs, "GENRE"),
    author: fieldValue(keyPairs, "CREDIT") || "",
    artist: fieldValue(keyPairs, "ARTIST") || "",
    songUrl: urlIfy(rootPath, fieldValue(keyPairs, "MUSIC"))!,
    backgroundUrl: urlIfy(rootPath, fieldValue(keyPairs, "BACKGROUND")),
    bannerUrl: urlIfy(rootPath, fieldValue(keyPairs, "BANNER")),
    lyricsUrl: urlIfy(rootPath, fieldValue(keyPairs, "LYRICSPATH")),
    cdCoverUrl: urlIfy(rootPath, fieldValue(keyPairs, "CDIMAGE")),
    sampleStartMs: parseSampleStart(keyPairs),
    sampleEndMs: parseSampleEnd(keyPairs),
    sampleLevel: levels[0]?.label || "",
    selectable: fieldValue(keyPairs, "SELECTABLE") !== "NO",
    difficulties: levels,
  };

  return chart;
}

function fieldValue(
  keyPairs: string[][],
  field: string,
  index = 0
): string | undefined {
  const pair = keyPairs.filter((pair) => pair[0] === field)[index];

  if (!pair) {
    return undefined;
  }

  return pair[1] === "" ? undefined : pair[1];
}

function urlIfy(basePath: string, file?: string): string | undefined {
  if (file === undefined) {
    return undefined;
  }

  return basePath + file;
}

function parseSampleStart(keyPairs: string[][]): number {
  return parseFloat(fieldValue(keyPairs, "SAMPLESTART")!) * 1000;
}

function parseSampleEnd(keyPairs: string[][]): number {
  const start = parseSampleStart(keyPairs);
  const duration = parseFloat(fieldValue(keyPairs, "SAMPLELENGTH")!) * 1000;
  return start + duration;
}

function parseLevels(keyPairs: string[][]): ChartLevel[] {
  const count = keyPairs.filter((pairs) => pairs[0] === "NOTEDATA").length;

  const levels: ChartLevel[] = [];
  for (let i = 0; i < count; i++) {
    levels.push({
      label: fieldValue(keyPairs, "DIFFICULTY", i)!,
      difficultyMeter: parseInt(fieldValue(keyPairs, "METER", i)!),
      notes: parseNotes(
        fieldValue(keyPairs, "NOTES", i)!,
        fieldValue(keyPairs, "BPMS")!,
        fieldValue(keyPairs, "STOPS") || "",
        parseFloat(fieldValue(keyPairs, "OFFSET")!)
      ),
    });
  }

  return levels.sort((a, b) => a.difficultyMeter - b.difficultyMeter);
}

function parseNotes(
  notesData: string,
  bpms: string,
  stop: string,
  offset: number
): Note[] {
  const notes: Note[] = [];

  if (offset !== 0) {
    notes.push({ type: NoteType.offset, value: -offset, beat: 0 });
  }

  stop
    .split(",")
    .filter((stop) => stop.includes("="))
    .map((stops) => stops.trim().split("="))
    .forEach((stop) => {
      notes.push({
        type: NoteType.stop,
        value: parseFloat(stop[1]),
        beat: parseFloat(stop[0]),
      });
    });

  bpms
    .split(",")
    .filter((bpmChange) => bpmChange.includes("="))
    .map((bpmChange) => bpmChange.trim().split("="))
    .forEach((change) => {
      notes.push({
        type: NoteType.setBPM,
        value: parseFloat(change[1]),
        beat: parseFloat(change[0]),
      });
    });

  let currentBeat = 0.0;
  const lastStepPosition = {
    left: TrackPosition.empty,
    down: TrackPosition.empty,
    up: TrackPosition.empty,
    right: TrackPosition.empty,
  };
  notesData
    .split(",")
    .map((measure) => measure.trim())
    .forEach((measure) => {
      const measureNotes = measure.split("\n");
      const noteValue = 4 / measureNotes.length;
      measureNotes.forEach((note) => {
        const newNote: Note = {
          type: NoteType.trackValue,
          value: noteValue,
          beat: currentBeat,
          tracks: {
            left: calcTrackPosition(note[0], lastStepPosition.left),
            down: calcTrackPosition(note[1], lastStepPosition.down),
            up: calcTrackPosition(note[2], lastStepPosition.up),
            right: calcTrackPosition(note[3], lastStepPosition.right),
          },
        };
        notes.push(newNote);

        lastStepPosition.left = newNote.tracks!.left;
        lastStepPosition.down = newNote.tracks!.down;
        lastStepPosition.up = newNote.tracks!.up;
        lastStepPosition.right = newNote.tracks!.right;
        currentBeat += noteValue;
      });
    });

  return notes;
}

function calcTrackPosition(
  sscInput: string,
  previous: TrackPosition
): TrackPosition {
  if (sscInput === "0") {
    if (
      previous === TrackPosition.holdHead ||
      previous === TrackPosition.holdTail
    ) {
      return TrackPosition.holdTail;
    } else if (
      previous === TrackPosition.rollHead ||
      previous === TrackPosition.rollTail
    ) {
      return TrackPosition.rollTail;
    } else {
      return TrackPosition.empty;
    }
  }

  if (sscInput === "1") {
    return TrackPosition.step;
  }

  if (sscInput === "2") {
    return TrackPosition.holdHead;
  }

  if (
    sscInput === "3" &&
    (previous === TrackPosition.holdHead || previous === TrackPosition.holdTail)
  ) {
    return TrackPosition.holdTailEnd;
  }

  if (
    sscInput === "3" &&
    (previous === TrackPosition.rollHead || previous === TrackPosition.rollTail)
  ) {
    return TrackPosition.rollTailEnd;
  }

  if (sscInput === "4") {
    return TrackPosition.rollHead;
  }

  if (sscInput === "M") {
    return TrackPosition.mine;
  }

  throw new Error(
    'Encountered unknown SSC note type "' +
      sscInput +
      '" with previous input "' +
      previous +
      '"'
  );
}
