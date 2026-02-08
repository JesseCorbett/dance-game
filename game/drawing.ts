import type { Note } from "@/models/charts";

interface Icons {
  up: CanvasImageSource;
  down: CanvasImageSource;
  left: CanvasImageSource;
  right: CanvasImageSource;
  hold: CanvasImageSource;
  roll: CanvasImageSource;
}

export function drawTails(
  context: CanvasRenderingContext2D,
  icons: Icons,
  tails: {
    type: string;
    track: string;
    beat: number;
    value: number;
  }[],
  tailMeta: { active: boolean }[],
  scrollSpeed: number,
  currentBeat: number
) {
  tails.forEach((tail, index) => {
    const meta = tailMeta[index];
    const offset = tail.beat * scrollSpeed;
    const withTime = offset - currentBeat * scrollSpeed;
    const y = 50 + withTime;
    const height = tail.value * scrollSpeed;

    let icon = icons.hold;
    if (tail.type === "ROLL_HEAD") {
      icon = icons.roll;
    }

    if (meta && !meta.active) {
       context.globalAlpha = 0.5;
    }

    switch (tail.track) {
      case "left":
        context.drawImage(icon, 50, y + 50, 100, height);
        break;
      case "down":
        context.drawImage(icon, 200, y + 60, 100, height);
        break;
      case "up":
        context.drawImage(icon, 350, y + 40, 100, height);
        break;
      case "right":
        context.drawImage(icon, 500, y + 50, 100, height);
        break;
    }
    context.globalAlpha = 1.0; // Reset
  });
}

export function drawArrows(
  context: CanvasRenderingContext2D,
  icons: Icons,
  notes: Note[],
  scrollSpeed: number,
  currentBeat: number
) {
  notes
    .filter((step) => step.type === "TRACK_VALUE")
    .forEach((step) => {
      const offset = step.beat * scrollSpeed;
      const withTime = offset - currentBeat * scrollSpeed;
      const y = 50 + withTime;

      drawMines(context, icons, step.tracks, y);
      drawSteps(context, icons, step.tracks, y);
    });
}

function drawMines(
  context: CanvasRenderingContext2D,
  icons: Icons,
  tracks: any,
  y: number
) {
  context.filter = "invert(100%)";
  if (tracks.left === "MINE") {
    context.drawImage(icons.left, 50, y, 100, 100);
  }

  if (tracks.down === "MINE") {
    context.drawImage(icons.down, 200, y, 100, 100);
  }

  if (tracks.up === "MINE") {
    context.drawImage(icons.up, 350, y, 100, 100);
  }

  if (tracks.right === "MINE") {
    context.drawImage(icons.right, 500, y, 100, 100);
  }
  context.filter = "none";
}

function drawSteps(
  context: CanvasRenderingContext2D,
  icons: Icons,
  tracks: any,
  y: number
) {
  if (isArrow(tracks.left)) {
    context.drawImage(icons.left, 50, y, 100, 100);
  }

  if (isArrow(tracks.down)) {
    context.drawImage(icons.down, 200, y, 100, 100);
  }

  if (isArrow(tracks.up)) {
    context.drawImage(icons.up, 350, y, 100, 100);
  }

  if (isArrow(tracks.right)) {
    context.drawImage(icons.right, 500, y, 100, 100);
  }
}

function isArrow(position: string): boolean {
  return [
    "STEP",
    "ROLL_HEAD",
    "HOLD_HEAD",
    "ROLL_TAIL_END",
    "HOLD_TAIL_END",
  ].includes(position);
}
