<template>
  <div>
    <div class="w-full h-full relative">
      <img
        class="absolute w-full h-full top-0 left-0 right-0 bottom-0 object-cover"
        alt="background art"
        v-if="chart.backgroundUrl"
        :src="chart.backgroundUrl"
      />

      <img
        ref="left"
        class="hidden"
        alt="left arrow"
        src="~/assets/themes/default/left.svg"
        loading="eager"
      />
      <img
        ref="down"
        class="hidden"
        alt="down arrow"
        src="~/assets/themes/default/down.svg"
        loading="eager"
      />
      <img
        ref="up"
        class="hidden"
        alt="up arrow"
        src="~/assets/themes/default/up.svg"
        loading="eager"
      />
      <img
        ref="right"
        class="hidden"
        alt="right arrow"
        src="~/assets/themes/default/right.svg"
        loading="eager"
      />

      <img
        ref="hold"
        class="hidden"
        alt="hold arrow"
        src="~/assets/themes/default/hold.svg"
        loading="eager"
      />
      <img
        ref="roll"
        class="hidden"
        alt="roll arrow"
        src="~/assets/themes/default/roll.svg"
        loading="eager"
      />

      <canvas
        class="track-canvas"
        ref="canvas"
        :width="canvasWidth"
        :height="canvasHeight"
      ></canvas>
      <audio
        ref="gameAudio"
        :src="chart.songUrl"
        @canplaythrough="audioReady = true"
        @play="playing = true"
        preload="auto"
      ></audio>

      <div
        class="w-full h-full relative p-10 font-extrabold text-2xl text-white"
      >
        <button
          v-show="!playing"
          class="rounded border-solid border-2 border-white px-5"
          @click="gameAudio?.play()"
        >
          Start
        </button>
        <h1 v-show="playing">Score: {{ score }}</h1>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import calculateTails from "~/game/calculateTails";
import { drawTails, drawArrows } from "~/game/drawing";
import type { Chart } from "~/models/charts";

const props = defineProps<{
  chart: Chart;
  difficulty: number;
}>();

const canvasWidth = ref(1920);
const canvasHeight = ref(1000);
const canvasContext = ref<CanvasRenderingContext2D | null>(null);
const animationRequest = ref<number | null>(null);
const audioReady = ref(false);

const playing = ref(false);
const bpm = ref(100);
const currentBeat = ref(0);
const nextBeat = ref(0);
const chartIndex = ref(0);
const lastFrameTime = ref(0);
const stopUntil = ref(0);

const tailMeta = ref<{ active: boolean; available: boolean }[]>([]);
const upLast = ref(false);
const downLast = ref(false);
const leftLast = ref(false);
const rightLast = ref(false);
const upStep = ref(false);
const downStep = ref(false);
const leftStep = ref(false);
const rightStep = ref(false);

const scrollSpeed = ref(150);
const marveleousRange = ref(1);
const excellentRange = ref(5);
const greatRange = ref(10);
const goodRange = ref(25);

const score = ref(0);
const combo = ref(0);

// Template refs
const left = ref<HTMLImageElement | null>(null);
const down = ref<HTMLImageElement | null>(null);
const up = ref<HTMLImageElement | null>(null);
const right = ref<HTMLImageElement | null>(null);
const hold = ref<HTMLImageElement | null>(null);
const roll = ref<HTMLImageElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const gameAudio = ref<HTMLAudioElement | null>(null);

const icons = computed(() => ({
  up: up.value as HTMLImageElement,
  down: down.value as HTMLImageElement,
  left: left.value as HTMLImageElement,
  right: right.value as HTMLImageElement,
  hold: hold.value as HTMLImageElement,
  roll: roll.value as HTMLImageElement,
}));

const notes = computed(() => {
  return props.chart.difficulties[props.difficulty].notes.sort(
    (a, b) => a.beat - b.beat
  );
});

const tails = computed(() => {
  return calculateTails(notes.value);
});

