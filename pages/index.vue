<template>
  <div class="relative">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Rubik+Puddles&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;600;700&display=swap" rel="stylesheet">
    <Level
      class="fixed top-0 bottom-0 left-0 right-0"
      v-if="chart"
      :chart="chart"
      :difficulty="difficulty"
    ></Level>

    <div v-show="!chart" id="tracks" class="fixed top-0 bottom-0 left-0 right-0 overflow-y-auto custom-scrollbar">
      <div class="min-h-full flex flex-col items-center justify-center py-10">
        <h1 class="mb-8 text-center drop-shadow-[0_0_10px_rgba(224,214,255,0.5)]">Spider Karaoke</h1>
        
        <div class="w-full max-w-md px-4 space-y-4">
          <div v-for="chart in charts" :key="chart.path" 
               class="chart-card bg-gomi-web backdrop-blur-sm border border-gomi-primary/20 rounded-xl p-4 transition-all duration-300 hover:scale-[1.02] hover:bg-gomi-primary/10 hover:border-gomi-accent/50 group relative overflow-hidden">
            
            <!-- Spider web corner decoration -->
            <div class="absolute -top-6 -right-6 w-12 h-12 border border-gomi-primary/10 rounded-full scale-[2] group-hover:border-gomi-accent/20 transition-colors"></div>
            <div class="absolute -top-4 -right-4 w-8 h-8 border border-gomi-primary/10 rounded-full scale-[2]"></div>

            <h2 class="font-bold text-xl text-gomi-primary mb-2 relaltive z-10 group-hover:text-gomi-accent transition-colors">
              {{ chart.chart.title }}
            </h2>
            
            <div class="flex flex-wrap gap-2 relative z-10">
              <span
                class="px-3 py-1 rounded-full text-xs font-semibold bg-gomi-dark/50 text-gomi-primary border border-gomi-primary/20 cursor-pointer hover:bg-gomi-accent hover:text-gomi-bg hover:border-gomi-accent transition-all duration-200"
                v-for="(diff, idx) in chart.chart.difficulties"
                :key="diff.label"
                @click="openChart(chart, idx)"
              >
                {{ diff.label || 'Default' }}
              </span>
            </div>
          </div>
        </div>

        <div class="mt-12 text-center">
          <label
              for="chart-picker"
              class="inline-block px-6 py-2 rounded-full border border-gomi-primary/30 text-gomi-primary/70 text-sm hover:text-gomi-accent hover:border-gomi-accent hover:bg-gomi-accent/10 transition-all cursor-pointer"
          >
            Load Charts (dev tool)
          </label>
        </div>
      </div>

      <input
          id="chart-picker"
          type="file"
          webkitdirectory
          directory
          @change="uploadCharts"
          class="hidden"
      />
      
      <!-- Ambient background effects -->
      <div class="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 bg-[radial-gradient(circle_at_50%_50%,rgba(26,16,37,0)_0%,rgba(18,11,26,0.8)_100%)]"></div>
      <div class="fixed bottom-0 right-0 w-[500px] h-[500px] bg-gomi-accent/5 blur-[120px] rounded-full pointer-events-none -z-20"></div>
      <div class="fixed top-0 left-0 w-[500px] h-[500px] bg-gomi-primary/5 blur-[120px] rounded-full pointer-events-none -z-20"></div>
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
      path: "/chart/Espresso/",
      file: "chart.ssc",
      format: "ssc" as const,
    },
    {
      name: "Suki Suki Daisuki",
      path: "/chart/Suki Suki Daisuki/",
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
        parsedChart = parseSSC(text, info.path);
      } else {
        // Fallback or expansion for sm if needed
        parsedChart = parseSM(text, info.path);
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

<style scoped>
/* Base Styles */
.relative {
  background-color: #1a1025; /* Fallback for gomi-bg */
  min-height: 100vh;
  color: #e0d6ff; /* Fallback for gomi-primary */
  font-family: 'Quicksand', sans-serif;
}

#tracks h1 {
  font-size: 64px;
  font-family: "Rubik Puddles", sans-serif;
  color: #e0d6ff;
  letter-spacing: 2px;
}

/* Custom Scrollbar for the track list */
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(26, 16, 37, 0.5);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(224, 214, 255, 0.2);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 107, 107, 0.4);
}
</style>
