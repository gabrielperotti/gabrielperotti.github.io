/*
 * Zona de previsualización: dibuja la hoja física y prepara la impresión.
 *
 * La hoja se construye con medidas reales (mm). Para que entre en pantalla se
 * escala con transform: scale(); en impresión esa escala se anula (print.css),
 * así que lo que sale impreso mide exactamente lo mismo que en la pantalla.
 */
(function (global) {
  'use strict';

  var Impresion = global.Impresion || (global.Impresion = {});
  var Dom = Impresion.Dom;
  var U = Impresion.Units;
  var Paper = Impresion.Paper;
  var JobTypes = Impresion.JobTypes;

  var PAGE_STYLE_ID = 'print-page-size';
  var MAX_ZOOM = 1;

  var refs = null;

  function mm(value) {
    return U.mmToFixed(value, 3) + 'mm';
  }

  // @page no acepta variables CSS: se inyecta la regla según la orientación.
  function applyPageSize(orientation) {
    var style = document.getElementById(PAGE_STYLE_ID);
    if (!style) {
      style = Dom.el('style', { id: PAGE_STYLE_ID });
      document.head.appendChild(style);
    }
    style.textContent = '@page { size: ' + Paper.DEFAULT_PAPER + ' ' + orientation + '; margin: 0; }';
  }

  function updateZoom() {
    if (!refs) return;

    var naturalWidth = refs.sheet.offsetWidth;
    var naturalHeight = refs.sheet.offsetHeight;
    if (!naturalWidth || !naturalHeight) return;

    var style = getComputedStyle(refs.stage);
    var paddingX = U.toNumber(style.paddingLeft) + U.toNumber(style.paddingRight);
    var paddingY = U.toNumber(style.paddingTop) + U.toNumber(style.paddingBottom);
    var availableWidth = Math.max(120, refs.stage.clientWidth - paddingX);
    var availableHeight = Math.max(120, refs.stage.clientHeight - paddingY);

    var zoom = Math.min(availableWidth / naturalWidth, availableHeight / naturalHeight, MAX_ZOOM);
    zoom = Math.max(0.05, zoom);

    refs.scaler.style.transform = 'scale(' + zoom + ')';
    // El marco toma el tamaño YA escalado para que el scroll y el centrado
    // se comporten bien.
    refs.frame.style.width = Math.round(naturalWidth * zoom) + 'px';
    refs.frame.style.height = Math.round(naturalHeight * zoom) + 'px';
    refs.zoomLabel.textContent = Math.round(zoom * 100) + '%';
  }

  var Preview = {
    init: function (elements) {
      refs = elements;
      if (global.ResizeObserver) {
        new global.ResizeObserver(updateZoom).observe(refs.stage);
      } else {
        global.addEventListener('resize', updateZoom);
      }
    },

    render: function (job, ctx) {
      if (!refs) return;

      var page = Paper.getPageMm(job ? job.settings.orientation : 'portrait');
      applyPageSize(page.widthMm > page.heightMm ? 'landscape' : 'portrait');

      refs.sheet.style.width = mm(page.widthMm);
      refs.sheet.style.height = mm(page.heightMm);
      Dom.clear(refs.printable);

      if (job) {
        var type = JobTypes.get(job.type);
        if (type && type.renderPrintable) {
          var margins = type.getMarginsMm ? type.getMarginsMm(job) : { top: 0, right: 0, bottom: 0, left: 0 };
          refs.printable.style.top = mm(margins.top);
          refs.printable.style.left = mm(margins.left);
          refs.printable.style.width = mm(Math.max(0, page.widthMm - margins.left - margins.right));
          refs.printable.style.height = mm(Math.max(0, page.heightMm - margins.top - margins.bottom));
          type.renderPrintable(refs.printable, job, ctx);
        } else {
          refs.printable.appendChild(Dom.el('p', {
            class: 'sheet__hint',
            text: 'Este tipo de trabajo todavía no tiene previsualización.'
          }));
        }
      }

      updateZoom();
    },

    updateZoom: updateZoom,

    print: function () {
      global.print();
    }
  };

  Impresion.Preview = Preview;
})(window);