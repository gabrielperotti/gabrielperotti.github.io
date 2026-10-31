/*
 * Imágenes en IndexedDB.
 *
 * Se guarda el archivo original tal cual (Blob), sin codificar en Base64.
 * Los trabajos sólo guardan el imageId, así dos trabajos pueden compartir la
 * misma imagen (por ejemplo al duplicar).
 *
 * Fallback: si IndexedDB no está disponible (algunos navegadores la bloquean al
 * abrir el archivo con doble clic) la imagen queda sólo en memoria y la app
 * avisa que no se conservará al recargar.
 */
(function (global) {
  'use strict';

  var Impresion = global.Impresion || (global.Impresion = {});

  var DB_NAME = 'impresion-db';
  var DB_VERSION = 1;
  var STORE = 'images';

  var dbPromise = null;
  var availability = null;
  var urls = {};      // imageId -> objectURL (caché para render sin esperas)
  var pending = {};   // imageId -> Promise<objectURL>
  var memory = {};    // imageId -> registro (respaldo en memoria)

  function openDb() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise(function (resolve, reject) {
      var request;
      try {
        request = global.indexedDB.open(DB_NAME, DB_VERSION);
      } catch (error) {
        reject(error);
        return;
      }
      request.onupgradeneeded = function () {
        var db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error); };
      request.onblocked = function () { reject(new Error('IndexedDB bloqueada')); };
    });

    return dbPromise;
  }

  function withStore(mode, action) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction = db.transaction(STORE, mode);
        var request = action(transaction.objectStore(STORE));
        transaction.oncomplete = function () { resolve(request ? request.result : undefined); };
        transaction.onerror = function () { reject(transaction.error); };
        transaction.onabort = function () { reject(transaction.error); };
      });
    });
  }

  function newId() {
    return 'img_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  // Medidas reales del archivo, para mostrarlas en la interfaz.
  function readSize(blob) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(blob);
      var probe = new Image();
      probe.onload = function () {
        URL.revokeObjectURL(url);
        resolve({ width: probe.naturalWidth, height: probe.naturalHeight });
      };
      probe.onerror = function () {
        URL.revokeObjectURL(url);
        resolve({ width: 0, height: 0 });
      };
      probe.src = url;
    });
  }

  var ImageStore = {
    // Promise<boolean>: permite avisarle al usuario si las imágenes no se guardan.
    isAvailable: function () {
      if (availability === null) {
        availability = openDb()
          .then(function () { return true; })
          .catch(function (error) {
            console.warn('IndexedDB no está disponible, las imágenes no se conservarán:', error);
            return false;
          });
      }
      return availability;
    },

    // Guarda el archivo y devuelve el registro con su id asignado.
    save: function (blob, meta) {
      return readSize(blob).then(function (size) {
        var record = {
          id: newId(),
          name: (meta && meta.name) || 'imagen',
          type: blob.type || '',
          size: blob.size,
          width: size.width,
          height: size.height,
          blob: blob,
          createdAt: new Date().toISOString()
        };

        return ImageStore.isAvailable()
          .then(function (ok) {
            if (!ok) return record;
            return withStore('readwrite', function (store) { return store.put(record); })
              .then(function () { return record; })
              .catch(function (error) {
                console.warn('La imagen quedó sólo en memoria:', error);
                return record;
              });
          })
          .then(function (saved) {
            memory[saved.id] = saved;
            return saved;
          });
      });
    },

    get: function (id) {
      if (!id) return Promise.resolve(null);
      if (memory[id]) return Promise.resolve(memory[id]);
      return withStore('readonly', function (store) { return store.get(id); })
        .then(function (record) { return record || null; })
        .catch(function (error) {
          console.warn('No se pudo leer la imagen:', error);
          return null;
        });
    },

    // URL cacheada en memoria: permite pintar la previsualización sin esperas.
    getUrlSync: function (id) {
      return (id && urls[id]) ? urls[id] : null;
    },

    load: function (id) {
      if (!id) return Promise.resolve(null);
      if (urls[id]) return Promise.resolve(urls[id]);
      if (pending[id]) return pending[id];

      pending[id] = ImageStore.get(id).then(function (record) {
        if (!record || !record.blob) return null;
        urls[id] = URL.createObjectURL(record.blob);
        return urls[id];
      }).catch(function (error) {
        console.warn('No se pudo cargar la imagen:', error);
        return null;
      });

      return pending[id];
    },

    // Sólo para imágenes que ya no referencia ningún trabajo.
    remove: function (ids) {
      var list = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
      if (!list.length) return Promise.resolve();

      list.forEach(function (id) {
        delete pending[id];
        delete memory[id];
        if (urls[id]) {
          URL.revokeObjectURL(urls[id]);
          delete urls[id];
        }
      });

      return ImageStore.isAvailable().then(function (ok) {
        if (!ok) return null;
        return withStore('readwrite', function (store) {
          list.forEach(function (id) { store.delete(id); });
          return null;
        });
      }).catch(function (error) {
        console.warn('No se pudieron borrar imágenes:', error);
      });
    }
  };

  Impresion.ImageStore = ImageStore;
})(window);