function mainRenderLoop(deltaMs: number) {
  animationRequest.value = requestAnimationFrame((time) => {
    const delta = time - lastFrameTime.value;
    lastFrameTime.value = time;
    mainRenderLoop(delta);
  });

  clearCanvas();
  if (!canvasContext.value) return;

  canvasContext.value.scale(
    window.devicePixelRatio,
    window.devicePixelRatio
  );
  drawUI();

  if (playing.value) {
    incrementBeat(deltaMs);
    canvasContext.value.globalAlpha = 1;
    checkInputs();
    drawTails(
      canvasContext.value,
      icons.value,
      tails.value,
      tailMeta.value,
      scrollSpeed.value,
      currentBeat.value
    );
    drawArrows(
      canvasContext.value,
      icons.value,
      notes.value,
      scrollSpeed.value,
      currentBeat.value
    );
  }
  canvasContext.value.scale(
    1 / window.devicePixelRatio,
    1 / window.devicePixelRatio
  );
}

function clearCanvas() {
  if (canvasContext.value === null && canvas.value) {
    canvasContext.value = canvas.value.getContext("2d");
  }
  if (canvas.value && canvasContext.value) {
      canvasWidth.value = canvas.value.clientWidth * window.devicePixelRatio;
      canvasHeight.value = canvas.value.clientHeight * window.devicePixelRatio;
      canvasContext.value.clearRect(0, 0, canvasWidth.value, canvasHeight.value);
  }
}

function drawUI() {
  if (!canvasContext.value) return;
  canvasContext.value.globalAlpha = 0.7;
  canvasContext.value.drawImage(icons.value.left, 50, 50, 100, 100);
  canvasContext.value.drawImage(icons.value.down, 200, 50, 100, 100);
  canvasContext.value.drawImage(icons.value.up, 350, 50, 100, 100);
  canvasContext.value.drawImage(icons.value.right, 500, 50, 100, 100);
}

function incrementBeat(deltaMs: number) {
  if (currentBeat.value >= nextBeat.value) {
    while (true) {
      const note = notes.value[chartIndex.value++];

      if (note === undefined) {
        console.info("End of song");
        completeLevel();
        break;
      }

      if (note.type === "OFFSET") {
        currentBeat.value = currentBeat.value + note.value;
        console.info("Adjusting offset");
        break;
      } else if (note.type === "SET_BPM") {
        bpm.value = note.value;
        console.info("Adjusting BPM");
      } else if (note.type === "STOP") {
        console.info("STOPing");
        stopUntil.value = lastFrameTime.value + note.value * 1000;
      } else if (note.type === "TRACK_VALUE") {
        nextBeat.value = nextBeat.value + note.value;
        break;
      }
    }
  }

  if (stopUntil.value <= lastFrameTime.value) {
    const bpmInMillis = bpm.value / 60 / 1000;
    const beatChange = bpmInMillis * deltaMs;
    currentBeat.value = currentBeat.value + beatChange;
  }
}

function checkInputs() {
  // Placeholder
}

function completeLevel() {
  playing.value = false;
  if (gameAudio.value) {
      gameAudio.value.pause();
      gameAudio.value.currentTime = 0;
  }
  bpm.value = 100;
  currentBeat.value = 0;
  nextBeat.value = 0;
  chartIndex.value = 0;
  score.value = 0;
}

watch(tails, () => {
  tailMeta.value = tails.value.map(() => ({
    active: true,
    available: true,
  }));
});

watch(() => props.chart, () => {
  completeLevel();
});

watch(() => props.difficulty, () => {
  completeLevel();
});

onMounted(() => {
  mainRenderLoop(0);
});

onBeforeUnmount(() => {
  if (animationRequest.value) {
    cancelAnimationFrame(animationRequest.value);
  }
});
</script>

<style scoped>
.track-canvas {
  position: absolute;
  top: 0;
  left: 150px;
  width: 800px;
  height: 100%;
}
</style>
