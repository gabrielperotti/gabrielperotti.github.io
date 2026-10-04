/*
 * Valores por defecto del trabajo tipo Texto.
 *
 * Un solo bloque de texto sobre la hoja: sirve para un cartel, un rótulo, una
 * tarjeta o una frase grande. Todo se guarda en milímetros, igual que en
 * mosaico, y el texto no lleva imágenes.
 */
(function (global) {
  'use strict';

  var Impresion = global.Impresion || (global.Impresion = {});
  var U = Impresion.Units;

  /*
   * Fuentes sin archivos externos: la app tiene que funcionar sin internet y
   * abriendo el archivo con doble clic. Son pilhas de fuentes que ya están en
   * el sistema; cómo se ven exactamente depende de la computadora donde se
   * imprime.
   */
  var FONTS = [
    {
      id: 'sans',
      label: 'Sans (limpia)',
      stack: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif'
    },
    {
      id: 'serif',
      label: 'Serif (clásica)',
      stack: 'Georgia, "Times New Roman", Times, serif'
    },
    {
      id: 'mono',
      label: 'Mono (fija)',
      stack: '"Courier New", Courier, monospace'
    },
    {
      id: 'display',
      label: 'Display (contundente)',
      stack: 'Impact, "Arial Black", "Haettenschweiler", sans-serif'
    },
    {
      id: 'script',
      label: 'Script (manuscrita)',
      stack: '"Brush Script MT", "Segoe Script", "Comic Sans MS", cursive'
    }
  ];

  var ALIGN = [
    { id: 'left', label: 'Izquierda' },
    { id: 'center', label: 'Centro' },
    { id: 'right', label: 'Derecha' }
  ];

  var VERTICAL_ALIGN = [
    { id: 'top', label: 'Arriba' },
    { id: 'middle', label: 'Centro' },
    { id: 'bottom', label: 'Abajo' }
  ];

  var BORDER_STYLES = [
    { id: 'solid', label: 'Sólido' },
    { id: 'dotted', label: 'Punteado' },
    { id: 'dashed', label: 'Discontinuo' }
  ];

  var ROTATIONS = [
    { id: '0', label: 'Horizontal' },
    { id: '90', label: 'Vertical' },
    { id: '180', label: 'Invertida' },
    { id: '270', label: 'Vertical al revés' }
  ];

  var Impresion = global.Impresion || (global.Impresion = {});
  Impresion.Texto = Impresion.Texto || {};

  Impresion.Texto.Defaults = {
    FONTS: FONTS,
    ALIGN: ALIGN,
    VERTICAL_ALIGN: VERTICAL_ALIGN,
    BORDER_STYLES: BORDER_STYLES,
    ROTATIONS: ROTATIONS,

    createParams: function () {
      return {
        content: 'Tu texto',
        widthMm: 150,
        heightMm: 40,
        offsetXMm: 0,
        offsetYMm: 0,
        fontFamily: 'sans',
        fontSizeMm: 12,
        bold: false,
        italic: false,
        uppercase: false,
        align: 'center',
        verticalAlign: 'middle',
        letterSpacingMm: 0,
        lineHeight: 1.2,
        rotation: 0,
        color: '#141414',
        background: '', // vacío = sin fondo de color
        border: {
          enabled: false,
          widthMm: 0.3,
          color: '#141414',
          style: 'solid'
        }
      };
    },

    // Pila de CSS de la fuente elegida.
    fontStack: function (fontId) {
      var found = FONTS.filter(function (font) { return font.id === fontId; })[0];
      return found ? found.stack : FONTS[0].stack;
    },

    // Sin márgenes propios: el bloque se centra en la hoja y se mueve con los
    // desplazamientos, que para un solo elemento cumplen el mismo papel.
    getMarginsMm: function () {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    },

    normalizeRotation: function (value) {
      var rotation = Math.round(U.toNumber(value, 0)) % 360;
      if (rotation < 0) rotation += 360;
      return rotation === 0 || rotation === 90 || rotation === 180 || rotation === 270 ? rotation : 0;
    }
  };
})(window);