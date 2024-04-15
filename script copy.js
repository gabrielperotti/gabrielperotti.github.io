let isNightMode = false;
let isEnglish = false;

const texts = {
  en: {
    about: "About Me",
    experience: "Experience",
    portfolio: "Portfolio",
    contact: "Contact",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin malesuada nisi eget ipsum blandit vehicula."
  },
  es: {
    about: "Sobre Mí",
    experience: "Experiencia",
    portfolio: "Portafolio",
    contact: "Contacto",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin malesuada nisi eget ipsum blandit vehicula."
  }
};

function toggleNightMode() {
  isNightMode = !isNightMode;
  document.body.className = isNightMode ? 'night' : '';
}

function toggleLanguage() {
  isEnglish = !isEnglish;
  const lang = isEnglish ? 'en' : 'es';
  document.getElementById('about').innerText = texts[lang].about;
  document.getElementById('experience').innerText = texts[lang].experience;
  document.getElementById('portfolio').innerText = texts[lang].portfolio;
  document.getElementById('contact').innerText = texts[lang].contact;
  document.querySelector('#about p').innerText = texts[lang].description;
}
