/*
 * Estado de la aplicación: eventos, trabajos y selección.
 *
 * Es la única fuente de verdad. Cada cambio notifica un "ámbito" para que la
 * interfaz repinte sólo lo necesario:
 *
 *   'events'    cambió la lista de eventos
 *   'jobs'      cambió la estructura de trabajos (alta, baja, duplicado)
 *   'params'    cambió un parámetro del trabajo (repintado en vivo)
 *   'selection' cambió el evento o trabajo seleccionado
 */
(function (global) {
  'use strict';

  var Impresion = global.Impresion || (global.Impresion = {});
  var LS = Impresion.LocalStorage;
  var Paper = Impresion.Paper;
  var JobTypes = Impresion.JobTypes;

  var KEYS = {
    events: 'events',
    jobs: 'jobs',
    selection: 'selection'
  };

  var state = { events: [], jobs: [], selection: { eventId: null, jobId: null } };
  var listeners = [];

  function newId(prefix) {
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function now() {
    return new Date().toISOString();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  /*
   * Orden de las listas: lo más nuevo primero.
   *
   * El desempate por posición de inserción importa: dos elementos creados en el
   * mismo milisegundo tienen el mismo createdAt, y con el desempate el último
   * agregado queda arriba, como se espera.
   */
  function newestFirst(list) {
    return list
      .map(function (item, index) { return { item: item, index: index }; })
      .sort(function (a, b) {
        if (a.item.createdAt !== b.item.createdAt) {
          return a.item.createdAt < b.item.createdAt ? 1 : -1;
        }
        return b.index - a.index;
      })
      .map(function (entry) { return entry.item; });
  }

  function notify(scope) {
    listeners.slice().forEach(function (listener) { listener(scope); });
  }

  function saveEvents() { LS.write(KEYS.events, state.events); }
  function saveJobs() { LS.write(KEYS.jobs, state.jobs); }
  function saveSelection() { LS.write(KEYS.selection, state.selection); }

  function findEvent(id) {
    return state.events.filter(function (item) { return item.id === id; })[0] || null;
  }

  function findJob(id) {
    return state.jobs.filter(function (item) { return item.id === id; })[0] || null;
  }

  function jobsOf(eventId) {
    return newestFirst(state.jobs.filter(function (job) { return job.eventId === eventId; }));
  }

  // Al cargar: descartar referencias que ya no existen (no debería pasar, pero
  // evita que un estado viejo rompa la app).
  function reconcile() {
    var eventIds = {};
    state.events.forEach(function (item) { eventIds[item.id] = true; });
    state.jobs = state.jobs.filter(function (job) { return !!eventIds[job.eventId]; });

    if (!findEvent(state.selection.eventId)) state.selection.eventId = null;
    var selected = findJob(state.selection.jobId);
    if (!selected || selected.eventId !== state.selection.eventId) state.selection.jobId = null;

    // Sin selección guardada se elige el evento más reciente, que es lo primero
    // que se ve en la lista.
    if (!state.selection.eventId) {
      var ordered = newestFirst(state.events);
      state.selection.eventId = ordered.length ? ordered[0].id : null;
    }
    // OJO: acá NO se elige ningún trabajo. Si no hay uno seleccionado, la
    // configuración queda limpia y la hoja en blanco, hasta que el usuario
    // elija uno explícitamente.
  }

  var Store = {
    init: function () {
      var events = LS.read(KEYS.events, []);
      var jobs = LS.read(KEYS.jobs, []);
      var selection = LS.read(KEYS.selection, { eventId: null, jobId: null });

      state.events = Array.isArray(events) ? events : [];
      state.jobs = Array.isArray(jobs) ? jobs : [];
      state.selection = {
        eventId: selection && selection.eventId ? selection.eventId : null,
        jobId: selection && selection.jobId ? selection.jobId : null
      };
      reconcile();
    },

    subscribe: function (listener) {
      listeners.push(listener);
      return function () {
        var index = listeners.indexOf(listener);
        if (index !== -1) listeners.splice(index, 1);
      };
    },

    /* ------------------------------------------------------------ lectura */

    getState: function () { return state; },

    getEvents: function () { return newestFirst(state.events); },

    getEvent: findEvent,

    getJobs: jobsOf,

    getJob: findJob,

    getSelectedEvent: function () { return findEvent(state.selection.eventId); },

    getSelectedJob: function () { return findJob(state.selection.jobId); },

    /* ----------------------------------------------------------- eventos */

    createEvent: function (title) {
      var event = {
        id: newId('evt'),
        title: title || 'Evento nuevo',
        createdAt: now()
      };
      state.events.push(event);
      saveEvents();
      Store.selectEvent(event.id);
      notify('events');
      return event;
    },

    renameEvent: function (id, title) {
      var event = findEvent(id);
      if (!event) return;
      event.title = title;
      saveEvents();
      // Ámbito aparte de 'events' a propósito: renombrar no cambia la lista,
      // y re-renderizarla destruiría el input que se está escribiendo.
      notify('event-title');
    },

    // Devuelve los imageIds que quedaron huérfanos para que la app los borre.
    deleteEvent: function (id) {
      var removed = state.jobs.filter(function (job) { return job.eventId === id; });
      state.jobs = state.jobs.filter(function (job) { return job.eventId !== id; });
      state.events = state.events.filter(function (event) { return event.id !== id; });

      if (state.selection.eventId === id) {
        state.selection.eventId = null;
        state.selection.jobId = null;
      }

      saveEvents();
      saveJobs();
      saveSelection();
      reconcile();

      var orphanIds = Store.unreferencedImageIds(removed.map(function (job) { return job.imageId; }));
      notify('events');
      notify('jobs');
      return orphanIds;
    },

    /* ---------------------------------------------------------- trabajos */

    createJob: function (eventId, typeId) {
      var type = JobTypes.get(typeId);
      if (!type) {
        console.warn('Tipo de trabajo desconocido:', typeId);
        return null;
      }
      var job = {
        id: newId('job'),
        eventId: eventId,
        // El tipo ya se eligió en el selector, así que el nombre por defecto lo
        // dice y el usuario lo renombra.
        title: type.label,
        type: typeId,
        settings: Paper.newSettings(),
        imageId: null,
        image: Paper.newImageSettings(),
        params: clone(type.createDefaults()),
        createdAt: now(),
        updatedAt: now()
      };
      state.jobs.push(job);
      saveJobs();
      Store.selectJob(job.id);
      notify('jobs');
      return job;
    },

    updateJobTitle: function (id, title) {
      var job = findJob(id);
      if (!job) return;
      job.title = title;
      job.updatedAt = now();
      saveJobs();
      notify('job-title');
    },

    updateJobParams: function (id, mutator) {
      var job = findJob(id);
      if (!job) return;
      mutator(job.params);
      job.updatedAt = now();
      saveJobs();
      notify('params');
    },

    updateJobImage: function (id, mutator) {
      var job = findJob(id);
      if (!job) return;
      mutator(job.image);
      job.updatedAt = now();
      saveJobs();
      notify('params');
    },

    updateJobSettings: function (id, patch) {
      var job = findJob(id);
      if (!job) return;
      Object.keys(patch).forEach(function (key) { job.settings[key] = patch[key]; });
      job.updatedAt = now();
      saveJobs();
      notify('params');
    },

    setJobImage: function (id, imageId) {
      var job = findJob(id);
      if (!job) return;
      job.imageId = imageId;
      job.updatedAt = now();
      saveJobs();
      notify('params');
    },

    duplicateJob: function (id) {
      var original = findJob(id);
      if (!original) return null;

      var copy = clone(original);
      copy.id = newId('job');
      copy.title = original.title + ' - copia';
      copy.createdAt = now();
      copy.updatedAt = now();

      state.jobs.push(copy);
      saveJobs();
      Store.selectJob(copy.id);
      notify('jobs');
      return copy;
    },

    // Devuelve los imageIds que quedaron huérfanos para que la app los borre.
    deleteJob: function (id) {
      var job = findJob(id);
      if (!job) return [];

      state.jobs = state.jobs.filter(function (item) { return item.id !== id; });
      if (state.selection.jobId === id) state.selection.jobId = null;

      saveJobs();
      saveSelection();
      reconcile();

      var orphanIds = Store.unreferencedImageIds([job.imageId]);
      notify('jobs');
      return orphanIds;
    },

    // Cuáles de esos imageIds ya no usa ningún trabajo (importante al duplicar:
    // la copia comparte la imagen del original).
    unreferencedImageIds: function (ids) {
      var inUse = {};
      state.jobs.forEach(function (job) { if (job.imageId) inUse[job.imageId] = true; });
      return (ids || []).filter(function (id) { return !!id && !inUse[id]; });
    },

    /* --------------------------------------------------------- selección */

    // Elegir un proyecto deselecciona el trabajo: la configuración se limpia y la
    // hoja queda en blanco. El usuario elige el trabajo que quiere configurar.
    selectEvent: function (id) {
      state.selection.eventId = id;
      state.selection.jobId = null;
      saveSelection();
      notify('selection');
    },

    selectJob: function (id) {
      var job = findJob(id);
      if (!job) return;
      state.selection.jobId = job.id;
      state.selection.eventId = job.eventId;
      saveSelection();
      notify('selection');
    }
  };

  Impresion.Store = Store;
})(window);