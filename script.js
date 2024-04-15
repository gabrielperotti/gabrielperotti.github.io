let isNightMode = false;
let isEnglish = false;

const texts = {
  en: {
    title: "Welcome",
    description: "This is a demo page with multi-language support and night mode."
  },
  es: {
    title: "Bienvenido",
    description: "Esta es una página de demostración con soporte multi-idioma y modo nocturno."
  }
};

function toggleNightMode() {
  isNightMode = !isNightMode;
  if (isNightMode) {
    document.body.classList.add('night');
  } else {
    document.body.classList.remove('night');
  }
}

function toggleLanguage() {
  isEnglish = !isEnglish;
  const language = isEnglish ? 'en' : 'es';
  document.getElementById('title').textContent = texts[language].title;
  document.getElementById('description').textContent = texts[language].description;
}
