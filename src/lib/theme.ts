// Shared by the server layout and the client toggle. Must not live in a "use client" module:
// values exported from one reach Server Components as client references, not as the value.
export const THEME_STORAGE_KEY = "theme";

// Runs in <head> before hydration so the page never flashes the wrong theme.
export const themeInitScript = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;
