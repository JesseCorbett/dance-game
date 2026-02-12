<template>
  <div class="w-full h-full overflow-hidden select-none">
    <!-- Background Art -->
    <div class="absolute inset-0 z-0">
      <img
        class="w-full h-full object-cover opacity-60 blur-sm"
        alt="background art"
        v-if="chart.backgroundUrl"
        :src="chart.backgroundUrl"
      />
      <div class="absolute inset-0 bg-gomi-dark/60"></div>
    </div>

    <!-- Preload Icons -->
    <div class="hidden">
      <img ref="left" alt="left arrow" src="~/assets/themes/default/left.svg" loading="eager" />
      <img ref="down" alt="down arrow" src="~/assets/themes/default/down.svg" loading="eager" />
      <img ref="up" alt="up arrow" src="~/assets/themes/default/up.svg" loading="eager" />
      <img ref="right" alt="right arrow" src="~/assets/themes/default/right.svg" loading="eager" />
      <img ref="hold" alt="hold arrow" src="~/assets/themes/default/hold.svg" loading="eager" />
      <img ref="roll" alt="roll arrow" src="~/assets/themes/default/roll.svg" loading="eager" />
    </div>

    <!-- Game Canvas -->
    <canvas class="track-canvas relative z-10" ref="canvas" :width="canvasWidth" :height="canvasHeight"></canvas>
    
    <audio
      ref="gameAudio"
      :src="chart.songUrl"
      @canplaythrough="audioReady = true"
      @play="game.start()"
      @ended="finishLevel"
      preload="auto"
    ></audio>

    <!-- HUD Overlay -->
    <div class="absolute inset-0 z-20 pointer-events-none p-8 flex flex-col justify-between">


      <div class="flex justify-between items-start">
        <div class="flex flex-col">
          <h2 class="text-gomi-primary text-xl font-bold uppercase tracking-wider opacity-80 drop-shadow-md">{{ chart.title }}</h2>
          <span class="text-gomi-accent/80 text-sm font-semibold">{{ difficultyLabel }}</span>
        </div>
        
        <div class="flex flex-col items-end">
           <div class="text-6xl font-rubik text-gomi-primary drop-shadow-[0_0_10px_rgba(224,214,255,0.8)]">
             {{ Math.floor(score).toLocaleString() }}
           </div>
           <div class="text-sm text-gomi-primary/70 font-bold tracking-widest uppercase">Score</div>
        </div>
      </div>

      <!-- Center: Judgement & Combo -->
      <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
        <transition name="pop">
          <div v-if="lastJudgement" :key="lastJudgementId" class="mb-2">
            <span 
              class="text-4xl md:text-5xl font-black italic tracking-tighter drop-shadow-[0_0_15px_rgba(255,107,107,0.6)]"
              :class="judgementColor(lastJudgement)"
            >
              {{ lastJudgement }}
            </span>
          </div>
        </transition>

        <transition name="fade">
          <div v-if="combo > 4" class="text-center">
            <div class="text-6xl md:text-7xl font-rubik text-gomi-primary animate-pulse-fast drop-shadow-[0_0_15px_rgba(224,214,255,0.5)]">
              {{ combo }}
            </div>
            <div class="text-gomi-accent text-sm font-bold uppercase tracking-[0.2em]">Combo</div>
          </div>
        </transition>
      </div>

      <!-- Start Button (Pre-game) -->
      <div v-if="!game.isPlaying && !isFinished" class="absolute inset-0 flex items-center justify-center pointer-events-auto bg-black/40 backdrop-blur-sm z-30">
        <button
          class="group relative px-8 py-4 bg-gomi-dark border-2 border-gomi-primary/50 rounded-full overflow-hidden transition-all hover:scale-110 hover:border-gomi-accent hover:shadow-[0_0_30px_rgba(255,107,107,0.4)]"
          @click="startGame"
        >
          <div class="absolute inset-0 bg-gomi-accent/10 group-hover:bg-gomi-accent/20 transition-colors"></div>
          <span class="relative text-3xl font-rubik text-gomi-primary group-hover:text-white transition-colors">Start Game</span>
        </button>
      </div>
    </div>

    <!-- Pause Overlay -->
    <transition name="fade">
      <div v-if="isPaused" class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gomi-dark/90 backdrop-blur-md">
         <div class="text-center">
            <h2 class="text-6xl font-rubik text-gomi-primary mb-8 tracking-widest uppercase drop-shadow-[0_0_20px_rgba(224,214,255,0.5)]">Paused</h2>
            
            <div class="flex flex-col gap-4 w-64">
               <button 
                @click="startResumeCountdown"
                class="px-8 py-4 rounded-xl bg-gomi-primary text-gomi-dark font-bold text-xl hover:scale-105 transition-transform"
               >
                 Resume
               </button>
               <button 
                @click="retry"
                class="px-8 py-4 rounded-xl bg-gomi-primary/10 border border-gomi-primary/50 text-gomi-primary font-bold text-xl hover:bg-gomi-primary hover:text-gomi-dark transition-all"
               >
                 Restart
               </button>
               <button 
                @click="quit"
                class="px-8 py-4 rounded-xl bg-red-500/10 border border-red-500/50 text-red-400 font-bold text-xl hover:bg-red-500 hover:text-white transition-all"
               >
                 Quit
               </button>
            </div>
         </div>
      </div>
    </transition>

    <!-- Countdown Overlay -->
    <transition name="pop">
       <div v-if="showCountdown" class="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm pointer-events-none">
          <div class="text-9xl font-black italic text-gomi-accent drop-shadow-[0_0_30px_rgba(255,107,107,0.8)] animate-pulse">
             {{ countdownValue }}
          </div>
       </div>
    </transition>

    <!-- End Screen Overlay -->
    <transition name="fade">
      <div v-if="isFinished" class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gomi-dark/90 backdrop-blur-md">
        <div class="max-w-2xl w-full p-8 rounded-3xl border-4 border-dashed border-gomi-primary/30 bg-black/40 text-center relative overflow-hidden">
           <!-- Spider Decorations -->
           <div class="absolute -top-10 -right-10 text-9xl opacity-10 text-gomi-accent rotate-12">🕷️</div>
           
           <h2 class="text-6xl font-rubik text-gomi-accent mb-2 drop-shadow-[0_0_20px_rgba(255,107,107,0.5)]">Stage Clear!</h2>
           <div class="w-24 h-1 bg-gomi-primary/50 mx-auto rounded-full mb-8"></div>

           <div class="grid grid-cols-2 gap-8 mb-10 text-left px-10">
             <div>
                <p class="text-gomi-primary/60 text-sm uppercase font-bold tracking-widest">Score</p>
                <p class="text-5xl font-mono text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">{{ Math.floor(score).toLocaleString() }}</p>
             </div>
             <div class="text-right">
                <p class="text-gomi-primary/60 text-sm uppercase font-bold tracking-widest">Max Combo</p>
                 <p class="text-5xl font-mono text-gomi-primary">{{ maxCombo }}</p>
             </div>
           </div>

           <div class="flex gap-4 justify-center">
             <button 
               @click="retry"
               class="px-8 py-3 rounded-xl bg-gomi-primary/10 border border-gomi-primary/50 text-gomi-primary font-bold hover:bg-gomi-primary hover:text-gomi-dark transition-all text-lg"
             >
               Retry
             </button>
             <button 
               @click="$emit('back')"
               class="px-8 py-3 rounded-xl bg-gomi-accent/10 border border-gomi-accent/50 text-gomi-accent font-bold hover:bg-gomi-accent hover:text-white transition-all text-lg"
             >
               Song Select
             </button>
           </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, reactive, nextTick } from 'vue';
