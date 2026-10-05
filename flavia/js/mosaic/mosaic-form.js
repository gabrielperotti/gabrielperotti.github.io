/*
 * Formulario de configuración del trabajo tipo Mosaico.
 *
 * Todos los controles escriben directo en el trabajo: no hay botón de
 * "Generar" ni "Aplicar". La previsualización se entera por el store.
 *
 * El formulario sólo se reconstruye cuando cambia algo estructural (forma de la
 * pieza, modo de ajuste, borde o de qué trabajo se trata). El resto de los
 * cambios actualizan un resumen en vivo, así el cursor nunca se pierde.
 */
(function (global) {
  'use strict';

  var Impresion = global.Impresion || (global.Impresion = {});
  var Mosaic = Impresion.Mosaic || (Impresion.Mosaic = {});
  var Dom = Impresion.Dom;
  var F = Impresion.Fields;
  var U = Impresion.Units;
  var Paper = Impresion.Paper;
  var Toast = Impresion.Toast;
  var Calculator = Mosaic.Calculator;
  var Defaults = Mosaic.Defaults;

  var summaryEl = null;
  var mounted = { jobId: null, structure: null };

    /* ---------------------------------------------------------------- Imagen */

  function buildImageGroup(job, ctx) {
    var jobId = job.id;
    var children = [];

    var fileInput = Dom.el('input', {
      type: 'file',
      accept: 'image/*',
      class: 'field-file',
      on: {
        change: function (event) {
          var input = event.target;
          var file = input.files && input.files[0];
          input.value = ''; // permite elegir otra vez el mismo archivo
          if (!file) return;
          if (file.type && file.type.indexOf('image/') !== 0) {
            Toast.show('Ese archivo no es una imagen.');
            return;
          }
          ctx.images.save(file, { name: file.name })
            .then(function (record) {
              var previous = ctx.store.getJob(jobId);
              var previousId = previous ? previous.imageId : null;
              ctx.store.setJobImage(jobId, record.id);
              // Si la imagen anterior ya no la usa ningún trabajo, se borra.
              ctx.images.remove(ctx.store.unreferencedImageIds([previousId]));
              Toast.show('Imagen cargada.');
            })
            .catch(function (error) {
              console.warn(error);
              Toast.show('No se pudo cargar la imagen.');
            });
        }
      }
    });

    children.push(F.row([
      fileInput,
      Dom.el('button', {
        type: 'button',
        class: 'btn btn--ghost',
        text: 'Quitar imagen',
        disabled: !job.imageId,
        on: {
          click: function () {
            var previousId = job.imageId;
            ctx.store.setJobImage(jobId, null);
            ctx.images.remove(ctx.store.unreferencedImageIds([previousId]));
          }
        }
      })
    ]));

    children.push(Dom.el('p', {
      class: 'field__hint',
      text: 'Se guarda en este dispositivo (IndexedDB). No se sube a ningún servidor.'
    }));

    if (job.imageId) {
      var thumb = Dom.el('img', { class: 'thumb__img', alt: '' });
      var cached = ctx.images.getUrlSync(job.imageId);
      if (cached) thumb.src = cached;
      else {
        ctx.images.load(job.imageId).then(function (url) {
          if (url && thumb.isConnected) thumb.src = url;
        });
      }

      var meta = Dom.el('p', { class: 'thumb__meta', text: 'Cargando…' });
      ctx.images.get(job.imageId).then(function (record) {
        if (!record || !meta.isConnected) return;
        meta.textContent = record.name + ' · ' + record.width + ' × ' + record.height + ' px · '
          + Math.max(1, Math.round(record.size / 1024)) + ' KB';
      });

      children.unshift(Dom.el('div', { class: 'thumb' }, [thumb, meta]));
    }

    return F.group('Imagen', children);
  }

  /* ------------------------------------------------------------------ Hoja */

  function buildPageGroup(job, ctx) {
    return F.group('Hoja', [
      F.radioGroup({
        label: 'Orientación',
        options: Paper.ORIENTATIONS,
        value: job.settings.orientation,
        onChange: function (orientation) { ctx.store.updateJobSettings(job.id, { orientation: orientation }); }
      }),
      Dom.el('p', {
        class: 'field__hint',
        text: 'Hoja ' + Paper.DEFAULT_PAPER + ' de '
          + Paper.getPageMm(job.settings.orientation).widthMm + ' × '
          + Paper.getPageMm(job.settings.orientation).heightMm + ' mm.'
      })
    ]);
  }

  /* ------------------------------------------------------- Forma de la pieza */

  function buildShapeGroup(job, ctx) {
    var params = job.params;
    var children = [F.radioGroup({
      label: 'Forma',
      options: Defaults.SHAPES,
      value: params.shape,
      onChange: function (shape) {
        ctx.store.updateJobParams(job.id, function (draft) { draft.shape = shape; });
      }
    })];

    if (params.shape === 'circle' || params.shape === 'square') {
      children.push(F.cmField({
        label: params.shape === 'circle' ? 'Diámetro' : 'Lado',
        mm: params.sizeMm,
        focusKey: 'mosaic-size',
        onInput: function (value) {
          ctx.store.updateJobParams(job.id, function (draft) { draft.sizeMm = value; });
        }
      }));
    } else {
      children.push(F.row([
        F.cmField({
          label: 'Ancho',
          mm: params.widthMm,
          focusKey: 'mosaic-width',
          onInput: function (value) {
            ctx.store.updateJobParams(job.id, function (draft) { draft.widthMm = value; });
          }
        }),
        F.cmField({
          label: 'Alto',
          mm: params.heightMm,
          focusKey: 'mosaic-height',
          onInput: function (value) {
            ctx.store.updateJobParams(job.id, function (draft) { draft.heightMm = value; });
          }
        })
      ]));

      if (params.shape === 'rounded') {
        children.push(F.sliderField({
          label: 'Redondeo de esquinas',
          min: 0,
          max: 50,
          value: params.radiusPct,
          focusKey: 'mosaic-radius',
          format: function (value) { return value + '%'; },
          onInput: function (value) {
            ctx.store.updateJobParams(job.id, function (draft) { draft.radiusPct = value; });
          }
        }));
      }
    }

    return F.group('Pieza', children);
  }

  /* ------------------------------------------------------- Ajuste de imagen */

  function buildFitGroup(job, ctx) {
    var image = job.image;
    var children = [F.radioGroup({
      label: 'Cómo entra la imagen',
      options: Defaults.FITS,
      value: image.fit,
      onChange: function (fit) {
        ctx.store.updateJobImage(job.id, function (draft) { draft.fit = fit; });
      }
    })];

    var positionDisabled = image.fit === 'fill';
    children.push(F.sliderField({
      label: 'Encuadre horizontal',
      min: 0,
      max: 100,
      value: image.positionX,
      disabled: positionDisabled,
      focusKey: 'mosaic-pos-x',
      format: function (value) { return value + '%'; },
      onInput: function (value) {
        ctx.store.updateJobImage(job.id, function (draft) { draft.positionX = value; });
      }
    }));
    children.push(F.sliderField({
      label: 'Encuadre vertical',
      min: 0,
      max: 100,
      value: image.positionY,
      disabled: positionDisabled,
      focusKey: 'mosaic-pos-y',
      format: function (value) { return value + '%'; },
      onInput: function (value) {
        ctx.store.updateJobImage(job.id, function (draft) { draft.positionY = value; });
      }
    }));

    if (positionDisabled) {
      children.push(Dom.el('p', {
        class: 'field__hint',
        text: 'El encuadre no aplica al estirar la imagen.'
      }));
    }

    if (image.fit === 'original') {
      children.push(Dom.el('p', {
        class: 'field__hint',
        text: 'La imagen entra sin escalar, con el tamaño del archivo. Si el archivo es de '
          + 'muchos píxeles, dentro de la pieza se ve sólo una parte.'
      }));
    }

    return F.group('Ajuste de imagen', children);
  }

  /* --------------------------------------------------------------- Rotación */

  function buildRotationGroup(job, ctx) {
    var rotation = U.toNumber(job.image.rotation, 0);

    var quickButtons = [0, 90, 180, 270].map(function (degrees) {
      return Dom.el('button', {
        type: 'button',
        class: 'btn btn--chip',
        text: degrees + '°',
        on: {
          click: function () {
            ctx.store.updateJobImage(job.id, function (draft) { draft.rotation = degrees; });
          }
        }
      });
    });

    return F.group('Rotación', [
      F.sliderField({
        label: 'Giro de la imagen',
        min: 0,
        max: 359,
        value: rotation,
        focusKey: 'mosaic-rotation',
        format: function (value) { return value + '°'; },
        onInput: function (value) {
          ctx.store.updateJobImage(job.id, function (draft) { draft.rotation = value; });
        }
      }),
      F.row(quickButtons)
    ]);
  }

  /* ----------------------------------------------------------------- Bordes */

  function buildBorderGroup(job, ctx) {
    return F.borderGroup({
      title: 'Borde de cada pieza',
      focusPrefix: 'mosaic',
      styleOptions: Defaults.BORDER_STYLES,
      border: job.image.border,
      hint: 'El borde va incluido en la medida de la pieza (medida exterior).',
      onChange: function (mutate) {
        ctx.store.updateJobImage(job.id, function (draft) { mutate(draft.border); });
      }
    });
  }

  /* --------------------------------------------------- Separación y márgenes */

  function buildSpacingGroup(job, ctx) {
    var params = job.params;
    return F.group('Separación entre piezas', [
      F.row([
        F.mmField({
          label: 'Horizontal',
          mm: params.gapXMm,
          focusKey: 'mosaic-gap-x',
          onInput: function (value) {
            ctx.store.updateJobParams(job.id, function (draft) { draft.gapXMm = value; });
          }
        }),
        F.mmField({
          label: 'Vertical',
          mm: params.gapYMm,
          focusKey: 'mosaic-gap-y',
          onInput: function (value) {
            ctx.store.updateJobParams(job.id, function (draft) { draft.gapYMm = value; });
          }
        })
      ])
    ]);
  }

  function buildMarginsGroup(job, ctx) {
    var margins = job.params.marginsMm;
    var field = function (label, key, focusKey) {
      return F.mmField({
        label: label,
        mm: margins[key],
        focusKey: focusKey,
        onInput: function (value) {
          ctx.store.updateJobParams(job.id, function (draft) { draft.marginsMm[key] = value; });
        }
      });
    };

    return F.group('Márgenes de la hoja', [
      F.row([field('Superior', 'top', 'margin-top'), field('Inferior', 'bottom', 'margin-bottom')]),
      F.row([field('Izquierdo', 'left', 'margin-left'), field('Derecho', 'right', 'margin-right')])
    ]);
  }

  function buildCountGroup(job, ctx) {
    return F.group('Cantidad máxima', [
      F.numberField({
        label: 'Tope de piezas en la hoja',
        min: 0,
        step: 1,
        value: job.params.maxCount,
        focusKey: 'mosaic-max-count',
        onInput: function (value) {
          ctx.store.updateJobParams(job.id, function (draft) { draft.maxCount = Math.round(value); });
        }
      }),
      Dom.el('p', {
        class: 'field__hint',
        text: 'Se colocan todas las piezas que entren en la hoja, hasta este tope.'
      })
    ]);
  }

  /* ------------------------------------------------------------- Render API */

  // Firma de lo que obliga a reconstruir el formulario.
  function structureOf(job) {
    return [
      job.id,
      job.params.shape,
      job.image.fit,
      job.image.border.enabled ? 'borde' : 'sin-borde',
      job.imageId || 'sin-imagen'
    ].join('|');
  }

  function updateSummary(job) {
    if (!summaryEl || !summaryEl.isConnected) return;
    summaryEl.textContent = Calculator.describe(job);
  }

  function render(container, job, ctx) {
    if (!job) {
      mounted = { jobId: null, structure: null };
      summaryEl = null;
      Dom.keepContext(container, function () {
        Dom.clear(container);
        container.appendChild(Dom.el('p', { class: 'empty', text: 'Elegí un trabajo para configurarlo.' }));
      });
      return;
    }

    // Nada que cambió estructuralmente: sólo se refresca el resumen, para no
    // romper el cursor de un campo que se está escribiendo.
    // El isConnected importa: si el resumen ya no está en el documento (porque
    // se mostró el formulario de otro tipo y se vació el panel), hay que
    // reconstruir en vez de actualizar un nodo suelto.
    var structure = structureOf(job);
    if (mounted.jobId === job.id && mounted.structure === structure
        && summaryEl && summaryEl.isConnected) {
      updateSummary(job);
      return;
    }
    mounted = { jobId: job.id, structure: structure };

    // El re-render completo va dentro de keepContext para que el panel no salte
    // al scroll de arriba cuando se activa algo que agrega o saca campos.
    Dom.keepContext(container, function () {
      Dom.clear(container);
      summaryEl = Dom.el('p', { class: 'form-summary', text: Calculator.describe(job) });
      container.appendChild(summaryEl);

      [
        buildImageGroup(job, ctx),
        buildPageGroup(job, ctx),
        buildShapeGroup(job, ctx),
        buildFitGroup(job, ctx),
        buildRotationGroup(job, ctx),
        buildBorderGroup(job, ctx),
        buildSpacingGroup(job, ctx),
        buildMarginsGroup(job, ctx),
        buildCountGroup(job, ctx)
      ].forEach(function (node) { container.appendChild(node); });
    });
  }

  Mosaic.Form = { render: render };
})(window);