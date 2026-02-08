<template>
  <div>
    <div class="w-full h-full relative">
      <img
        class="absolute w-full h-full top-0 left-0 right-0 bottom-0 object-cover"
        alt="background art"
        v-if="chart.backgroundUrl"
        :src="chart.backgroundUrl"
      />

      <!-- Preload Icons -->
      <img ref="left" class="hidden" alt="left arrow" src="~/assets/themes/default/left.svg" loading="eager" />
      <img ref="down" class="hidden" alt="down arrow" src="~/assets/themes/default/down.svg" loading="eager" />
      <img ref="up" class="hidden" alt="up arrow" src="~/assets/themes/default/up.svg" loading="eager" />
      <img ref="right" class="hidden" alt="right arrow" src="~/assets/themes/default/right.svg" loading="eager" />
      <img ref="hold" class="hidden" alt="hold arrow" src="~/assets/themes/default/hold.svg" loading="eager" />
      <img ref="roll" class="hidden" alt="roll arrow" src="~/assets/themes/default/roll.svg" loading="eager" />

      <canvas class="track-canvas" ref="canvas" :width="canvasWidth" :height="canvasHeight"></canvas>
      
      <audio
        ref="gameAudio"
        :src="chart.songUrl"
        @canplaythrough="audioReady = true"
        @play="game.start()"
        preload="auto"
      ></audio>

      <div class="w-full h-full relative p-10 font-extrabold text-2xl text-white">
        <button
          v-show="!game.isPlaying"
          class="rounded border-solid border-2 border-white px-5"
          @click="startGame"
        >
          Start
        </button>
        <h1 v-show="game.isPlaying">Score: {{ score }} | Combo: {{ combo }} | {{ lastJudgement }}</h1>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, reactive } from 'vue';
import { drawTails, drawArrows } from "~/game/drawing";
import type { Chart } from "~/models/charts";
import { InputHandler } from "~/game/input";
import { RhythmGame } from "~/game/engine";
import { Judgement } from "~/game/scoring";

const props = defineProps<{
  chart: Chart;
  difficulty: number;
}>();

// Canvas & Rendering State
const canvasWidth = ref(1920);
const canvasHeight = ref(1000);
const canvasContext = ref<CanvasRenderingContext2D | null>(null);
const animationRequest = ref<number | null>(null);
const lastFrameTime = ref(0);
const scrollSpeed = ref(150);

// Audio
const audioReady = ref(false);
const gameAudio = ref<HTMLAudioElement | null>(null);

// Game Engine
const game = reactive(new RhythmGame());
const inputHandler = ref(new InputHandler());

// Reactive UI State (Synced via events)
const score = ref(0);
const combo = ref(0);
const lastJudgement = ref<string | null>(null);

// Template Refs
const left = ref<HTMLImageElement | null>(null);
const down = ref<HTMLImageElement | null>(null);
const up = ref<HTMLImageElement | null>(null);
const right = ref<HTMLImageElement | null>(null);
const hold = ref<HTMLImageElement | null>(null);
const roll = ref<HTMLImageElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);

const icons = computed(() => ({
  up: up.value as HTMLImageElement,
  down: down.value as HTMLImageElement,
  left: left.value as HTMLImageElement,
  right: right.value as HTMLImageElement,
  hold: hold.value as HTMLImageElement,
  roll: roll.value as HTMLImageElement,
}));

// --- Initialization ---

function loadGame() {
  game.loadChart(props.chart, props.difficulty);
  // Reset local UI state
  score.value = 0;
  combo.value = 0;
  lastJudgement.value = null;
}

// --- Event Listeners ---
// These keep the Vue reactive state in sync with the Game Engine
game.on("hit", (data) => {
  lastJudgement.value = data.judgement;
});

game.on("miss", (data) => {
  lastJudgement.value = Judgement.MISS;
});

game.on("scoreChange", (data) => {
  score.value = Math.floor(data.score);
});

game.on("comboChange", (data) => {
  combo.value = data.combo;
});

game.on("finished", () => {
    // Handle level completion
    console.log("Level Finished");
});

game.on("stop", (data) => {
    // Could show a UI indicator for STOP
});

// --- Game Loop ---

function startGame() {
    if (gameAudio.value) {
        gameAudio.value.currentTime = 0;
        gameAudio.value.play();
    }
}

function mainRenderLoop(time: number) {
  animationRequest.value = requestAnimationFrame(mainRenderLoop);
  
  if (!lastFrameTime.value) lastFrameTime.value = time;
  const delta = time - lastFrameTime.value;
  lastFrameTime.value = time;

  // Clear
  clearCanvas();
  if (!canvasContext.value) return;

  canvasContext.value.scale(window.devicePixelRatio, window.devicePixelRatio);
  drawUI();

  if (game.isPlaying) {
      // Input Interface for Holds (passed to engine updates)
      const inputInterface = {
          isDown: (track: string) => inputHandler.value.isDown(track)
      };

      // Update Engine
      game.update(delta, time, inputInterface);

      // Draw active elements
      canvasContext.value.globalAlpha = 1;
      
      // We only draw notes that haven't been fully processed (hit/missed)
      // Actually, engine noteStates tracks this.
      const activeNotes = game.notes.filter((n, i) => !game.noteStates[i].hit && !game.noteStates[i].missed);
      
      drawTails(
        canvasContext.value,
        icons.value,
        game.tails,
        game.tailMeta,
        scrollSpeed.value,
        game.currentBeat
      );

      drawArrows(
        canvasContext.value,
        icons.value,
        activeNotes,
        scrollSpeed.value,
        game.currentBeat
      );
  }

  canvasContext.value.scale(1 / window.devicePixelRatio, 1 / window.devicePixelRatio);
}

// --- Helpers ---

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

function handleInput(action: string) {
    game.handleInput(action);
}

// --- Watchers ---

watch(() => props.chart, () => {
  loadGame();
  if (gameAudio.value) {
      gameAudio.value.pause();
      gameAudio.value.currentTime = 0;
  }
}, { immediate: true });

watch(() => props.difficulty, () => {
  loadGame();
  if (gameAudio.value) {
      gameAudio.value.pause();
      gameAudio.value.currentTime = 0;
  }
});

// --- Lifecycle ---

onMounted(() => {
  animationRequest.value = requestAnimationFrame(mainRenderLoop);
  
  inputHandler.value.start(
    (action) => {
      // On Press
      switch(action) {
        case "left": left.value?.setAttribute("style", "filter: brightness(0.5)"); handleInput("left"); break;
        case "down": down.value?.setAttribute("style", "filter: brightness(0.5)"); handleInput("down"); break;
        case "up": up.value?.setAttribute("style", "filter: brightness(0.5)"); handleInput("up"); break;
        case "right": right.value?.setAttribute("style", "filter: brightness(0.5)"); handleInput("right"); break;
      }
    },
    (action) => {
      // On Release
      switch(action) {
        case "left": left.value?.setAttribute("style", "filter: none"); break;
        case "down": down.value?.setAttribute("style", "filter: none"); break;
        case "up": up.value?.setAttribute("style", "filter: none"); break;
        case "right": right.value?.setAttribute("style", "filter: none"); break;
      }
    }
  );
});

onBeforeUnmount(() => {
  if (animationRequest.value) {
    cancelAnimationFrame(animationRequest.value);
  }
  inputHandler.value.stop();
  game.stop();
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