import { drawTails, drawArrows } from "~/game/drawing";
import type { Chart } from "~/models/charts";
import { InputHandler } from "~/game/input";
import { RhythmGame } from "~/game/engine";
import { Judgement } from "~/game/scoring";

const props = defineProps<{
chart: Chart;
difficulty: number;
}>();

const emit = defineEmits(['back']);

// UI State
const isFinished = ref(false);
const isPaused = ref(false);
const showCountdown = ref(false);
const countdownValue = ref(3);

const maxCombo = ref(0);
const lastJudgement = ref<string | null>(null);
const lastJudgementId = ref(0); // For triggering animations
const difficultyLabel = computed(() => {
return props.chart.difficulties[props.difficulty]?.label || `Difficulty ${props.difficulty + 1}`;
});

// Canvas & Rendering State
const canvasWidth = ref(1920);
const canvasHeight = ref(1000);
const canvasContext = ref<CanvasRenderingContext2D | null>(null);
const animationRequest = ref<number | null>(null);
const lastFrameTime = ref(0);
const scrollSpeed = ref(150);

// Time Management
const pauseOffset = ref(0);
const lastPauseTime = ref(0);

// Audio
const audioReady = ref(false);
const gameAudio = ref<HTMLAudioElement | null>(null);

// Game Engine
const game = reactive(new RhythmGame());
const inputHandler = ref(new InputHandler());

