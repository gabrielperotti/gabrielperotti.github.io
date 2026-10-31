(() => {
  'use strict';
  const translations = {
    en: {
      bitoTitle: 'Bito assistant', bitoChat: 'Chat with Bito', bitoLoading: 'Loading Bito…', bitoError: 'Bito could not load. Please try again.', bitoRetry: 'Try again',
      profileHeading: 'profile', skip: 'Skip to content', navigation: 'Main navigation', about: 'About me', skills: 'Skills', contact: 'Contact', language: 'Language',
      lightTheme: 'Light theme', darkTheme: 'Dark theme', themeLabel: 'Use light theme',
      eyebrow: 'Software development · Full Stack', role: 'Software Engineer | Full Stack',
      intro: 'Developer with over 20 years of experience. Proactive and committed to continuous learning, I offer comprehensive solutions to each challenge, working across frontend and backend, gathering requirements with clients and performing quality checks.',
      resume: 'View résumé ↗', getInTouch: 'Get in touch →', pdfNote: 'PDF in English · Opens in a new tab', profile: 'Developer profile',
      approach: 'Client requirements → Frontend & backend → Quality checks', skillsKicker: '01 / Skills', toolkit: 'What I work with.',
      skillsIntro: 'My core technical skills and languages.', programming: 'Programming languages', frameworks: 'Technologies / Frameworks',
      applications: 'Applications / Databases', spoken: 'Spoken languages', spanish: 'Spanish (native)', english: 'English B2', portuguese: 'Portuguese A2',
      contactKicker: '02 / Contact', connect: "Let's connect.", contactIntro: 'You can find me through these channels.', email: 'Email →',
      externalNote: 'LinkedIn, GitHub and WhatsApp open in a new tab.',
      title: 'Gabriel Perotti — Software Engineer | Full Stack',
      description: 'Gabriel Perotti — Software Engineer and Full Stack Developer with over 20 years of experience. Skills, résumé and contact details.',
      socialDescription: 'Software development experience, technical skills, résumé and contact details.'
    },
    pt: {
      bitoTitle: 'Assistente Bito', bitoChat: 'Converse com o Bito', bitoLoading: 'Carregando Bito…', bitoError: 'Não foi possível carregar o Bito. Tente novamente.', bitoRetry: 'Tentar novamente',
      profileHeading: 'perfil', skip: 'Pular para o conteúdo', navigation: 'Navegação principal', about: 'Sobre mim', skills: 'Habilidades', contact: 'Contato', language: 'Idioma',
      lightTheme: 'Tema claro', darkTheme: 'Tema escuro', themeLabel: 'Usar tema claro',
      eyebrow: 'Desenvolvimento de software · Full Stack', role: 'Engenheiro de Software | Full Stack',
      intro: 'Desenvolvedor com mais de 20 anos de experiência. Proativo e comprometido com o aprendizado contínuo, ofereço soluções completas para cada desafio, atuando no frontend e no backend, levantando requisitos com os clientes e realizando controles de qualidade.',
      resume: 'Ver currículo ↗', getInTouch: 'Entre em contato →', pdfNote: 'PDF em inglês · Abre em uma nova aba', profile: 'Perfil do desenvolvedor',
      approach: 'Requisitos do cliente → Frontend e backend → Controles de qualidade', skillsKicker: '01 / Habilidades', toolkit: 'Com o que trabalho.',
      skillsIntro: 'Minhas principais habilidades técnicas e idiomas.', programming: 'Linguagens de programação', frameworks: 'Tecnologias / Frameworks',
      applications: 'Aplicações / Bancos de dados', spoken: 'Idiomas', spanish: 'Espanhol (nativo)', english: 'Inglês B2', portuguese: 'Português A2',
      contactKicker: '02 / Contato', connect: 'Vamos conversar.', contactIntro: 'Você pode me encontrar por estes canais.', email: 'E-mail →',
      externalNote: 'LinkedIn, GitHub e WhatsApp abrem em uma nova aba.',
      title: 'Gabriel Perotti — Engenheiro de Software | Full Stack',
      description: 'Gabriel Perotti — Engenheiro de Software e Desenvolvedor Full Stack com mais de 20 anos de experiência. Habilidades, currículo e contato.',
      socialDescription: 'Experiência em desenvolvimento de software, habilidades técnicas, currículo e contato.'
    },
    es: {
      bitoTitle: 'Asistente Bito', bitoChat: 'Conversá con Bito', bitoLoading: 'Cargando Bito…', bitoError: 'No se pudo cargar Bito. Inténtalo de nuevo.', bitoRetry: 'Reintentar',
      profileHeading: 'perfil', skip: 'Saltar al contenido', navigation: 'Navegación principal', about: 'Sobre mí', skills: 'Habilidades', contact: 'Contacto', language: 'Idioma',
      lightTheme: 'Tema claro', darkTheme: 'Tema oscuro', themeLabel: 'Usar tema claro',
      eyebrow: 'Desarrollo de software · Full Stack', role: 'Ingeniero de Software | Full Stack',
      intro: 'Desarrollador con más de 20 años de experiencia. Proactivo y comprometido con la formación continua, ofrezco soluciones integrales para cada desafío, trabajando tanto en frontend como en backend, relevando requisitos con el cliente y realizando controles de calidad.',
      resume: 'Ver currículum ↗', getInTouch: 'Contactame →', pdfNote: 'PDF en inglés · Se abre en una pestaña nueva', profile: 'Perfil del desarrollador',
      approach: 'Requisitos del cliente → Frontend y backend → Controles de calidad', skillsKicker: '01 / Habilidades', toolkit: 'Con qué trabajo.',
      skillsIntro: 'Mis principales habilidades técnicas e idiomas.', programming: 'Lenguajes de programación', frameworks: 'Tecnologías / Frameworks',
      applications: 'Aplicaciones / Bases de datos', spoken: 'Idiomas', spanish: 'Español (nativo)', english: 'Inglés B2', portuguese: 'Portugués A2',
      contactKicker: '02 / Contacto', connect: 'Conversemos.', contactIntro: 'Podés encontrarme por estos canales.', email: 'Correo →',
      externalNote: 'LinkedIn, GitHub y WhatsApp se abren en una pestaña nueva.',
      title: 'Gabriel Perotti — Ingeniero de Software | Full Stack',
      description: 'Gabriel Perotti — Ingeniero de Software y Desarrollador Full Stack con más de 20 años de experiencia. Habilidades, currículum y contacto.',
      socialDescription: 'Experiencia en desarrollo de software, habilidades técnicas, currículum y contacto.'
    }
  };
  const root = document.documentElement;
  const language = document.getElementById('language');
  const themeButton = document.getElementById('theme');
  const languageOptions = document.getElementById('language-options');
  const languageButtons = [...languageOptions.querySelectorAll('[data-language]')];
  const picker = document.querySelector('.language-picker');
  const header = document.querySelector('.top');
  let currentLanguage = 'en';
  function readPreference(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  function savePreference(key, value) {
    try { localStorage.setItem(key, value); } catch { /* Preferences work without storage. */ }
  }
  function updateThemeButton() {
    const light = root.dataset.theme === 'light';
    themeButton.firstElementChild.textContent = light ? '☾' : '☀︎';
    themeButton.setAttribute('aria-label', translations[currentLanguage][light ? 'darkTheme' : 'lightTheme']);
  }
  function setLanguage(value) {
    currentLanguage = Object.hasOwn(translations, value) ? value : 'en';
    const text = translations[currentLanguage];
    root.lang = currentLanguage;
    document.getElementById('language-code').textContent = currentLanguage.toUpperCase();
    language.setAttribute('aria-label', `${text.language}: ${currentLanguage.toUpperCase()}`);
    languageButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.language === currentLanguage)));
    document.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = text[element.dataset.i18n]; });
    document.querySelectorAll('[data-i18n-aria]').forEach(element => { element.setAttribute('aria-label', text[element.dataset.i18nAria]); });
    document.title = text.title;
    document.querySelector('meta[name="description"]').content = text.description;
    document.querySelector('meta[property="og:title"]').content = text.title;
    document.querySelector('meta[property="og:description"]').content = text.socialDescription;
    updateThemeButton();
    savePreference('gp-lang', currentLanguage);
    document.dispatchEvent(new Event('portfolio:language'));
  }
  function setTheme(value) {
    root.dataset.theme = value === 'light' ? 'light' : 'dark';
    updateThemeButton();
    savePreference('gp-theme', root.dataset.theme);
  }
  setTheme(readPreference('gp-theme'));
  setLanguage(readPreference('gp-lang'));
  function closeLanguages(restoreFocus = false) {
    languageOptions.hidden = true;
    language.setAttribute('aria-expanded', 'false');
    if (restoreFocus) language.focus();
  }
  function openLanguages(focusOption = false) {
    languageOptions.hidden = false;
    language.setAttribute('aria-expanded', 'true');
    if (focusOption) languageButtons.find(button => button.dataset.language === currentLanguage).focus();
  }
  language.addEventListener('click', () => languageOptions.hidden ? openLanguages() : closeLanguages());
  language.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openLanguages(true);
    }
  });
  languageButtons.forEach(button => button.addEventListener('click', () => {
    setLanguage(button.dataset.language);
    closeLanguages(true);
  }));
  picker.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !languageOptions.hidden) {
      event.preventDefault();
      closeLanguages(true);
    }
    const index = languageButtons.indexOf(event.target);
    if (index !== -1 && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? languageButtons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + languageButtons.length) % languageButtons.length;
      languageButtons[next].focus();
    }
  });
  picker.addEventListener('focusout', event => {
    if (!picker.contains(event.relatedTarget)) closeLanguages();
  });
  document.addEventListener('click', event => {
    if (!picker.contains(event.target)) closeLanguages();
  });
  themeButton.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));
  document.getElementById('preferences').hidden = false;
  function updateHeaderHeight() {
    root.style.setProperty('--header-height', `${header.getBoundingClientRect().height}px`);
  }
  updateHeaderHeight();
  new ResizeObserver(updateHeaderHeight).observe(header);
})();
