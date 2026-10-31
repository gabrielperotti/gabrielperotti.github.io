/*
 * Cálculo del mosaico: cuántas piezas entran y dónde va cada una.
 *
 * No hay packing irregular: es una grilla rectangular que arranca en la esquina
 * superior izquierda del área imprimible y se centra si sobra espacio.
 *
 * La medida de la pieza es la medida EXTERNA (incluye el borde), porque el
 * renderer usa box-sizing: border-box.
 */
(function (global) {
  'use strict';

  var Impresion = global.Impresion || (global.Impresion = {});
  var Mosaic = Impresion.Mosaic || (Impresion.Mosaic = {});
  var U = Impresion.Units;
  var Paper = Impresion.Paper;

  var EPSILON = 1e-9;

  function nonNegative(value) {
    return Math.max(0, U.toNumber(value, 0));
  }

  // Medida externa de una pieza, según la forma elegida.
  function getPieceMm(params) {
    var shape = params.shape;
    var size = nonNegative(params.sizeMm);
    if (shape === 'circle' || shape === 'square') {
      return { widthMm: size, heightMm: size };
    }
    return { widthMm: nonNegative(params.widthMm), heightMm: nonNegative(params.heightMm) };
  }

  function getMarginsMm(params) {
    var margins = (params && params.marginsMm) || {};
    return {
      top: nonNegative(margins.top),
      right: nonNegative(margins.right),
      bottom: nonNegative(margins.bottom),
      left: nonNegative(margins.left)
    };
  }

  // Cuántas piezas de medida "pieceMm" entran en "usableMm" con separación "gapMm".
  function countInLine(usableMm, pieceMm, gapMm) {
    if (pieceMm <= 0 || usableMm <= 0) return 0;
    return Math.max(0, Math.floor((usableMm + gapMm) / (pieceMm + gapMm) + EPSILON));
  }

  function calculate(job) {
    var params = job.params || {};
    var page = Paper.getPageMm((job.settings || {}).orientation);
    var margins = getMarginsMm(params);

    var printable = {
      widthMm: Math.max(0, page.widthMm - margins.left - margins.right),
      heightMm: Math.max(0, page.heightMm - margins.top - margins.bottom)
    };

    var piece = getPieceMm(params);
    var gapXMm = nonNegative(params.gapXMm);
    var gapYMm = nonNegative(params.gapYMm);

    var cols = countInLine(printable.widthMm, piece.widthMm, gapXMm);
    var rows = countInLine(printable.heightMm, piece.heightMm, gapYMm);
    var capacity = cols * rows;

    var maxCount = Math.floor(nonNegative(params.maxCount));
    var total = capacity === 0 ? 0 : Math.min(capacity, maxCount);

    // Con el tope aplicado la última fila puede quedar incompleta: se centra
    // el bloque realmente usado, no la grilla completa.
    var shownCols = capacity === 0 ? 0 : Math.min(cols, total);
    var shownRows = cols === 0 ? 0 : Math.ceil(total / cols);
    var shownWidthMm = shownCols > 0
      ? shownCols * piece.widthMm + (shownCols - 1) * gapXMm
      : 0;
    var shownHeightMm = shownRows > 0
      ? shownRows * piece.heightMm + (shownRows - 1) * gapYMm
      : 0;

    return {
      page: page,
      margins: margins,
      printable: printable,
      piece: piece,
      gapXMm: gapXMm,
      gapYMm: gapYMm,
      cols: cols,
      rows: rows,
      capacity: capacity,
      total: total,
      limitedByMax: total > 0 && total < capacity,
      fits: piece.widthMm > 0
        && piece.heightMm > 0
        && piece.widthMm <= printable.widthMm + EPSILON
        && piece.heightMm <= printable.heightMm + EPSILON,
      offsetXMm: shownWidthMm > 0 ? (printable.widthMm - shownWidthMm) / 2 : 0,
      offsetYMm: shownHeightMm > 0 ? (printable.heightMm - shownHeightMm) / 2 : 0
    };
  }

  // Texto corto para el resumen en vivo del formulario.
  function describe(job) {
    var layout = calculate(job);
    if (layout.total === 0) {
      return 'Con estas medidas no entra ninguna pieza en la hoja.';
    }
    var text = 'Caben ' + layout.cols + ' × ' + layout.rows + ' = ' + layout.capacity + ' piezas. Se muestran ' + layout.total + '.';
    if (layout.limitedByMax) text += ' (limitado por “Cantidad máxima”).';
    return text;
  }

  Mosaic.Calculator = {
    calculate: calculate,
    describe: describe,
    getPieceMm: getPieceMm,
    getMarginsMm: getMarginsMm
  };
})(window);