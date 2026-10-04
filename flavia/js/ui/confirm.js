/*
 * Confirmación antes de borrar.
 *
 * Se usa un modal propio (no window.confirm) para que el texto pueda explicar
 * qué se va a perder y para que se vea igual en todos los navegadores.
 */
(function (global) {
  'use strict';

  var Impresion = global.Impresion || (global.Impresion = {});
  var Dom = Impresion.Dom;

  var ui = null;
  var pendingResolve = null;

  function build() {
    if (ui) return ui;

    var messageEl = Dom.el('p', { class: 'confirm__message' });
    var acceptBtn = Dom.el('button', { type: 'button', class: 'btn btn--danger', text: 'Eliminar' });
    var cancelBtn = Dom.el('button', { type: 'button', class: 'btn', text: 'Cancelar' });

    var dialog = Dom.el('div', {
      class: 'confirm',
      role: 'dialog',
      'aria-modal': 'true'
    }, [
      Dom.el('div', { class: 'confirm__box' }, [
        Dom.el('h2', { class: 'confirm__title' }),
        messageEl,
        Dom.el('div', { class: 'confirm__actions' }, [cancelBtn, acceptBtn])
      ])
    ]);

    document.body.appendChild(dialog);

    function close(result) {
      dialog.classList.remove('is-open');
      if (pendingResolve) {
        var resolve = pendingResolve;
        pendingResolve = null;
        resolve(result);
      }
    }

    acceptBtn.addEventListener('click', function () { close(true); });
    cancelBtn.addEventListener('click', function () { close(false); });
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) close(false);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && dialog.classList.contains('is-open')) close(false);
    });

    ui = { dialog: dialog, messageEl: messageEl, titleEl: dialog.querySelector('.confirm__title'), acceptBtn: acceptBtn };
    return ui;
  }

  Impresion.Confirm = {
    ask: function (message, options) {
      var config = options || {};
      var parts = build();

      parts.titleEl.textContent = config.title || 'Confirmar';
      parts.messageEl.textContent = message;
      parts.acceptBtn.textContent = config.acceptLabel || 'Eliminar';
      parts.dialog.classList.add('is-open');
      parts.acceptBtn.focus();

      return new Promise(function (resolve) {
        pendingResolve = resolve;
      });
    }
  };
})(window);