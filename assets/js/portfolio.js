(() => {
  'use strict';
  const translations = {
    en: {
      bitoTitle: 'Bito assistant', bitoChat: 'Chat with Bito', bitoLoading: 'Loading Bito…', bitoError: 'Bito could not load. Please try again.', bitoRetry: 'Try again',
      profileHeading: 'profile', skip: 'Skip to content', navigation: 'Main navigation', about: 'About me', skills: 'Skills', contact: 'Contact', language: 'Language',
      lightTheme: 'Light theme', darkTheme: 'Dark theme', themeLabel: 'Use light theme',
      eyebrow: 'Software products · Artificial intelligence', role: 'AI Engineer | Software Architect | Senior Full Stack Developer',
      intro: 'I turn business needs into software products: from architecture to production. I combine over 25 years of experience with full stack development and artificial intelligence to build SaaS platforms, automate processes and integrate systems.',
      resume: 'View résumé ↗', getInTouch: 'Get in touch →', pdfNote: 'PDF in English · Opens in a new tab', profile: 'Developer profile',
      focusProducts: 'SaaS products and multi-tenant platforms', focusAgents: 'AI agents connected to business tools and processes', focusProduction: 'Architecture, development and production infrastructure',
      approach: 'Business needs → Architecture → Development → Production', skillsKicker: '01 / Skills', toolkit: 'What I work with.',
      skillsIntro: 'The capabilities and tools I use to turn ideas into working products.', aiAutomation: 'AI & automation', architectureBackend: 'Architecture & backend', frontend: 'Frontend', cloudData: 'Cloud & data',
      aiAgents: 'AI agents', conversationalContext: 'Conversational context', agenticDevelopment: 'Agent-based development workflows', eventDriven: 'Event-driven design',
      spoken: 'Spoken languages', spanish: 'Spanish (native)', english: 'English C1', portuguese: 'Portuguese (basic)',
      contactKicker: '02 / Contact', connect: "Let's connect.", contactIntro: 'You can find me through these channels.', email: 'Email →',
      externalNote: 'LinkedIn, GitHub and WhatsApp open in a new tab.',
      title: 'Gabriel Perotti — AI Engineer | Software Architect | Senior Full Stack Developer',
      description: 'Gabriel Perotti — AI Engineer, Software Architect and Senior Full Stack Developer. Over 25 years turning business needs into SaaS products, automation and integrated systems.',
      socialDescription: 'From business needs to production: SaaS platforms, AI agents and system integration.'
    },
    pt: {
      bitoTitle: 'Assistente Bito', bitoChat: 'Converse com o Bito', bitoLoading: 'Carregando Bito…', bitoError: 'Não foi possível carregar o Bito. Tente novamente.', bitoRetry: 'Tentar novamente',
      profileHeading: 'perfil', skip: 'Pular para o conteúdo', navigation: 'Navegação principal', about: 'Sobre mim', skills: 'Habilidades', contact: 'Contato', language: 'Idioma',
      lightTheme: 'Tema claro', darkTheme: 'Tema escuro', themeLabel: 'Usar tema claro',
      eyebrow: 'Produtos de software · Inteligência artificial', role: 'Engenheiro de IA | Arquiteto de Software | Desenvolvedor Full Stack Sênior',
      intro: 'Transformo necessidades de negócio em produtos de software: da arquitetura à entrada em produção. Combino mais de 25 anos de experiência com desenvolvimento full stack e inteligência artificial para construir plataformas SaaS, automatizar processos e integrar sistemas.',
      resume: 'Ver currículo ↗', getInTouch: 'Entre em contato →', pdfNote: 'PDF em inglês · Abre em uma nova aba', profile: 'Perfil do desenvolvedor',
      focusProducts: 'Produtos SaaS e plataformas multi-tenant', focusAgents: 'Agentes de IA conectados a ferramentas e processos de negócio', focusProduction: 'Arquitetura, desenvolvimento e infraestrutura de produção',
      approach: 'Necessidades de negócio → Arquitetura → Desenvolvimento → Produção', skillsKicker: '01 / Habilidades', toolkit: 'Com o que trabalho.',
      skillsIntro: 'As capacidades e ferramentas que uso para transformar ideias em produtos funcionais.', aiAutomation: 'IA e automação', architectureBackend: 'Arquitetura e backend', frontend: 'Frontend', cloudData: 'Cloud e dados',
      aiAgents: 'Agentes de IA', conversationalContext: 'Contexto conversacional', agenticDevelopment: 'Fluxos de desenvolvimento baseados em agentes', eventDriven: 'Arquitetura orientada a eventos',
      spoken: 'Idiomas', spanish: 'Espanhol (nativo)', english: 'Inglês C1', portuguese: 'Português (básico)',
      contactKicker: '02 / Contato', connect: 'Vamos conversar.', contactIntro: 'Você pode me encontrar por estes canais.', email: 'E-mail →',
      externalNote: 'LinkedIn, GitHub e WhatsApp abrem em uma nova aba.',
      title: 'Gabriel Perotti — Engenheiro de IA | Arquiteto de Software | Desenvolvedor Full Stack Sênior',
      description: 'Gabriel Perotti — Engenheiro de IA, Arquiteto de Software e Desenvolvedor Full Stack Sênior. Mais de 25 anos transformando necessidades de negócio em SaaS, automação e sistemas integrados.',
      socialDescription: 'Das necessidades de negócio à produção: plataformas SaaS, agentes de IA e integração de sistemas.'
    },
    es: {
      bitoTitle: 'Asistente Bito', bitoChat: 'Conversá con Bito', bitoLoading: 'Cargando Bito…', bitoError: 'No se pudo cargar Bito. Inténtalo de nuevo.', bitoRetry: 'Reintentar',
      profileHeading: 'perfil', skip: 'Saltar al contenido', navigation: 'Navegación principal', about: 'Sobre mí', skills: 'Habilidades', contact: 'Contacto', language: 'Idioma',
      lightTheme: 'Tema claro', darkTheme: 'Tema oscuro', themeLabel: 'Usar tema claro',
      eyebrow: 'Productos de software · Inteligencia artificial', role: 'Ingeniero de IA | Arquitecto de Software | Desarrollador Full Stack Senior',
      intro: 'Transformo necesidades de negocio en productos de software: desde la arquitectura hasta la puesta en producción. Combino más de 25 años de experiencia con desarrollo full stack e inteligencia artificial para construir plataformas SaaS, automatizar procesos e integrar sistemas.',
      resume: 'Ver currículum ↗', getInTouch: 'Contactame →', pdfNote: 'PDF en inglés · Se abre en una pestaña nueva', profile: 'Perfil del desarrollador',
      focusProducts: 'Productos SaaS y plataformas multi-tenant', focusAgents: 'Agentes de IA conectados con herramientas y procesos de negocio', focusProduction: 'Arquitectura, desarrollo e infraestructura de producción',
      approach: 'Necesidades de negocio → Arquitectura → Desarrollo → Producción', skillsKicker: '01 / Habilidades', toolkit: 'Con qué trabajo.',
      skillsIntro: 'Las capacidades y herramientas que uso para convertir ideas en productos funcionales.', aiAutomation: 'IA y automatización', architectureBackend: 'Arquitectura y backend', frontend: 'Frontend', cloudData: 'Cloud y datos',
      aiAgents: 'Agentes de IA', conversationalContext: 'Contexto conversacional', agenticDevelopment: 'Flujos de desarrollo basados en agentes', eventDriven: 'Arquitectura orientada a eventos',
      spoken: 'Idiomas', spanish: 'Español (nativo)', english: 'Inglés C1', portuguese: 'Portugués (básico)',
      contactKicker: '02 / Contacto', connect: 'Conversemos.', contactIntro: 'Podés encontrarme por estos canales.', email: 'Correo →',
      externalNote: 'LinkedIn, GitHub y WhatsApp se abren en una pestaña nueva.',
      title: 'Gabriel Perotti — Ingeniero de IA | Arquitecto de Software | Desarrollador Full Stack Senior',
      description: 'Gabriel Perotti — Ingeniero de IA, Arquitecto de Software y Desarrollador Full Stack Senior. Más de 25 años transformando necesidades de negocio en SaaS, automatización y sistemas integrados.',
      socialDescription: 'De las necesidades de negocio a producción: plataformas SaaS, agentes de IA e integración de sistemas.'
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
