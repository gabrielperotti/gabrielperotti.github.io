/*
 * Zona de trabajos: lista los trabajos del evento seleccionado.
 *
 * Cada trabajo muestra título y tipo, y permite editar el título en el lugar,
 * duplicar y eliminar (con confirmación).
 */
(function (global) {
  'use strict';

  var Impresion = global.Impresion || (global.Impresion = {});
  var Dom = Impresion.Dom;
  var JobTypes = Impresion.JobTypes;
  var Confirm = Impresion.Confirm;

  var refs = null;

  function buildItem(job, ctx) {
    var isSelected = job.id === ctx.store.getState().selection.jobId;

    var titleInput = Dom.el('input', {
      class: 'list-item__title',
      value: job.title,
      'aria-label': 'Título del trabajo',
      'data-focus-key': 'job-title-' + job.id,
      on: {
        focus: function () { ctx.store.selectJob(job.id); },
        input: function (event) { ctx.store.updateJobTitle(job.id, event.target.value); }
      }
    });

    return Dom.el('li', {
      class: 'list-item' + (isSelected ? ' is-selected' : ''),
      on: { mousedown: function () { ctx.store.selectJob(job.id); } }
    }, [
      Dom.el('div', { class: 'list-item__main' }, [
        titleInput,
        Dom.el('span', { class: 'list-item__meta' }, [
          Dom.el('span', { class: 'badge', text: JobTypes.getLabel(job.type) }),
          job.imageId ? Dom.el('span', { class: 'badge badge--muted', text: 'con imagen' }) : null
        ])
      ]),
      Dom.el('div', { class: 'list-item__actions' }, [
        Dom.el('button', {
          type: 'button',
          class: 'icon-btn',
          title: 'Duplicar trabajo',
          'aria-label': 'Duplicar trabajo',
          text: '⧉',
          on: {
            click: function (event) {
              event.stopPropagation();
              ctx.store.duplicateJob(job.id);
            }
          }
        }),
        Dom.el('button', {
          type: 'button',
          class: 'icon-btn icon-btn--danger',
          title: 'Eliminar trabajo',
          'aria-label': 'Eliminar trabajo',
          text: '×',
          on: {
            click: function (event) {
              event.stopPropagation();
              Confirm.ask('Se va a eliminar el trabajo "' + (job.title || 'sin título') + '".', {
                title: 'Eliminar trabajo'
              }).then(function (confirmed) {
                if (!confirmed) return;
                var orphanIds = ctx.store.deleteJob(job.id);
                ctx.images.remove(orphanIds);
              });
            }
          }
        })
      ])
    ]);
  }

  function render(ctx) {
    if (!refs) return;

    var event = ctx.store.getSelectedEvent();
    Dom.clear(refs.empty);

    if (!event) {
      refs.createBtn.disabled = true;
      refs.empty.hidden = false;
      refs.empty.textContent = 'Elegí un evento para ver sus trabajos.';
      Dom.clear(refs.list);
      return;
    }

    refs.createBtn.disabled = false;

    var jobs = ctx.store.getJobs(event.id);

    Dom.keepFocus(refs.list, function () {
      Dom.clear(refs.list);
      jobs.forEach(function (job) { refs.list.appendChild(buildItem(job, ctx)); });
    });

    if (!jobs.length) {
      refs.empty.hidden = false;
      refs.empty.textContent = 'Este evento todavía no tiene trabajos.';
    } else {
      refs.empty.hidden = true;
    }
  }

  Impresion.JobsPanel = {
    init: function (elements) { refs = elements; },
    render: render
  };
})(window);