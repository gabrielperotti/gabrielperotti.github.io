/*
 * Arranque y cableado.
 *
 * App = { store, images, toast, confirm }.
 * Acá se escuchan los cambios del store y se decide qué repintar.
 */
(function (global) {
  'use strict';

  var Impresion = global.Impresion;
  var Dom = Impresion.Dom;
  var Store = Impresion.Store;
  var JobTypes = Impresion.JobTypes;
  var Images = Impresion.ImageStore;
  var Confirm = Impresion.Confirm;
  var Toast = Impresion.Toast;
  var Preview = Impresion.Preview;
  var EventsPanel = Impresion.EventsPanel;
  var JobsPanel = Impresion.JobsPanel;

  var NEW_JOB_TYPE = 'mosaic'; // único tipo en esta versión

  var ctx = {
    store: Store,
    images: Images,
    toast: Toast,
    confirm: Confirm
  };

  var elements = {};
  var frameRequest = 0;

  // La previsualización se repinta una vez por frame: al mover un control no
  // se generan varias grillas por segundo.
  function schedulePreview() {
    if (frameRequest) return;
    frameRequest = global.requestAnimationFrame(function () {
      frameRequest = 0;
      Preview.render(Store.getSelectedJob(), ctx);
    });
  }

  function onStoreChange(scope) {
    if (scope === 'events') {
      EventsPanel.render(ctx);
      JobsPanel.render(ctx);
    } else if (scope === 'selection') {
      // Sólo mover la marca de selección: si se reconstruyera la lista, el
      // input de título que el usuario está escribiendo se destruiría.
      EventsPanel.updateSelection(ctx);
      JobsPanel.updateSelection(ctx);
    }

    if (scope === 'jobs') JobsPanel.render(ctx);

    // 'params' es el cambio en vivo: la hoja se repinta sola.
    if (scope === 'params' || scope === 'events' || scope === 'jobs' || scope === 'selection') {
      schedulePreview();
    }

    if (scope === 'jobs' || scope === 'selection' || scope === 'params') {
      var type = JobTypes.get((Store.getSelectedJob() || {}).type);
      if (type && type.renderForm) type.renderForm(elements.form, Store.getSelectedJob(), ctx);
    }
  }

  function onNewEvent() {
    Store.createEvent('Evento nuevo');
    var input = elements.eventList.querySelector('.is-selected .list-item__title');
    if (input) { input.focus(); input.select(); }
  }

  function onNewJob() {
    var event = Store.getSelectedEvent();
    if (!event) return;
    Store.createJob(event.id, NEW_JOB_TYPE);
    var input = elements.jobList.querySelector('.is-selected .list-item__title');
    if (input) { input.focus(); input.select(); }
  }

  function boot() {
    JobTypes.registerBuiltin();

    elements.eventList = document.getElementById('event-list');
    elements.jobList = document.getElementById('job-list');
    elements.jobsEmpty = document.getElementById('jobs-empty');
    elements.form = document.getElementById('job-form');

    EventsPanel.init({
      list: elements.eventList,
      empty: document.getElementById('events-empty')
    });

    JobsPanel.init({
      list: elements.jobList,
      empty: elements.jobsEmpty,
      createBtn: document.getElementById('new-job')
    });

    Preview.init({
      stage: document.getElementById('preview-stage'),
      frame: document.getElementById('preview-frame'),
      scaler: document.getElementById('preview-scaler'),
      sheet: document.getElementById('sheet'),
      printable: document.getElementById('sheet-printable'),
      zoomLabel: document.getElementById('preview-zoom')
    });

    document.getElementById('new-event').addEventListener('click', onNewEvent);
    document.getElementById('new-job').addEventListener('click', onNewJob);
    document.getElementById('print').addEventListener('click', function () { Preview.print(); });

    Store.init();
    Store.subscribe(onStoreChange);

    // Primer pintado.
    EventsPanel.render(ctx);
    JobsPanel.render(ctx);
    var type = JobTypes.get((Store.getSelectedJob() || {}).type);
    if (type && type.renderForm) type.renderForm(elements.form, Store.getSelectedJob(), ctx);
    Preview.render(Store.getSelectedJob(), ctx);

    // Si el navegador no deja guardar imágenes (al abrir el archivo con doble
    // clic) se avisa, pero la app sigue sirviendo para imprimir.
    Images.isAvailable().then(function (ok) {
      if (!ok) {
        Toast.show('Este navegador no permite guardar imágenes con file://. Se van a perder al recargar.', 6000);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);