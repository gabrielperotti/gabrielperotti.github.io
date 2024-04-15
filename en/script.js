// JavaScript para el cambio de modo oscuro basado en preferencias del sistema
document.addEventListener('DOMContentLoaded', function () {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    // Cambiar a modo oscuro
    document.body.classList.add('night');
  }
});

// Función para detectar cambios en las preferencias del sistema
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
  if (event.matches) {
    // Cambiar a modo oscuro
    document.body.classList.add('night');
  } else {
    // Cambiar a modo claro
    document.body.classList.remove('night');
  }
});
