/*
 * Valores por defecto del trabajo tipo Mosaico.
 *
 * Todos los tamaños se guardan en milímetros. La interfaz convierte a cm.
 * Al crear un trabajo se carga un "esqueleto" listo para ver y ajustar.
 */
(function (global) {
  'use strict';

  var Impresion = global.Impresion || (global.Impresion = {});
  var U = Impresion.Units;

  var SHAPES = [
    { id: 'original', label: 'Original / rectangular' },
    { id: 'square', label: 'Cuadrado' },
    { id: 'circle', label: 'Círculo' },
    { id: 'rounded', label: 'Esquinas redondeadas' }
  ];

  // Los nombres son para la persona que usa la herramienta; por dentro son
  // exactamente los valores de object-fit de CSS.
  var FITS = [
    { id: 'contain', label: 'Contener (entra entera)' },
    { id: 'cover', label: 'Cubrir (llena y recorta)' },
    { id: 'fill', label: 'Estirar (deforma)' },
    { id: 'original', label: 'Tamaño original' }
  ];

  var BORDER_STYLES = [
    { id: 'solid', label: 'Sólido' },
    { id: 'dotted', label: 'Punteado' },
    { id: 'dashed', label: 'Discontinuo' }
  ];

  Impresion.Mosaic = Impresion.Mosaic || {};
  Impresion.Mosaic.Defaults = {
    SHAPES: SHAPES,
    FITS: FITS,
    BORDER_STYLES: BORDER_STYLES,

    createParams: function () {
      return {
        shape: 'circle',
        sizeMm: U.cmToMm(4),          // diámetro (círculo) o lado (cuadrado)
        widthMm: U.cmToMm(4),         // ancho (rectangular / redondeada)
        heightMm: U.cmToMm(4),        // alto (rectangular / redondeada)
        radiusPct: 0,                 // radio de esquina en % (0 a 50)
        gapXMm: U.cmToMm(0.5),
        gapYMm: U.cmToMm(0.5),
        marginsMm: { top: 5, right: 5, bottom: 5, left: 5 },
        maxCount: 1000
      };
    }
  };
})(window);