export type Theme = "dark" | "light";
export const THEME_STORAGE_KEY = "theme";

/**
 * Runs in <head> before the page paints, so a saved light theme never flashes dark first.
 * Dark is the default; only an explicit "light" choice switches it.
 */
export const THEME_INIT_SCRIPT = `try{if(localStorage.getItem("${THEME_STORAGE_KEY}")==="light")document.documentElement.dataset.theme="light"}catch(e){}`;
