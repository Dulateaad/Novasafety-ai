/**
 * Локальный PostCSS для Vite: без tailwind (в родительской папке gp_2026_cad26
 * иначе подхватывается postcss.config.mjs с tailwindcss, которого нет в NOVA Safety).
 */
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {},
}

export default config
