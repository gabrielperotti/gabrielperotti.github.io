/*
 * Selector de tipo de trabajo.
 *
 * Aparece al pulsar "Nuevo trabajo" y lista los tipos que están registrados en
 * el código (js/jobs/job-types.js). Acá no se define ni se edita ningún tipo:
 * sólo se elige uno de los que ya existen. Agregar un tipo nuevo es escribir su
 * módulo y registrarlo; no se toca esta pantalla.
 */
(function (global) {
  'use strict';

  var Impresion = global.Impresion || (global.Impresion = {});
  var Dom = Impresion.Dom;
  var JobTypes = Impresion.JobTypes;

  var ui = null;
  var pendingResolve = null;

  function build() {
    if (ui) return ui;

    var listEl = Dom.el('div', { class: 'picker__list' });
    var closeBtn = Dom.el('button', {
      type: 'button',
      class: 'btn',
      text: 'Cancelar',
      on: { click: function () { close(null); } }
    });

    var dialog = Dom.el('div', { class: 'overlay picker', role: 'dialog', 'aria-modal': 'true' }, [
      Dom.el('div', { class: 'dialog picker__box' }, [
        Dom.el('h2', { class: 'dialog__title', text: 'Nuevo trabajo' }),
        Dom.el('p', { class: 'dialog__message', text: '¿Qué querés preparar?' }),
        listEl,
        Dom.el('div', { class: 'dialog__actions' }, [closeBtn])
      ])
    ]);

    document.body.appendChild(dialog);

    function close(typeId) {
      dialog.classList.remove('is-open');
      if (pendingResolve) {
        var resolve = pendingResolve;
        pendingResolve = null;
        resolve(typeId);
      }
    }

    closeBtn.addEventListener('click', function () { close(null); });
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) close(null);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && dialog.classList.contains('is-open')) close(null);
    });

    ui = { dialog: dialog, listEl: listEl };
    return ui;
  }

  function renderList() {
    var parts = build();
    Dom.clear(parts.listEl);

    JobTypes.list().forEach(function (type) {
      parts.listEl.appendChild(Dom.el('button', {
        type: 'button',
        class: 'picker__option',
        on: {
          click: function () {
            parts.dialog.classList.remove('is-open');
            if (pendingResolve) {
              var resolve = pendingResolve;
              pendingResolve = null;
              resolve(type.id);
            }
          }
        }
      }, [
        Dom.el('span', { class: 'picker__label', text: type.label }),
        Dom.el('span', { class: 'picker__description', text: type.description || '' })
      ]));
    });
  }

  Impresion.TypePicker = {
    // Devuelve el id del tipo elegido, o null si se cancela.
    open: function () {
      var parts = build();
      renderList();
      parts.dialog.classList.add('is-open');
      var firstOption = parts.listEl.querySelector('.picker__option');
      if (firstOption) firstOption.focus();

      return new Promise(function (resolve) { pendingResolve = resolve; });
    }
  };
})(window);