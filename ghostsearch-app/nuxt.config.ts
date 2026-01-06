// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  css: ["~/assets/css/main.css"],
  supabase: {
    redirectOptions: {
      login: "/login",
      callback: "/confirm",
      exclude: ["/signup"],
    },
  },
  modules: [
    "@nuxt/content",
    "@nuxt/eslint",
    "@nuxt/hints",
    "@nuxt/image",
    "@nuxt/test-utils",
    "@nuxt/ui",
    "@nuxtjs/supabase",
    "nuxt-og-image",
    "@vueuse/nuxt",
    "@polar-sh/nuxt",
  ],
  runtimeConfig: {
    public: {
      posthogPublicKey: "phc_wJDFwNQ9CC851xP7nxzM7EhIIoMKV1jAXX1FtqU7Hkl",
      posthogHost: "https://eu.i.posthog.com",
      posthogDefaults: "2025-11-30",
    },
  },
});
