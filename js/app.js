const DEFAULT_LANG = "es";
const LANG_STORAGE_KEY = "gp_site_lang";
const THEME_STORAGE_KEY = "gp_site_theme";
const THEME_LIGHT = "light";
const THEME_DARK = "dark";

function getSavedLang() {
  const saved = localStorage.getItem(LANG_STORAGE_KEY);
  if (saved && window.TRANSLATIONS[saved]) return saved;
  return DEFAULT_LANG;
}

let currentLang = getSavedLang();

function applyTranslations() {
  const translations = window.TRANSLATIONS[currentLang];
  if (!translations) return;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const keyPath = el.getAttribute("data-i18n").split(".");
    let value = translations;

    for (const key of keyPath) {
      if (value && typeof value === "object" && key in value) {
        value = value[key];
      } else {
        value = null;
        break;
      }
    }

    if (typeof value === "string") {
      el.textContent = value;
    }
  });
}

function setLang(lang) {
  if (!window.TRANSLATIONS[lang]) return;
  currentLang = lang;
  localStorage.setItem(LANG_STORAGE_KEY, lang);
  applyTranslations();
  updateLangButtonsUI(lang);
  updateCvLink(lang);
}

function updateLangButtonsUI(lang) {
  document.querySelectorAll("[data-lang]").forEach((btn) => {
    if (btn.getAttribute("data-lang") === lang) {
      btn.classList.add("active-lang");
    } else {
      btn.classList.remove("active-lang");
    }
  });
}

function updateCvLink(lang) {
  const cvBtn = document.getElementById("cv-download-btn");
  if (!cvBtn) return;

  // Ajusta los nombres de archivo si usás otros
  const fileMap = {
    es: "cv/gabriel-perotti-es.pdf",
    en: "cv/gabriel-perotti-en.pdf",
    pt: "cv/gabriel-perotti-pt.pdf",
  };

  cvBtn.setAttribute("href", fileMap[lang] || fileMap[DEFAULT_LANG]);
}

// ==== Tema claro / oscuro ====

function getSavedTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === THEME_LIGHT || saved === THEME_DARK) return saved;

  // Preferencia del sistema
  return window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: light)").matches
    ? THEME_LIGHT
    : THEME_DARK;
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.remove("theme-light", "theme-dark");
  root.classList.add(theme === THEME_LIGHT ? "theme-light" : "theme-dark");
}

function setTheme(theme) {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyTheme(theme);
  updateThemeToggleUI(theme);
}

function toggleTheme() {
  const current =
    document.documentElement.classList.contains("theme-light")
      ? THEME_LIGHT
      : THEME_DARK;
  setTheme(current === THEME_LIGHT ? THEME_DARK : THEME_LIGHT);
}

function updateThemeToggleUI(theme) {
  const icon = document.getElementById("theme-icon");
  if (!icon) return;

  // Mostrar el ícono del tema al que se cambiará (no el actual)
  if (theme === THEME_LIGHT) {
    // Si estamos en modo claro, mostrar luna para cambiar a oscuro
    icon.src = "https://cdn.jsdelivr.net/npm/@tabler/icons/icons/moon.svg";
    icon.alt = "Switch to dark mode";
  } else {
    // Si estamos en modo oscuro, mostrar sol para cambiar a claro
    icon.src = "https://cdn.jsdelivr.net/npm/@tabler/icons/icons/sun.svg";
    icon.alt = "Switch to light mode";
  }
}

// ==== Init ====

document.addEventListener("DOMContentLoaded", () => {
  // idioma
  setLang(getSavedLang());

  document.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const lang = btn.getAttribute("data-lang");
      setLang(lang);
    });
  });

  // tema
  const initialTheme = getSavedTheme();
  applyTheme(initialTheme);
  updateThemeToggleUI(initialTheme);

  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", (e) => {
      e.preventDefault();
      toggleTheme();
    });
  }
});
