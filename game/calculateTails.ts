import type { Note } from "@/models/charts";

export default function calculateTails(notes: Note[]) {
  const ts = [];

  for (const index in notes) {
    const note = notes[index];
    if (note.type === "TRACK_VALUE") {
      const tracks = note.tracks!;
      if (tracks.left === "HOLD_HEAD" || tracks.left === "ROLL_HEAD") {
        ts.push({
          type: tracks.left,
          track: "left",
          beat: note.beat,
          value: findTailEnd(notes, "left", index),
        });
      }
      if (tracks.down === "HOLD_HEAD" || tracks.down === "ROLL_HEAD") {
        ts.push({
          type: tracks.down,
          track: "down",
          beat: note.beat,
          value: findTailEnd(notes, "down", index),
        });
      }
      if (tracks.up === "HOLD_HEAD" || tracks.up === "ROLL_HEAD") {
        ts.push({
          type: tracks.up,
          track: "up",
          beat: note.beat,
          value: findTailEnd(notes, "up", index),
        });
      }
      if (tracks.right === "HOLD_HEAD" || tracks.right === "ROLL_HEAD") {
        ts.push({
          type: tracks.right,
          track: "right",
          beat: note.beat,
          value: findTailEnd(notes, "right", index),
        });
      }
    }
  }

  return ts;
}

function findTailEnd(
  notes: Note[],
  track: "up" | "down" | "left" | "right",
  start: string
): number {
  let value = 0;
  let index = parseInt(start);

  while (true) {
    const note = notes[index++];

    if (note === undefined) {
      console.error("Found unterminated tail");
      break;
    }

    if (note.type === "TRACK_VALUE") {
      if (!["ROLL_TAIL_END", "HOLD_TAIL_END"].includes(note.tracks![track])) {
        value += note.value;
      } else {
        break;
      }
    }
  }

  return value;
}
