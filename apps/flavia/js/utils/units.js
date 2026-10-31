/*
 * Conversión de unidades.
 *
 * Regla de la aplicación: TODO el cálculo interno trabaja en milímetros (mm).
 * La interfaz muestra cm para dimensiones, separaciones y márgenes, y mm para
 * el grosor del borde (que necesita más precisión).
 */
(function (global) {
  'use strict';

  var MM_PER_CM = 10;

  function toNumber(value, fallback) {
    var parsed = parseFloat(value);
    if (isFinite(parsed)) return parsed;
    return fallback === undefined ? 0 : fallback;
  }

  function round(value, decimals) {
    var factor = Math.pow(10, decimals);
    return Math.round(toNumber(value) * factor) / factor;
  }

  var Impresion = global.Impresion || (global.Impresion = {});

  Impresion.Units = {
    MM_PER_CM: MM_PER_CM,

    toNumber: toNumber,

    round: round,

    cmToMm: function (cm) {
      return toNumber(cm) * MM_PER_CM;
    },

    mmToCm: function (mm) {
      return round(toNumber(mm) / MM_PER_CM, 2);
    },

    // Número redondeado con los decimales indicados (0.3 -> 0.3, 40 -> 40).
    mmToFixed: function (mm, decimals) {
      return round(toNumber(mm), decimals === undefined ? 2 : decimals);
    },

    // Texto listo para un <input type="number">: sin ceros inútiles ("4", no "4.00").
    toInputValue: function (value) {
      return String(round(toNumber(value), 3));
    }
  };
})(window);