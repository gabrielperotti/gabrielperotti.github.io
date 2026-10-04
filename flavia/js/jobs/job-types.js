/*
 * Registro de tipos de trabajo.
 *
 * Ésta es la pieza a tocar para agregar un tipo nuevo (Texto, Etiqueta,
 * Tarjeta, Composición...). Basta con crear su módulo con
 * createDefaults / renderForm / renderPrintable y registrarlo acá:
 *
 *   JobTypes.register({
 *     id: 'texto',
 *     label: 'Texto',
 *     createDefaults: Text.createParams,
 *     getMarginsMm: function (job) { return { top: 5, right: 5, bottom: 5, left: 5 }; },
 *     renderForm: Text.renderForm,
 *     renderPrintable: Text.renderPreview
 *   });
 *
 * El núcleo (hoja física, márgenes, impresión, persistencia) no se toca.
 *
 * Contrato de renderPrintable(printableEl, job, ctx):
 *   - printableEl ya está posicionado y mide el área imprimible, en mm.
 *   - El tipo dibuja dentro con unidades mm reales.
 *   - ctx = { store, images, toast }
 */
(function (global) {
  'use strict';

  var Impresion = global.Impresion || (global.Impresion = {});

  var registry = {};

  var JobTypes = {
    register: function (definition) {
      registry[definition.id] = definition;
    },

    get: function (id) {
      return registry[id] || null;
    },

    list: function () {
      return Object.keys(registry).map(function (id) { return registry[id]; });
    },

    getLabel: function (id) {
      return registry[id] ? registry[id].label : id;
    },

    // Registra los tipos que trae la aplicación.
    registerBuiltin: function () {
      var Mosaic = Impresion.Mosaic;

      JobTypes.register({
        id: 'mosaic',
        label: 'Mosaico',
        createDefaults: Mosaic.Defaults.createParams,
        getMarginsMm: function (job) { return Mosaic.Calculator.getMarginsMm(job.params); },
        renderForm: Mosaic.Form.render,
        renderPrintable: Mosaic.Renderer.render
      });
    }
  };

  Impresion.JobTypes = JobTypes;
})(window);