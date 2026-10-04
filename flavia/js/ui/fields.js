/*
 * Controles de formulario reutilizables.
 *
 * Cada control escribe directo en el estado del trabajo y devuelve un elemento
 * listo para insertar. No hay botón de "Aplicar": el cambio es inmediato.
 */
(function (global) {
  'use strict';

  var Impresion = global.Impresion || (global.Impresion = {});
  var Dom = Impresion.Dom;
  var U = Impresion.Units;

  function uid() {
    uid.counter = (uid.counter || 0) + 1;
    return 'f' + uid.counter;
  }

  function group(title, children, opts) {
    var options = opts || {};
    return Dom.el('fieldset', { class: 'field-group' + (options.collapsed ? ' is-collapsed' : '') }, [
      Dom.el('legend', { class: 'field-group__legend', text: title }),
      Dom.el('div', { class: 'field-group__body' }, children)
    ]);
  }

  function row(children) {
    return Dom.el('div', { class: 'field-row' }, children);
  }

  // Los radios se ven como "chips": el input queda oculto y el <span> hermano
  // se pinta cuando está seleccionado (sin usar :has()).
  function radioGroup(config) {
    var name = uid();
    var nodes = config.options.map(function (option) {
      var input = Dom.el('input', {
        type: 'radio',
        name: name,
        value: option.id,
        checked: option.id === config.value,
        on: { change: function () { config.onChange(option.id); } }
      });
      return Dom.el('label', { class: 'chip' + (option.hint ? ' chip--hint' : '') }, [
        input,
        Dom.el('span', { text: option.label })
      ]);
    });

    var wrapper = Dom.el('div', { class: 'chip-group' }, nodes);
    if (!config.label) return wrapper;

    return Dom.el('div', { class: 'field' }, [
      Dom.el('span', { class: 'field__label', text: config.label }),
      wrapper
    ]);
  }

  function checkbox(config) {
    return Dom.el('label', { class: 'checkbox' }, [
      Dom.el('input', {
        type: 'checkbox',
        checked: !!config.checked,
        on: { change: function (event) { config.onChange(event.target.checked); } }
      }),
      Dom.el('span', { text: config.label })
    ]);
  }

  // Al enfocar un campo numérico se selecciona el contenido: escribir de nuevo
  // es más rápido que borrar.
  function autoSelect(input) {
    input.addEventListener('focus', function () { input.select(); });
    return input;
  }

  function numberField(config) {
    var input = autoSelect(Dom.el('input', {
      type: 'number',
      value: U.toInputValue(config.value),
      min: config.min === undefined ? 0 : config.min,
      max: config.max,
      step: config.step === undefined ? 1 : config.step,
      disabled: config.disabled,
      'data-focus-key': config.focusKey,
      on: {
        input: function (event) {
          var raw = event.target.value;
          if (raw === '') return; // evita NaN mientras se borra
          config.onInput(U.toNumber(raw));
        }
      }
    }));

    var children = [input];
    if (config.unit) children.push(Dom.el('span', { class: 'input-unit', text: config.unit }));
    if (config.hint) children.push(Dom.el('span', { class: 'field__hint', text: config.hint }));

    return Dom.el('label', { class: 'field' }, [
      Dom.el('span', { class: 'field__label', text: config.label }),
      Dom.el('span', { class: 'input-wrap' }, children)
    ]);
  }

  function sliderField(config) {
    var output = Dom.el('output', { class: 'field__value', text: config.format(config.value) });
    var input = Dom.el('input', {
      type: 'range',
      value: U.toInputValue(config.value),
      min: config.min === undefined ? 0 : config.min,
      max: config.max === undefined ? 100 : config.max,
      step: config.step === undefined ? 1 : config.step,
      disabled: config.disabled,
      'data-focus-key': config.focusKey,
      on: {
        input: function (event) {
          var next = U.toNumber(event.target.value);
          output.textContent = config.format(next);
          config.onInput(next);
        }
      }
    });

    return Dom.el('div', { class: 'field field--slider' }, [
      Dom.el('div', { class: 'field__head' }, [
        Dom.el('span', { class: 'field__label', text: config.label }),
        output
      ]),
      input
    ]);
  }

  function selectField(config) {
    var select = Dom.el('select', {
      disabled: config.disabled,
      'data-focus-key': config.focusKey,
      on: { change: function (event) { config.onChange(event.target.value); } }
    }, config.options.map(function (option) {
      return Dom.el('option', { value: option.id, selected: option.id === config.value, text: option.label });
    }));

    return Dom.el('label', { class: 'field' }, [
      Dom.el('span', { class: 'field__label', text: config.label }),
      select
    ]);
  }

  function colorField(config) {
    return Dom.el('label', { class: 'field field--color' }, [
      Dom.el('span', { class: 'field__label', text: config.label }),
      Dom.el('input', {
        type: 'color',
        value: config.value,
        disabled: config.disabled,
        'data-focus-key': config.focusKey,
        on: { input: function (event) { config.onInput(event.target.value); } }
      })
    ]);
  }

  /*
   * Grupo de borde, compartido por los tipos de trabajo que lo necesiten.
   *
   * El borde puede vivir en cualquier parte del trabajo (en mosaico está en
   * job.image, que es común; en texto está en job.params), así que el grupo
   * no sabe dónde está: recibe el objeto y una función para guardar.
   *
   *   Fields.borderGroup({
   *     title: 'Borde de cada pieza',
   *     focusPrefix: 'mosaic',
   *     styleOptions: Defaults.BORDER_STYLES,
   *     border: job.image.border,
   *     hint: 'El borde va incluido en la medida de la pieza.',
   *     onChange: function (mutate) { ... }
   *   })
   */
  function borderGroup(config) {
    var border = config.border;

    function mutate(mutator) {
      config.onChange(function (draft) { mutator(draft); });
    }

    var children = [checkbox({
      label: 'Activar borde',
      checked: border.enabled,
      onChange: function (enabled) { mutate(function (draft) { draft.enabled = enabled; }); }
    })];

    if (border.enabled) {
      children.push(row([
        numberField({
          label: 'Grosor',
          unit: 'mm',
          min: 0,
          step: 0.1,
          value: border.widthMm,
          focusKey: config.focusPrefix + '-border-width',
          onInput: function (value) { mutate(function (draft) { draft.widthMm = value; }); }
        }),
        selectField({
          label: 'Estilo',
          options: config.styleOptions,
          value: border.style,
          focusKey: config.focusPrefix + '-border-style',
          onChange: function (style) { mutate(function (draft) { draft.style = style; }); }
        })
      ]));

      children.push(colorField({
        label: 'Color',
        value: border.color,
        focusKey: config.focusPrefix + '-border-color',
        onInput: function (color) { mutate(function (draft) { draft.color = color; }); }
      }));

      if (config.hint) children.push(Dom.el('p', { class: 'field__hint', text: config.hint }));
    }

    return group(config.title, children);
  }

  /*
   * Campos numéricos con unidad.
   *
   * Todo se guarda en milímetros, así que estos dos son los que casi siempre
   * se usan: uno muestra el valor en mm y el otro lo muestra en cm (que es
   * como piensa la persona que prepara una impresión).
   */
  function mmField(config) {
    return numberField({
      label: config.label,
      unit: 'mm',
      min: config.min === undefined ? 0 : config.min,
      max: config.max,
      step: config.step === undefined ? 0.1 : config.step,
      value: config.mm === undefined ? config.value : U.mmToFixed(config.mm, 2),
      focusKey: config.focusKey,
      disabled: config.disabled,
      hint: config.hint,
      onInput: config.onInput
    });
  }

  function cmField(config) {
    return numberField({
      label: config.label,
      unit: 'cm',
      min: config.min === undefined ? 0.1 : config.min,
      max: config.max,
      step: config.step === undefined ? 0.1 : config.step,
      value: U.mmToCm(config.mm === undefined ? config.value : config.mm),
      focusKey: config.focusKey,
      disabled: config.disabled,
      hint: config.hint,
      onInput: function (cm) { config.onInput(U.cmToMm(cm)); }
    });
  }

  function textareaField(config) {
    var area = Dom.el('textarea', {
      class: 'field__textarea',
      rows: config.rows || 4,
      'aria-label': config.label,
      'data-focus-key': config.focusKey,
      on: {
        input: function (event) { config.onInput(event.target.value); }
      }
    });
    area.value = config.value || '';

    return Dom.el('label', { class: 'field' }, [
      Dom.el('span', { class: 'field__label', text: config.label }),
      area
    ]);
  }

  Impresion.Fields = {
    group: group,
    row: row,
    radioGroup: radioGroup,
    checkbox: checkbox,
    numberField: numberField,
    sliderField: sliderField,
    selectField: selectField,
    colorField: colorField,
    textareaField: textareaField,
    borderGroup: borderGroup,
    mmField: mmField,
    cmField: cmField,
    autoSelect: autoSelect
  };
})(window);