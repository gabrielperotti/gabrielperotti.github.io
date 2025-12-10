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
  
  // Actualizar label de navegación después de traducir
  setTimeout(() => {
    const currentSection = document.querySelector(".nav-link.active")?.getAttribute("data-section");
    if (currentSection) {
      const activeLink = document.querySelector(`.nav-link[data-section="${currentSection}"]`);
      const navLabel = document.getElementById("nav-label");
      if (activeLink && navLabel) {
        navLabel.textContent = activeLink.textContent;
      }
    }
  }, 100);
}

function updateLangButtonsUI(lang) {
  document.querySelectorAll(".lang-option").forEach((btn) => {
    if (btn.getAttribute("data-lang") === lang) {
      btn.classList.add("active-lang");
    } else {
      btn.classList.remove("active-lang");
    }
  });

  const label = document.getElementById("lang-label");
  const flag = document.getElementById("lang-flag");
  if (label) label.textContent = lang.toUpperCase();
  if (flag) {
    const flagMap = {
      es: "https://flagcdn.com/w20/es.png",
      en: "https://flagcdn.com/w20/gb.png",
      pt: "https://flagcdn.com/w20/pt.png",
    };
    flag.src = flagMap[lang] || flagMap.es;
    flag.alt = lang;
  }
}

function updateCvLink(lang) {
  const cvBtn = document.getElementById("cv-download-btn");
  const floatingCvBtn = document.getElementById("floating-cv-btn");
  
  const fileMap = {
    es: "public/cv/gabriel-perotti-es.pdf",
    en: "public/cv/gabriel-perotti-en.pdf",
    pt: "public/cv/gabriel-perotti-pt.pdf",
  };

  const cvPath = fileMap[lang] || fileMap[DEFAULT_LANG];
  
  if (cvBtn) {
    cvBtn.setAttribute("href", cvPath);
  }
  
  if (floatingCvBtn) {
    floatingCvBtn.setAttribute("href", cvPath);
  }
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

  // menú de idiomas
  const langToggle = document.getElementById("lang-toggle");
  const langMenu = document.querySelector(".lang-menu");
  const closeLangMenu = () => {
    if (langMenu) langMenu.classList.remove("open");
    if (langToggle) langToggle.setAttribute("aria-expanded", "false");
  };

  if (langToggle && langMenu) {
    langToggle.addEventListener("click", (e) => {
      e.preventDefault();
      const isOpen = langMenu.classList.toggle("open");
      langToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    langMenu.querySelectorAll(".lang-option").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const lang = btn.getAttribute("data-lang");
        setLang(lang);
        closeLangMenu();
      });
    });

    document.addEventListener("click", (e) => {
      if (!langMenu.contains(e.target) && !langToggle.contains(e.target)) {
        closeLangMenu();
      }
    });
  }

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

  // ==== Navegación activa ====
  
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll(".nav-link, .nav-option");
  const navToggle = document.getElementById("nav-toggle");
  const navMenu = document.querySelector(".nav-menu");
  const navLabel = document.getElementById("nav-label");

  function updateActiveNav(sectionId) {
    navLinks.forEach((link) => {
      const linkSection = link.getAttribute("data-section");
      if (linkSection === sectionId) {
        link.classList.add("active");
        // Actualizar el label del dropdown mobile
        if (navLabel && link.classList.contains("nav-link")) {
          navLabel.textContent = link.textContent;
        }
      } else {
        link.classList.remove("active");
      }
    });
  }

  function getCurrentSection() {
    const scrollPosition = window.scrollY + 150; // Offset para considerar el header

    for (let i = sections.length - 1; i >= 0; i--) {
      const section = sections[i];
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;

      if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
        return section.getAttribute("id");
      }
    }

    // Si estamos en el top, retornar hero
    if (window.scrollY < 200) {
      return "hero";
    }

    return null;
  }

  // Detectar scroll y actualizar navegación
  let scrollTimeout;
  function handleScroll() {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const currentSection = getCurrentSection();
      if (currentSection && currentSection !== "hero" && currentSection !== "contact") {
        updateActiveNav(currentSection);
      } else {
        navLinks.forEach((link) => link.classList.remove("active"));
        if (navLabel) navLabel.textContent = navLabel.getAttribute("data-i18n") ? 
          (window.TRANSLATIONS[currentLang]?.nav?.about || "Sobre mí") : "Sobre mí";
      }
    }, 100);
  }

  window.addEventListener("scroll", handleScroll);
  handleScroll(); // Ejecutar al cargar

  // Manejar clicks en links de navegación
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      const sectionId = link.getAttribute("data-section");
      if (sectionId) {
        e.preventDefault();
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
          const headerHeight = document.querySelector(".site-header").offsetHeight;
          const targetPosition = targetSection.offsetTop - headerHeight;
          
          window.scrollTo({
            top: targetPosition,
            behavior: "smooth"
          });

          // Actualizar navegación después del scroll
          setTimeout(() => {
            updateActiveNav(sectionId);
          }, 500);

          // Cerrar menú mobile si está abierto
          if (navMenu) {
            navMenu.classList.remove("open");
            if (navToggle) navToggle.setAttribute("aria-expanded", "false");
          }
        }
      }
    });
  });

  // Dropdown de navegación mobile
  if (navToggle && navMenu) {
    const closeNavMenu = () => {
      navMenu.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    };

    navToggle.addEventListener("click", (e) => {
      e.preventDefault();
      const isOpen = navMenu.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    document.addEventListener("click", (e) => {
      if (!navMenu.contains(e.target) && !navToggle.contains(e.target)) {
        closeNavMenu();
      }
    });
  }

});
