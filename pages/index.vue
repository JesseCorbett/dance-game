<template>
  <div class="relative">
    <level
      class="fixed top-0 bottom-0 left-0 right-0"
      v-if="chart"
      :chart="chart"
      :difficulty="difficulty"
    ></level>

    <div
      class="fixed top-0 bottom-0 right-0 overflow-y-auto p-2 text-sm text-white"
      style="background: rgba(34, 34, 34, 0.5)"
    >
      <label
        for="chart-picker"
        class="rounded border-solid border-2 px-5 cursor-pointer"
      >
        Load Charts
      </label>
      <input
        id="chart-picker"
        type="file"
        webkitdirectory
        directory
        @change="uploadCharts"
        class="hidden"
      />
      <div v-for="chart in charts" :key="chart.path" class="my-2">
        <hr />
        <div class="font-semibold">
          {{ chart.chart.title }}.{{ chart.format }}
        </div>
        <div class="flex gap-1">
          <span
            class="text-xs cursor-pointer"
            v-for="(diff, idx) in chart.chart.difficulties"
            :key="diff.label"
            @click="openChart(chart, idx)"
          >
            {{ diff.label }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { convertFromSSC } from "~/conversion/ssc";
import { convertFromSM } from "~/conversion/sm";
import type { Chart } from "~/models/charts";

const chart = ref<Chart | null>(null);
const difficulty = ref<number>(0);

// onMounted(async () => {
//   chart.value = await convertFromSSC("/Notice Me Benpai/No title/No title.ssc");
// });

type ChartFile = {
  chart: Chart;
  path: string;
  format: "ssc" | "sm";
};

const charts = ref<ChartFile[]>([]);
let files = null as FileList | null;

async function uploadCharts(event: Event) {
  charts.value = [];
  files = (event.target as HTMLInputElement).files;
  await parseCharts();
}

async function parseCharts() {
  if (!files) return;
  const newCharts = [];
  for (let i = 0; i < files!.length; i++) {
    const newChart = await parseChart(files!.item(i)!);
    if (newChart) {
      newCharts.push(newChart);
    }
  }
  newCharts.sort((a, b) => (a.chart.title < b.chart.title ? -1 : 1));
  charts.value = newCharts;
}

async function parseChart(file: File): Promise<ChartFile | null> {
  if (file.name.endsWith(".ssc")) {
    return {
      chart: await convertFromSSC(file),
      path: file.webkitRelativePath,
      format: "ssc",
    };
  }

  if (file.name.endsWith(".sm")) {
    return {
      chart: await convertFromSM(file),
      path: file.webkitRelativePath,
      format: "sm",
    };
  }

  return null;
}

function openChart(selected: ChartFile, difficultyIndex: number) {
  difficulty.value = difficultyIndex;
  chart.value = selected.chart;
}
</script>

<style scoped></style>
