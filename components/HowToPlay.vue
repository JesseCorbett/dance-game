<template>
  <div class="how-to-play p-6 rounded-xl border-2 border-dashed border-gomi-primary/30 bg-gomi-dark/40 backdrop-blur-sm relative overflow-hidden group hover:border-gomi-accent/50 transition-colors duration-300">
    <!-- Stitched corner effect -->
    <div class="absolute -top-2 -left-2 w-4 h-4 bg-gomi-accent rounded-full opacity-50"></div>
    <div class="absolute -bottom-2 -right-2 w-4 h-4 bg-gomi-accent rounded-full opacity-50"></div>
    
    <h3 class="text-xl font-bold text-gomi-accent mb-4 font-rubik text-center">How to Play</h3>
    
    <div class="space-y-3 text-gomi-primary/90">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-full bg-gomi-primary/10 flex items-center justify-center text-lg">🎵</div>
        <span>Select a Track</span>
      </div>
      
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-full bg-gomi-primary/10 flex items-center justify-center text-lg">🕷️</div>
        <span>Choose Difficulty</span>
      </div>
      
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-full bg-gomi-primary/10 flex items-center justify-center text-lg">💃</div>
        <span>Hit arrows to the beat!</span>
      </div>
      
      <div class="flex justify-center gap-2 mt-2 text-2xl text-gomi-accent opacity-80 font-mono font-bold">
        <span>W</span><span>A</span><span>S</span><span>D</span>
      </div>
      <div class="flex justify-center gap-2 -mt-1 text-2xl text-gomi-accent opacity-80">
        <span>⬆️</span><span>⬅️</span><span>⬇️</span><span>➡️</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.font-rubik {
  font-family: "Rubik Puddles", cursive;
}
</style>
