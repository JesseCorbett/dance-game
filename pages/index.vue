<template>
  <div class="relative">
    <Level
      class="fixed top-0 bottom-0 left-0 right-0"
      v-if="chart"
      :chart="chart"
      :difficulty="difficulty"
    ></Level>

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
            {{ diff.label || 'Default' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from "vue";
import { convertFromSSC, parseSSC } from "~/conversion/ssc";
import { convertFromSM, parseSM } from "~/conversion/sm";
import type { Chart } from "~/models/charts";

const chart = ref<Chart | null>(null);
const difficulty = ref<number>(0);

type ChartFile = {
  chart: Chart;
  path: string;
  format: "ssc" | "sm";
};

const charts = ref<ChartFile[]>([]);
let files = null as FileList | null;

onMounted(() => {
  loadDefaultCharts();
});

async function loadDefaultCharts() {
  const defaultCharts = [
    {
      name: "Espresso",
      path: "/dance-game/chart/Espresso/",
      file: "chart.ssc",
      format: "ssc" as const,
    },
    {
      name: "Suki Suki Daisuki",
      path: "/dance-game/chart/Suki Suki Daisuki/",
      file: "chart.ssc",
      format: "ssc" as const,
    },
  ];

  for (const info of defaultCharts) {
    try {
      const response = await fetch(info.path + info.file);
      const text = await response.text();
      let parsedChart: Chart;

      if (info.format === "ssc") {
        parsedChart = parseSSC(text, '');
      } else {
        // Fallback or expansion for sm if needed
        parsedChart = parseSM(text, '');
      }

      charts.value.push({
        chart: parsedChart,
        path: info.path,
        format: info.format,
      });
    } catch (e) {
      console.error(`Failed to load default chart ${info.name}`, e);
    }
  }
}

async function uploadCharts(event: Event) {
  charts.value = [];
  chart.value = null;
  difficulty.value = 0;
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
  console.log("Parsing " + file.name);
  if (file.name.endsWith(".ssc")) {
    const chart = await convertFromSSC(file);
    mapUrlsToFiles(chart);
    return {
      chart,
      path: file.webkitRelativePath,
      format: "ssc",
    };
  }

  if (file.name.endsWith(".sm")) {
    const chart = await convertFromSM(file);
    mapUrlsToFiles(chart);
    return {
      chart,
      path: file.webkitRelativePath,
      format: "sm",
    };
  }

  return null;
}

function mapUrlsToFiles(chart: Chart) {
  try {
    chart.songUrl = window.URL.createObjectURL(findFile(chart.songUrl)!);
  } catch (e) {
    alert("Chart: " + chart.title + " failed to load song");
  }

  try {
    if (chart.backgroundUrl) {
      chart.backgroundUrl = window.URL.createObjectURL(
        findFile(chart.backgroundUrl)!
      );
    }
  } catch (e) {
    alert("Chart: " + chart.title + " failed to load background");
  }

  try {
    if (chart.bannerUrl) {
      chart.bannerUrl = window.URL.createObjectURL(findFile(chart.bannerUrl)!);
    }
  } catch (e) {
    console.error("Chart: " + chart.title + " failed to load banner");
  }

  try {
    if (chart.lyricsUrl) {
      chart.lyricsUrl = window.URL.createObjectURL(findFile(chart.lyricsUrl)!);
    }
  } catch (e) {
    console.error("Chart: " + chart.title + " failed to load lyrics");
  }

  try {
    if (chart.cdCoverUrl) {
      chart.cdCoverUrl = window.URL.createObjectURL(
        findFile(chart.cdCoverUrl)!
      );
    }
  } catch (e) {
    console.error(
      "Chart: " + chart.title + " failed to load cd cover " + chart.cdCoverUrl
    );
  }
}

function findFile(path: string): File | null {
  for (let i = 0; i < files!.length; i++) {
    const file = files!.item(i)!;
    if (file.webkitRelativePath === path) {
      return file;
    }
  }
  return null;
}

function openChart(selected: ChartFile, difficultyIndex: number) {
  difficulty.value = difficultyIndex;
  chart.value = selected.chart;
}
</script>

<style scoped></style>
