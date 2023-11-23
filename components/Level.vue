<template>
  <div>
    <div class="w-full h-full relative">
      <img
        class="absolute w-full h-full top-0 left-0 right-0 bottom-0 object-cover"
        v-if="chart.backgroundUrl"
        :src="chart.backgroundUrl"
      />

      <img
        ref="left"
        class="hidden"
        src="~/assets/themes/default/left.svg"
        loading="eager"
      />
      <img
        ref="down"
        class="hidden"
        src="~/assets/themes/default/down.svg"
        loading="eager"
      />
      <img
        ref="up"
        class="hidden"
        src="~/assets/themes/default/up.svg"
        loading="eager"
      />
      <img
        ref="right"
        class="hidden"
        src="~/assets/themes/default/right.svg"
        loading="eager"
      />

      <img
        ref="hold"
        class="hidden"
        src="~/assets/themes/default/hold.svg"
        loading="eager"
      />
      <img
        ref="roll"
        class="hidden"
        src="~/assets/themes/default/roll.svg"
        mloading="eager"
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
          @click="($refs.gameAudio as HTMLAudioElement).play()"
        >
          Start
        </button>
        <h1 v-show="playing">Score: {{ score }}</h1>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import type { AudioHTMLAttributes } from "vue";
import calculateTails from "~/game/calculateTails";
import { drawTails, drawArrows } from "~/game/drawing";
import type { Chart } from "~/models/charts";

export default {
  props: {
    chart: {
      type: Object,
      required: true,
    },
    difficulty: {
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      canvasWidth: 1920,
      canvasHeight: 1000,
      canvasContext: null as CanvasRenderingContext2D | null,
      animationRequest: null as number | null,
      audioReady: false,

      playing: false,
      bpm: 100,
      currentBeat: 0,
      nextBeat: 0,
      chartIndex: 0,
      lastFrameTime: 0,
      stopUntil: 0,

      tailMeta: [] as { active: boolean; available: boolean }[],
      upLast: false,
      downLast: false,
      leftLast: false,
      rightLast: false,
      upStep: false,
      downStep: false,
      leftStep: false,
      rightStep: false,

      scrollSpeed: 150,
      marveleousRange: 1,
      excellentRange: 5,
      greatRange: 10,
      goodRange: 25,

      score: 0,
      combo: 0,
    };
  },
  computed: {
    icons() {
      return {
        up: this.$refs.up as HTMLImageElement,
        down: this.$refs.down as HTMLImageElement,
        left: this.$refs.left as HTMLImageElement,
        right: this.$refs.right as HTMLImageElement,
        hold: this.$refs.hold as HTMLImageElement,
        roll: this.$refs.roll as HTMLImageElement,
      };
    },
    notes() {
      return (this.chart as Chart).difficulties[this.difficulty].notes.sort(
        (a, b) => a.beat - b.beat
      );
    },
    tails() {
      return calculateTails(this.notes);
    },
  },
  methods: {
    mainRenderLoop(deltaMs: number) {
      this.animationRequest = requestAnimationFrame((time) => {
        const delta = time - this.lastFrameTime;
        this.lastFrameTime = time;
        this.mainRenderLoop(delta);
      });
      //if (this.mats.length > 0) {
      //  this.updateMats();
      //}
      // this.upStep = !this.lastUp && this.anyUp;
      // this.downStep = !this.lastDown && this.anyDown;
      // this.leftStep = !this.lastLeft && this.anyLeft;
      // this.rightStep = !this.rightDown && this.anyRight;
      // this.lastUp = this.anyUp;
      // this.lastDown = this.anyDown;
      // this.lastLeft = this.anyLeft;
      // this.lastRight = this.anyRight;

      this.clearCanvas();
      this.canvasContext!.scale(
        window.devicePixelRatio,
        window.devicePixelRatio
      );
      this.drawUI(deltaMs);

      if (this.playing) {
        this.incrementBeat(deltaMs);
        this.canvasContext!.globalAlpha = 1;
        this.checkInputs();
        drawTails(
          this.canvasContext!,
          this.icons,
          this.tails,
          this.tailMeta,
          this.scrollSpeed,
          this.currentBeat
        );
        drawArrows(
          this.canvasContext!,
          this.icons,
          this.notes,
          this.scrollSpeed,
          this.currentBeat
        );
      }
      this.canvasContext!.scale(
        1 / window.devicePixelRatio,
        1 / window.devicePixelRatio
      );
    },
    clearCanvas() {
      const canvas = this.$refs.canvas as HTMLCanvasElement;
      if (this.canvasContext === null) {
        this.canvasContext = canvas.getContext("2d");
      }
      this.canvasWidth = canvas.clientWidth * window.devicePixelRatio;
      this.canvasHeight = canvas.clientHeight * window.devicePixelRatio;
      this.canvasContext!.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    },
    drawUI(deltaMs: number) {
      this.canvasContext!.globalAlpha = 0.7;
      this.canvasContext!.drawImage(this.icons.left, 50, 50, 100, 100);
      this.canvasContext!.drawImage(this.icons.down, 200, 50, 100, 100);
      this.canvasContext!.drawImage(this.icons.up, 350, 50, 100, 100);
      this.canvasContext!.drawImage(this.icons.right, 500, 50, 100, 100);
    },
    incrementBeat(deltaMs: number) {
      if (this.currentBeat >= this.nextBeat) {
        while (true) {
          const note = this.notes[this.chartIndex++];

          if (note === undefined) {
            console.info("End of song");
            this.completeLevel();
            break;
          }

          if (note.type === "OFFSET") {
            this.currentBeat = this.currentBeat + note.value;
            console.info("Adjusting offset");
            break;
          } else if (note.type === "SET_BPM") {
            this.bpm = note.value;
            console.info("Adjusting BPM");
          } else if (note.type === "STOP") {
            console.info("STOPing");
            this.stopUntil = this.lastFrameTime + note.value * 1000;
          } else if (note.type === "TRACK_VALUE") {
            this.nextBeat = this.nextBeat + note.value;
            break;
          }
        }
      }

      if (this.stopUntil <= this.lastFrameTime) {
        const bpmInMillis = this.bpm / 60 / 1000;
        const beatChange = bpmInMillis * deltaMs;
        this.currentBeat = this.currentBeat + beatChange;
      }
    },
    checkInputs() {
      // this.checkInput("left", this.anyLeft, this.leftStep);
      // this.checkInput("right", this.anyRight, this.rightStep);
      // this.checkInput("up", this.anyUp, this.upStep);
      // this.checkInput("down", this.anyDown, this.downStep);
    },
    // checkInput(track, held, stepped) {},
    completeLevel() {
      this.playing = false;
      (this.$refs.gameAudio as HTMLAudioElement).pause();
      (this.$refs.gameAudio as HTMLAudioElement).currentTime = 0;
      this.bpm = 100;
      this.currentBeat = 0;
      this.nextBeat = 0;
      this.chartIndex = 0;
      this.score = 0;
    },
  },
  watch: {
    tails() {
      this.tailMeta = this.tails.map((tail) => ({
        active: true,
        available: true,
      }));
    },
    chart() {
      this.completeLevel();
    },
    difficulty() {
      this.completeLevel();
    },
  },
  mounted() {
    this.mainRenderLoop(0);
    // this.updateMats();
  },
  beforeDestroy() {
    if (this.animationRequest) {
      cancelAnimationFrame(this.animationRequest);
    }
  },
};
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