// Reactive UI State (Synced via events)
const score = ref(0);
const combo = ref(0);

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
maxCombo.value = 0;
lastJudgement.value = null;
isFinished.value = false;
isPaused.value = false;
showCountdown.value = false;
pauseOffset.value = 0;
lastPauseTime.value = 0;
}

function retry() {
loadGame();
startGame();
}

function quit() {
emit('back');
}

function judgementColor(judgement: string) {
switch(judgement) {
  case Judgement.MARVELOUS: return 'text-cyan-300 drop-shadow-[0_0_10px_cyan]';
  case Judgement.PERFECT: return 'text-yellow-300 drop-shadow-[0_0_10px_yellow]';
  case Judgement.GREAT: return 'text-green-400';
  case Judgement.GOOD: return 'text-blue-400';
  case Judgement.BOO: return 'text-purple-400';
  case Judgement.MISS: return 'text-red-500';
  default: return 'text-white';
}
}

// --- Pause Logic ---

function togglePause() {
  if (isFinished.value || !game.isPlaying) return;

  if (isPaused.value) {
     // Already paused? usually we want specific 'Resume' button, 
     // but 'Escape' can toggle.
     // If we are in countdown, ignore?
     if (showCountdown.value) return;
     startResumeCountdown();
  } else {
     // Pause
     isPaused.value = true;
     lastPauseTime.value = performance.now();
     if (gameAudio.value) gameAudio.value.pause();
     inputHandler.value.stop(); // Stop handling game input
  }
}

function startResumeCountdown() {
  isPaused.value = false; // Close pause menu
  showCountdown.value = true;
  countdownValue.value = 3;
  
  const timer = setInterval(() => {
     countdownValue.value--;
     if (countdownValue.value <= 0) {
        clearInterval(timer);
        resumeGame();
     }
  }, 500); // 500ms intervals for faster feel
}

function resumeGame() {
  showCountdown.value = false;
  
  // Calculate duration we were paused/counting down
  const now = performance.now();
  const duration = now - lastPauseTime.value;
  pauseOffset.value += duration;
  
  // Reset frame time so we don't have a huge delta
  lastFrameTime.value = now;
  
  if (gameAudio.value) gameAudio.value.play();
  
  // Restart input
  startInputHandler();
}

// --- Event Listeners ---
game.on("hit", (data) => {
lastJudgement.value = data.judgement;
lastJudgementId.value++;
});

game.on("miss", (data) => {
lastJudgement.value = Judgement.MISS;
lastJudgementId.value++;
});

game.on("scoreChange", (data) => {
score.value = Math.floor(data.score);
});

game.on("comboChange", (data) => {
combo.value = data.combo;
if (combo.value > maxCombo.value) {
    maxCombo.value = combo.value;
}
});

function finishLevel() {
  console.log("Level Finished");
  isFinished.value = true;
  game.stop();
  inputHandler.value.stop();
}

