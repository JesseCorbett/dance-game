// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  devtools: { enabled: true },

  modules: ["@pinia/nuxt", "@vueuse/nuxt", "@nuxtjs/tailwindcss"],

  app: {
    baseURL: "/",
    buildAssetsDir: "assets", // don't use "_" at the begining of the folder name to avoids nojkill conflict
    head: {
      title: 'Spider Karaoke',
      meta: [
        { property: 'og:title', content: 'Spider Karaoke' },
        { property: 'og:description', content: 'Dance along to Gomi\'s songs' },
        { name: 'description', content: 'Dance along to Gomi\'s songs' }
      ]
    }
  },
});
