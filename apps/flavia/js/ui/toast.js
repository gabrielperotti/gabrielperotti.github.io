/*
 * Avisos efímeros (mensajes de validación, errores de imagen, etc).
 * Son sólo informativos: ningún dato depende de ellos.
 */
(function (global) {
  'use strict';

  var Impresion = global.Impresion || (global.Impresion = {});
  var Dom = Impresion.Dom;

  var node = null;
  var timer = null;

  function ensure() {
    if (node) return node;
    node = Dom.el('div', { class: 'toast no-print', role: 'status' });
    document.body.appendChild(node);
    return node;
  }

  Impresion.Toast = {
    show: function (message, duration) {
      var element = ensure();
      element.textContent = message;
      element.classList.add('is-visible');
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        element.classList.remove('is-visible');
      }, duration || 3200);
    }
  };
})(window);