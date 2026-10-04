/*
 * Render del tipo Texto sobre la hoja.
 *
 * Recibe el <div> del área imprimible (que en texto es toda la hoja, sin
 * márgenes) y dibuja un bloque de texto con medidas reales en mm.
 *
 * Igual que en mosaico, si el giro es 90 o 270 se invierte la caja antes de
 * rotar, para que el bloque siga ocupando exactamente lo que mide.
 */
(function (global) {
  'use strict';

  var Impresion = global.Impresion || (global.Impresion = {});
  var Texto = Impresion.Texto || (Impresion.Texto = {});
  var Dom = Impresion.Dom;
  var U = Impresion.Units;
  var Paper = Impresion.Paper;
  var Defaults = Texto.Defaults;

  function mm(value) {
    return U.mmToFixed(value, 3) + 'mm';
  }

  function buildBlock(params, pageMm) {
    var rotation = Defaults.normalizeRotation(params.rotation);
    var swapsSides = rotation === 90 || rotation === 270;

    var widthMm = Math.max(0, U.toNumber(params.widthMm, 0));
    var heightMm = Math.max(0, U.toNumber(params.heightMm, 0));
    var boxWidthMm = swapsSides ? heightMm : widthMm;
    var boxHeightMm = swapsSides ? widthMm : heightMm;

    // Centro de la hoja + desplazamiento pedido.
    var left = pageMm.widthMm / 2 + U.toNumber(params.offsetXMm, 0) - boxWidthMm / 2;
    var top = pageMm.heightMm / 2 + U.toNumber(params.offsetYMm, 0) - boxHeightMm / 2;

    var style = {
      width: mm(boxWidthMm),
      height: mm(boxHeightMm),
      left: mm(left),
      top: mm(top),
      fontFamily: Defaults.fontStack(params.fontFamily),
      fontSize: mm(params.fontSizeMm),
      lineHeight: U.toNumber(params.lineHeight, 1.2),
      letterSpacing: mm(params.letterSpacingMm),
      fontWeight: params.bold ? '700' : '400',
      fontStyle: params.italic ? 'italic' : 'normal',
      textTransform: params.uppercase ? 'uppercase' : 'none',
      textAlign: params.align || 'center',
      color: params.color || '#141414',
      transform: 'rotate(' + rotation + 'deg)'
    };

    if (params.background) style.background = params.background;

    var border = params.border;
    if (border && border.enabled && U.toNumber(border.widthMm, 0) > 0) {
      style.borderWidth = mm(border.widthMm);
      style.borderStyle = border.style || 'solid';
      style.borderColor = border.color || '#141414';
    }

    var inner = Dom.el('div', {
      class: 'text-block__inner',
      style: { justifyContent: verticalJustify(params.verticalAlign) }
    });
    inner.textContent = params.content || '';

    var block = Dom.el('div', {
      class: 'text-block' + ((params.content || '').trim() ? '' : ' text-block--empty'),
      style: style
    }, [inner]);

    return { block: block, inner: inner };
  }

  function verticalJustify(value) {
    if (value === 'top') return 'flex-start';
    if (value === 'bottom') return 'flex-end';
    return 'center';
  }

  function render(printableEl, job, ctx) {
    Dom.clear(printableEl);

    var params = job.params || {};
    var content = params.content || '';
    var pageMm = Paper.getPageMm((job.settings || {}).orientation);

    var built = buildBlock(params, pageMm);
    printableEl.appendChild(built.block);

    if (!content.trim()) return;

    // Si el texto no entra en el bloque se está cortando: se avisa en pantalla
    // (nunca en el papel) para que se note antes de imprimir.
    var overflows = built.inner.scrollHeight > built.inner.clientHeight + 1
      || built.inner.scrollWidth > built.inner.clientWidth + 1;
    if (overflows) {
      printableEl.appendChild(Dom.el('p', {
        class: 'sheet__hint',
        text: 'El texto no entra en el bloque y se está cortando.'
      }));
    }
  }

  Texto.Renderer = { render: render };
})(window);