/*
 * Render del mosaico dentro del área imprimible de la hoja.
 *
 * Recibe un elemento <div> ya posicionado y con el tamaño exacto del área
 * imprimible (lo define preview.js) y dibuja las piezas en milímetros reales.
 */
(function (global) {
  'use strict';

  var Impresion = global.Impresion || (global.Impresion = {});
  var Mosaic = Impresion.Mosaic || (Impresion.Mosaic = {});
  var Dom = Impresion.Dom;
  var U = Impresion.Units;
  var Calculator = Mosaic.Calculator;

  function mm(value) {
    return U.mmToFixed(value, 3) + 'mm';
  }

  // Los modos del formulario usan nombres propios para la persona que usa la
  // herramienta; acá se traducen a object-fit. "Tamaño original" equivale a
  // object-fit: none (la imagen no se escala y object-position la mueve).
  var OBJECT_FIT = {
    contain: 'contain',
    cover: 'cover',
    fill: 'fill',
    original: 'none'
  };

  function clampPercent(value) {
    return Math.min(50, Math.max(0, U.toNumber(value, 0)));
  }

  function normalizeRotation(value) {
    var rotation = Math.round(U.toNumber(value, 0)) % 360;
    return rotation < 0 ? rotation + 360 : rotation;
  }

  // La imagen va en una capa propia: al rotar 90/270 se invierte la caja para
  // que, después de girar, vuelva a ocupar exactamente la medida de la pieza.
  function buildLayer(job, pieceMm) {
    var image = job.image || {};
    var rotation = normalizeRotation(image.rotation);
    var swapsSides = rotation === 90 || rotation === 270;

    var layerMm = swapsSides
      ? { widthMm: pieceMm.heightMm, heightMm: pieceMm.widthMm }
      : { widthMm: pieceMm.widthMm, heightMm: pieceMm.heightMm };

    var layer = Dom.el('div', {
      class: 'piece__layer',
      style: {
        width: mm(layerMm.widthMm),
        height: mm(layerMm.heightMm),
        transform: 'translate(-50%, -50%) rotate(' + rotation + 'deg)'
      }
    });

    var img = Dom.el('img', {
      class: 'piece__img',
      alt: '',
      draggable: false,
      style: {
        objectFit: OBJECT_FIT[image.fit] || 'contain',
        objectPosition: U.toInputValue(image.positionX) + '% ' + U.toInputValue(image.positionY) + '%'
      }
    });
    layer.appendChild(img);

    return { layer: layer, img: img };
  }

  function buildPiece(job, layout, index, ctx) {
    var params = job.params;
    var image = job.image || {};

    var col = index % layout.cols;
    var row = Math.floor(index / layout.cols);

    var style = {
      width: mm(layout.piece.widthMm),
      height: mm(layout.piece.heightMm),
      left: mm(layout.offsetXMm + col * (layout.piece.widthMm + layout.gapXMm)),
      top: mm(layout.offsetYMm + row * (layout.piece.heightMm + layout.gapYMm))
    };

    if (params.shape === 'circle') {
      style.borderRadius = '50%';
    } else if (params.shape === 'rounded') {
      style.borderRadius = clampPercent(params.radiusPct) + '%';
    }

    var border = image.border;
    if (border && border.enabled && U.toNumber(border.widthMm, 0) > 0) {
      style.borderWidth = mm(border.widthMm);
      style.borderStyle = border.style || 'solid';
      style.borderColor = border.color || '#000000';
    }

    var piece = Dom.el('div', { class: 'piece piece--' + params.shape, style: style });
    var built = buildLayer(job, layout.piece);
    piece.appendChild(built.layer);

    if (job.imageId) {
      attachImage(built.img, job.imageId, ctx);
    } else {
      piece.appendChild(Dom.el('div', { class: 'piece__placeholder' }));
    }

    return piece;
  }

  // El <img> se crea sin src para que el pintado nunca espere: apenas está la
  // URL en caché se la asignamos, y si no, se asigna cuando llega.
  function attachImage(img, imageId, ctx) {
    var url = ctx.images.getUrlSync(imageId);
    if (url) {
      img.src = url;
      return;
    }
    ctx.images.load(imageId).then(function (resolved) {
      if (resolved) img.src = resolved;
    });
  }

  function render(printableEl, job, ctx) {
    Dom.clear(printableEl);
    if (!job) return;

    var layout = Calculator.calculate(job);

    if (layout.total === 0) {
      printableEl.appendChild(Dom.el('p', {
        class: 'sheet__hint',
        text: layout.fits
          ? 'La cantidad máxima está en 0.'
          : 'La pieza no entra en el área imprimible. Revisá medidas y márgenes.'
      }));
      return;
    }

    var fragment = document.createDocumentFragment();
    for (var index = 0; index < layout.total; index++) {
      fragment.appendChild(buildPiece(job, layout, index, ctx));
    }
    printableEl.appendChild(fragment);
  }

  Mosaic.Renderer = { render: render };
})(window);