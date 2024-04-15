let isNightMode = false;
let isEnglish = false;

const texts = {
  en: {
    aboutTitle: "About Me",
    aboutDesc: "Proactive professional and always eager to learn, I offer comprehensive and tailored solutions to each problem, capable of working both on the frontend and backend.",
    experienceTitle: "Experience",
    experienceList: [
      "Developer at PRONET OL, leading software projects for the wine industry.",
      "Development and maintenance of HIS and ERP systems at Central Hospital Mendoza.",
      "Development of telemedicine platforms and software solutions for the cannabis industry."
    ],
    portfolioTitle: "Portfolio",
    portfolioDesc: "Highlighted projects I've worked on, including healthcare sector solutions and B2B applications.",
    contactTitle: "Contact",
    contactDesc: "Interested in collaborating? Don't hesitate to contact me through the following platforms."
  },
  es: {
    aboutTitle: "Sobre Mí",
    aboutDesc: "Profesional proactivo y con predisposición constante al aprendizaje, ofrezco soluciones integrales y adaptadas a cada problema, con capacidad de trabajar tanto en el frontend como en el backend.",
    experienceTitle: "Experiencia",
    experienceList: [
      "Desarrollador en PRONET OL, liderando proyectos de software para la industria del vino.",
      "Desarrollo y mantenimiento de sistemas HIS y ERP en Hospital Central Mendoza.",
      "Desarrollo de plataformas de telemedicina y soluciones de software para la industria del cannabis."
    ],
    portfolioTitle: "Portafolio",
    portfolioDesc: "Proyectos destacados en los que he trabajado, incluyendo soluciones para el sector salud y aplicaciones B2B.",
    contactTitle: "Contacto",
    contactDesc: "¿Interesado en colaborar? No dudes en contactarme a través de las siguientes plataformas."
  }
};

function toggleNightMode() {
  isNightMode = !isNightMode;
  document.body.classList.toggle('night', isNightMode);
}

function toggleLanguage() {
  isEnglish = !isEnglish;
  const language = isEnglish ? 'en' : 'es';

  document.querySelector("#about h2").textContent = texts[language].aboutTitle;
  document.querySelector("#about p").textContent = texts[language].aboutDesc;
  document.querySelector("#experience h2").textContent = texts[language].experienceTitle;
  const experienceList = document.querySelector("#experience ul");
  experienceList.innerHTML = '';
  texts[language].experienceList.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    experienceList.appendChild(li);
  });
  document.querySelector("#portfolio h2").textContent = texts[language].portfolioTitle;
  document.querySelector("#portfolio p").textContent = texts[language].portfolioDesc;
  document.querySelector("#contact h2").textContent = texts[language].contactTitle;
  document.querySelector("#contact p").textContent = texts[language].contactDesc;
}
