/*
 * Helpers mínimos de DOM. Sin framework, sólo lo que se usa en la app.
 */
(function (global) {
  'use strict';

  var Impresion = global.Impresion || (global.Impresion = {});

  // Propiedades que se asignan por asignación en vez de por setAttribute.
  var PROPS = [
    'value', 'checked', 'disabled', 'selected', 'src', 'href', 'title', 'placeholder',
    'name', 'type', 'min', 'max', 'step', 'rows', 'colSpan', 'readOnly', 'accept', 'for'
  ];

  function applyAttrs(node, attrs) {
    Object.keys(attrs || {}).forEach(function (key) {
      var value = attrs[key];
      if (value === undefined || value === null || value === false) return;

      if (key === 'class' || key === 'className') {
        node.className = value;
      } else if (key === 'text') {
        node.textContent = value;
      } else if (key === 'style' && typeof value === 'object') {
        Object.keys(value).forEach(function (prop) { node.style[prop] = value[prop]; });
      } else if (key === 'dataset') {
        Object.keys(value).forEach(function (prop) { node.dataset[prop] = value[prop]; });
      } else if (key === 'on') {
        Object.keys(value).forEach(function (evt) { node.addEventListener(evt, value[evt]); });
      } else if (PROPS.indexOf(key) !== -1) {
        node[key] = value;
      } else {
        node.setAttribute(key, value === true ? '' : value);
      }
    });
  }

  function append(node, children) {
    if (children === undefined || children === null) return node;
    var list = Array.isArray(children) ? children : [children];
    list.forEach(function (child) {
      if (child === undefined || child === null || child === false) return;
      node.appendChild(typeof child === 'string' || typeof child === 'number'
        ? document.createTextNode(String(child))
        : child);
    });
    return node;
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    applyAttrs(node, attrs);
    append(node, children);
    return node;
  }

  function clear(node) {
    if (!node) return;
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  /*
   * El contenedor con scroll que contiene al nodo (el panel, normalmente).
   */
  function scrollParent(node) {
    var current = node ? node.parentElement : null;
    while (current && current !== document.body && current !== document.documentElement) {
      var style = global.getComputedStyle(current);
      if (/(auto|scroll)/.test(style.overflowY) && current.scrollHeight > current.clientHeight) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  /*
   * Ejecuta un re-render sin perder el contexto de quien lo pidió:
   * el scroll del panel, el foco y la posición del cursor.
   *
   * El scroll es lo importante: al vaciar un contenedor con scroll, el
   * navegador recorta el scrollTop a 0 (el contenido momentáneo es cero), así
   * que sin esto la pantalla salta arriba cada vez que se activa un campo que
   * agrega controles (por ejemplo "Activar borde").
   *
   * El foco y el cursor se buscan por `data-focus-key`, que lleva cada control
   * editable. Si el elemento enfocado no tiene esa clave, se deja el foco donde
   * esté en vez de adivinar.
   */
  function keepContext(container, render) {
    var scroller = scrollParent(container);
    // Se captura ANTES: después del render ya vale 0 y no hay nada que recuperar.
    var scrollTop = scroller ? scroller.scrollTop : 0;

    var active = document.activeElement;
    var hasFocus = !!(active && container && container.contains(active));
    var key = hasFocus ? active.getAttribute('data-focus-key') : null;
    var start = null;
    var end = null;
    if (hasFocus && key !== null && active.selectionStart !== undefined) {
      start = active.selectionStart;
      end = active.selectionEnd;
    }

    render();

    if (scroller && scrollTop > 0) scroller.scrollTop = scrollTop;

    if (key === null) return;
    var restored = container.querySelector('[data-focus-key="' + key + '"]');
    if (!restored) return;
    restored.focus();
    if (start !== null && typeof restored.setSelectionRange === 'function') {
      try { restored.setSelectionRange(start, end); } catch (error) { /* tipos sin selección */ }
    }
  }

  Impresion.Dom = {
    el: el,
    clear: clear,
    scrollParent: scrollParent,
    keepContext: keepContext
  };
})(window);