/*
 * Persistencia de datos livianos en localStorage.
 *
 * Se guarda: eventos, trabajos, parámetros y la selección actual.
 * Las escrituras son "debounced" para no escribir en cada tecla, pero se
 * vacían al cerrar o recargar la pestaña.
 */
(function (global) {
  'use strict';

  var Impresion = global.Impresion || (global.Impresion = {});

  var PREFIX = 'impresion.v1.';
  var DELAY_MS = 150;

  var pending = {};
  var timer = null;

  function fullKey(name) {
    return PREFIX + name;
  }

  function flush() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    var batch = pending;
    pending = {};
    Object.keys(batch).forEach(function (name) {
      try {
        global.localStorage.setItem(fullKey(name), JSON.stringify(batch[name]));
      } catch (error) {
        console.warn('No se pudo guardar "' + name + '" en localStorage:', error);
      }
    });
  }

  var LocalStorage = {
    read: function (name, fallback) {
      try {
        var raw = global.localStorage.getItem(fullKey(name));
        if (raw === null) return fallback;
        return JSON.parse(raw);
      } catch (error) {
        console.warn('No se pudo leer "' + name + '" de localStorage:', error);
        return fallback;
      }
    },

    write: function (name, value) {
      pending[name] = value;
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(flush, DELAY_MS);
    },

    remove: function (name) {
      delete pending[name];
      try {
        global.localStorage.removeItem(fullKey(name));
      } catch (error) {
        console.warn('No se pudo borrar "' + name + '" de localStorage:', error);
      }
    },

    // Fuerza la escritura inmediata (F5 justo después de un cambio).
    flush: flush
  };

  global.addEventListener('pagehide', flush);
  global.addEventListener('beforeunload', flush);

  Impresion.LocalStorage = LocalStorage;
})(window);