game.on("finished", () => {
    finishLevel();
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

// Clear & Draw Static UI
clearCanvas();
if (!canvasContext.value) return;
canvasContext.value.scale(window.devicePixelRatio, window.devicePixelRatio);
drawUI();

// If Paused, we might draw specific things? No, Vue handles overlay.
// If Countdown, we draw game state FROZEN or Active? 
// Frozen during countdown.
const isOperating = game.isPlaying && !isFinished.value && !isPaused.value && !showCountdown.value;

if (isOperating) {
    // Adjusted Time
    const adjustedTime = time - pauseOffset.value;

    const inputInterface = {
        isDown: (track: string) => inputHandler.value.isDown(track)
    };

    game.update(delta, adjustedTime, inputInterface);

    // Draw active elements
    canvasContext.value.globalAlpha = 1;
    
    // We only draw notes that haven't been fully processed (hit/missed)
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
// If Paused or Countdown, we should execute one draw call with latest state to keep it visible?
// Actually the previous draw remains on canvas if we don't clear.
// But we DO clear every frame (clearCanvas).
// So we must redraw even if paused using LAST state.
else if (game.isPlaying && !isFinished.value) {
     // Redraw Static State
    canvasContext.value.globalAlpha = 1;

    // Use internal state without updating
    // Note: drawTails/Arrows rely on passed beat/notes. 
    // We can pass `game.currentBeat`.

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
canvasContext.value.globalAlpha = 0.8; // Slightly more opacity
canvasContext.value.drawImage(icons.value.left, 50, 50, 100, 100);
canvasContext.value.drawImage(icons.value.down, 200, 50, 100, 100);
canvasContext.value.drawImage(icons.value.up, 350, 50, 100, 100);
canvasContext.value.drawImage(icons.value.right, 500, 50, 100, 100);
}

function handleInput(action: string) {
  if (game.isPlaying && !isFinished.value && !isPaused.value && !showCountdown.value) {
      game.handleInput(action);
  }
}

function startInputHandler() {
    inputHandler.value.start(
      (action) => {
        switch(action) {
          case "left": left.value?.setAttribute("style", "filter: brightness(0.5)"); handleInput("left"); break;
          case "down": down.value?.setAttribute("style", "filter: brightness(0.5)"); handleInput("down"); break;
          case "up": up.value?.setAttribute("style", "filter: brightness(0.5)"); handleInput("up"); break;
          case "right": right.value?.setAttribute("style", "filter: brightness(0.5)"); handleInput("right"); break;
        }
      },
      (action) => {
        switch(action) {
          case "left": left.value?.setAttribute("style", "filter: none"); break;
          case "down": down.value?.setAttribute("style", "filter: none"); break;
          case "up": up.value?.setAttribute("style", "filter: none"); break;
          case "right": right.value?.setAttribute("style", "filter: none"); break;
        }
      }
    );
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
startInputHandler();

// Bind Global Keys
window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
        togglePause();
    }
});
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
left: 50%;
transform: translateX(-50%);
width: 650px; /* Reduced width for tighter gameplay feel */
height: 100%;
/* Optional: subtle track background */
background: linear-gradient(to right, 
    transparent 0%, 
    rgba(26, 16, 37, 0.4) 15%, 
    rgba(26, 16, 37, 0.4) 85%, 
    transparent 100%
);
border-left: 1px solid rgba(224, 214, 255, 0.1);
border-right: 1px solid rgba(224, 214, 255, 0.1);
}

/* Animations */
.pop-enter-active {
  animation: pop-in 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.pop-leave-active {
  transition: all 0.1s ease-in;
}
.pop-leave-to {
  opacity: 0;
  transform: scale(1.5);
}

@keyframes pop-in {
  0% { transform: scale(0.5) translateY(20px); opacity: 0; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}

.fade-enter-active, .fade-leave-active {
transition: opacity 0.5s ease;
}
.fade-enter-from, .fade-leave-to {
opacity: 0;
}

.animate-pulse-fast {
animation: pulse-fast 0.5s ease-in-out infinite alternate;
}

@keyframes pulse-fast {
0% { transform: scale(1); }
100% { transform: scale(1.05); }
}
</style>
