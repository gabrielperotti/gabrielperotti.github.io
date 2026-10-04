/*
 * Formulario del trabajo tipo Texto.
 *
 * Igual que en mosaico: los controles escriben directo en el trabajo y la
 * previsualización se entera sola. El formulario sólo se reconstruye cuando
 * cambia la estructura (de qué trabajo se trata, si hay fondo, si hay borde);
 * el resto actualiza el resumen en vivo para no romper el cursor.
 */
(function (global) {
  'use strict';

  var Impresion = global.Impresion || (global.Impresion = {});
  var Texto = Impresion.Texto || (Impresion.Texto = {});
  var Dom = Impresion.Dom;
  var F = Impresion.Fields;
  var U = Impresion.Units;
  var Paper = Impresion.Paper;
  var Defaults = Texto.Defaults;

  var summaryEl = null;
  var mounted = { jobId: null, structure: null };

  // Devuelve el callback que escribe un parámetro del trabajo.
  function setParam(job, ctx, field) {
    return function (value) {
      ctx.store.updateJobParams(job.id, function (draft) { draft[field] = value; });
    };
  }

  /* ------------------------------------------------------------------ texto */

  function buildTextGroup(job, ctx) {
    return F.group('Texto', [
      F.textareaField({
        label: 'Contenido',
        rows: 4,
        value: job.params.content,
        focusKey: 'texto-content',
        onInput: setParam(job, ctx, 'content')
      }),
      Dom.el('p', {
        class: 'field__hint',
        text: 'Se puede escribir varias líneas. El tamaño de la fuente se mide en mm.'
      })
    ]);
  }

  /* -------------------------------------------------------------- tipografía */

  function buildFontGroup(job, ctx) {
    var params = job.params;

    return F.group('Tipografía', [
      F.row([
        F.selectField({
          label: 'Fuente',
          options: Defaults.FONTS,
          value: params.fontFamily,
          focusKey: 'texto-font',
          onChange: setParam(job, ctx, 'fontFamily')
        }),
        F.mmField({
          label: 'Tamaño',
          mm: params.fontSizeMm,
          min: 1,
          focusKey: 'texto-size',
          onInput: setParam(job, ctx, 'fontSizeMm')
        })
      ]),
      F.row([
        F.colorField({
          label: 'Color',
          value: params.color,
          focusKey: 'texto-color',
          onInput: setParam(job, ctx, 'color')
        }),
        F.mmField({
          label: 'Entre letras',
          mm: params.letterSpacingMm,
          focusKey: 'texto-letter-spacing',
          onInput: setParam(job, ctx, 'letterSpacingMm')
        })
      ]),
      Dom.el('div', { class: 'chip-group' }, [
        F.checkbox({ label: 'Negrita', checked: params.bold, onChange: setParam(job, ctx, 'bold') }),
        F.checkbox({ label: 'Cursiva', checked: params.italic, onChange: setParam(job, ctx, 'italic') }),
        F.checkbox({ label: 'MAYÚSCULAS', checked: params.uppercase, onChange: setParam(job, ctx, 'uppercase') })
      ]),
      F.sliderField({
        label: 'Interlineado',
        min: 0.8,
        max: 2.5,
        step: 0.05,
        value: params.lineHeight,
        focusKey: 'texto-line-height',
        format: function (value) { return String(value); },
        onInput: setParam(job, ctx, 'lineHeight')
      })
    ]);
  }

  /* ----------------------------------------------------- alineación y posición */

  function buildAlignGroup(job, ctx) {
    var params = job.params;

    return F.group('Alineación y orientación', [
      F.radioGroup({
        label: 'Horizontal',
        options: Defaults.ALIGN,
        value: params.align,
        onChange: setParam(job, ctx, 'align')
      }),
      F.radioGroup({
        label: 'Vertical',
        options: Defaults.VERTICAL_ALIGN,
        value: params.verticalAlign,
        onChange: setParam(job, ctx, 'verticalAlign')
      }),
      F.radioGroup({
        label: 'Orientación del texto',
        options: Defaults.ROTATIONS,
        value: String(Defaults.normalizeRotation(params.rotation)),
        onChange: function (value) {
          ctx.store.updateJobParams(job.id, function (draft) { draft.rotation = parseInt(value, 10); });
        }
      })
    ]);
  }

  /* ----------------------------------------------------------------- bloque */

  function buildBlockGroup(job, ctx) {
    var params = job.params;
    var hasBackground = !!params.background;

    var children = [
      F.row([
        F.mmField({
          label: 'Ancho',
          mm: params.widthMm,
          min: 1,
          focusKey: 'texto-width',
          onInput: setParam(job, ctx, 'widthMm')
        }),
        F.mmField({
          label: 'Alto',
          mm: params.heightMm,
          min: 1,
          focusKey: 'texto-height',
          onInput: setParam(job, ctx, 'heightMm')
        })
      ]),
      F.row([
        F.mmField({
          label: 'Mover ↔',
          mm: params.offsetXMm,
          hint: 'desde el centro',
          focusKey: 'texto-offset-x',
          onInput: setParam(job, ctx, 'offsetXMm')
        }),
        F.mmField({
          label: 'Mover ↕',
          mm: params.offsetYMm,
          hint: 'desde el centro',
          focusKey: 'texto-offset-y',
          onInput: setParam(job, ctx, 'offsetYMm')
        })
      ]),
      F.checkbox({
        label: 'Fondo de color',
        checked: hasBackground,
        onChange: function (enabled) {
          ctx.store.updateJobParams(job.id, function (draft) {
            draft.background = enabled ? (draft.background || '#ffe3ef') : '';
          });
        }
      })
    ];

    if (hasBackground) {
      children.push(F.colorField({
        label: 'Color del fondo',
        value: params.background,
        focusKey: 'texto-background',
        onInput: setParam(job, ctx, 'background')
      }));
    }

    children.push(F.borderGroup({
      title: 'Borde',
      focusPrefix: 'texto',
      styleOptions: Defaults.BORDER_STYLES,
      border: params.border,
      hint: 'El borde va incluido en la medida del bloque (medida exterior).',
      onChange: function (mutate) {
        ctx.store.updateJobParams(job.id, function (draft) { mutate(draft.border); });
      }
    }));

    return F.group('Bloque', children);
  }

  /* ---------------------------------------------------------------- resumen */

  function describe(job) {
    var params = job.params;
    var rotation = Defaults.normalizeRotation(params.rotation);

    var partes = [
      'Bloque de ' + U.mmToFixed(params.widthMm, 1) + ' × ' + U.mmToFixed(params.heightMm, 1) + ' mm',
      'fuente ' + U.mmToFixed(params.fontSizeMm, 1) + ' mm'
    ];

    if (rotation) partes.push('girado ' + rotation + '°');
    if (params.background) partes.push('con fondo');
    if (params.border && params.border.enabled) partes.push('con borde');
    if (!(params.content || '').trim()) partes.push('vacío: escribí un texto');

    return partes.join(' · ');
  }

  /* ------------------------------------------------------------- render API */

  function structureOf(job) {
    return [
      job.id,
      job.params.background ? 'fondo' : 'sin-fondo',
      job.params.border.enabled ? 'borde' : 'sin-borde'
    ].join('|');
  }

  function updateSummary(job) {
    if (summaryEl && summaryEl.isConnected) summaryEl.textContent = describe(job);
  }

  function render(container, job, ctx) {
    if (!job) {
      mounted = { jobId: null, structure: null };
      summaryEl = null;
      Dom.clear(container);
      container.appendChild(Dom.el('p', { class: 'empty', text: 'Elegí un trabajo para configurarlo.' }));
      return;
    }

    var structure = structureOf(job);
    // El isConnected importa: si el resumen ya no está en el documento (porque
    // se mostró el formulario de otro tipo y se vació el panel), hay que
    // reconstruir en vez de actualizar un nodo suelto.
    if (mounted.jobId === job.id && mounted.structure === structure
        && summaryEl && summaryEl.isConnected) {
      updateSummary(job);
      return;
    }
    mounted = { jobId: job.id, structure: structure };

    Dom.clear(container);

    summaryEl = Dom.el('p', { class: 'form-summary', text: describe(job) });
    container.appendChild(summaryEl);

    // Orientación de la hoja: ajuste común, no del tipo.
    container.appendChild(F.group('Hoja', [
      F.radioGroup({
        label: 'Orientación',
        options: Paper.ORIENTATIONS,
        value: job.settings.orientation,
        onChange: function (orientation) {
          ctx.store.updateJobSettings(job.id, { orientation: orientation });
        }
      })
    ]));

    [
      buildTextGroup(job, ctx),
      buildFontGroup(job, ctx),
      buildAlignGroup(job, ctx),
      buildBlockGroup(job, ctx)
    ].forEach(function (node) { container.appendChild(node); });
  }

  Texto.Form = { render: render };
})(window);