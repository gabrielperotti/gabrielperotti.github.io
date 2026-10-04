/*
 * Columna izquierda: lista de eventos/proyectos.
 *
 * El título se edita en el mismo lugar (input transparente) para no sumar un
 * paso extra. Escribir no repinta la lista, así que el cursor no se pierde.
 */
(function (global) {
  'use strict';

  var Impresion = global.Impresion || (global.Impresion = {});
  var Dom = Impresion.Dom;
  var Confirm = Impresion.Confirm;

  var refs = null;

  function formatDate(iso) {
    var date = new Date(iso);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }

  function buildItem(event, ctx) {
    var isSelected = event.id === ctx.store.getState().selection.eventId;
    var jobCount = ctx.store.getJobs(event.id).length;

    var titleInput = Dom.el('input', {
      class: 'list-item__title',
      value: event.title,
      'aria-label': 'Título del evento',
      'data-focus-key': 'event-title-' + event.id,
      on: {
        focus: function () { ctx.store.selectEvent(event.id); },
        input: function (inputEvent) {
          ctx.store.renameEvent(event.id, inputEvent.target.value);
        }
      }
    });

    var deleteBtn = Dom.el('button', {
      type: 'button',
      class: 'icon-btn icon-btn--danger',
      title: 'Eliminar evento',
      'aria-label': 'Eliminar evento',
      text: '×',
      on: {
        click: function (clickEvent) {
          clickEvent.stopPropagation();
          var jobs = ctx.store.getJobs(event.id).length;
          Confirm.ask(
            'Se va a eliminar "' + (event.title || 'sin título') + '"'
              + (jobs === 1 ? ' y su único trabajo.' : ' y sus ' + jobs + ' trabajos.')
              + (jobs ? ' Las imágenes usadas sólo en ese evento también se borran.' : ''),
            { title: 'Eliminar evento' }
          ).then(function (confirmed) {
            if (!confirmed) return;
            var orphanIds = ctx.store.deleteEvent(event.id);
            ctx.images.remove(orphanIds);
          });
        }
      }
    });

    return Dom.el('li', {
      class: 'list-item' + (isSelected ? ' is-selected' : ''),
      on: { mousedown: function () { ctx.store.selectEvent(event.id); } }
    }, [
      Dom.el('div', { class: 'list-item__main' }, [
        titleInput,
        Dom.el('span', {
          class: 'list-item__meta',
          text: formatDate(event.createdAt) + ' · ' + jobCount + (jobCount === 1 ? ' trabajo' : ' trabajos')
        })
      ]),
      deleteBtn
    ]);
  }

  function render(ctx) {
    if (!refs) return;
    var events = ctx.store.getEvents();
    var selectedEvent = ctx.store.getSelectedEvent();

    Dom.keepFocus(refs.list, function () {
      Dom.clear(refs.list);
      events.forEach(function (event) { refs.list.appendChild(buildItem(event, ctx)); });
    });

    Dom.clear(refs.empty);
    if (!events.length) {
      refs.empty.hidden = false;
      refs.empty.textContent = 'No hay eventos todavía. Creá el primero para empezar.';
    } else if (!selectedEvent) {
      refs.empty.hidden = false;
      refs.empty.textContent = 'Elegí un evento de la lista.';
    } else {
      refs.empty.hidden = true;
    }
  }

  Impresion.EventsPanel = {
    init: function (elements) { refs = elements; },
    render: render
  };
})(window);