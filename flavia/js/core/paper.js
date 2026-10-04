/*
 * Papel y ajustes comunes a cualquier tipo de trabajo.
 *
 * En esta versión el único papel soportado es A4 (por decisión del proyecto).
 * Si más adelante se agrega otro tamaño, alcanza con agregarlo a SIZES.
 */
(function (global) {
  'use strict';

  var Impresion = global.Impresion || (global.Impresion = {});

  var SIZES = {
    A4: { widthMm: 210, heightMm: 297 }
  };

  var DEFAULT_PAPER = 'A4';

  var ORIENTATIONS = [
    { id: 'portrait', label: 'A4 vertical' },
    { id: 'landscape', label: 'A4 horizontal' }
  ];

  var Paper = {
    DEFAULT_PAPER: DEFAULT_PAPER,
    SIZES: SIZES,
    ORIENTATIONS: ORIENTATIONS,

    // Configuración de página que crea un trabajo nuevo.
    newSettings: function () {
      return { paper: DEFAULT_PAPER, orientation: 'portrait' };
    },

    // Ajustes de imagen compartidos por todos los tipos de trabajo.
    newImageSettings: function () {
      return {
        fit: 'contain',
        positionX: 50,
        positionY: 50,
        rotation: 0,
        border: {
          enabled: false,
          widthMm: 0.3,
          color: '#000000',
          style: 'solid'
        }
      };
    },

    getPageMm: function (orientation) {
      var size = SIZES[DEFAULT_PAPER];
      return orientation === 'landscape'
        ? { widthMm: size.heightMm, heightMm: size.widthMm }
        : { widthMm: size.widthMm, heightMm: size.heightMm };
    },

    getOrientationLabel: function (orientation) {
      var found = ORIENTATIONS.filter(function (item) { return item.id === orientation; })[0];
      return found ? found.label : ORIENTATIONS[0].label;
    }
  };

  Impresion.Paper = Paper;
})(window);