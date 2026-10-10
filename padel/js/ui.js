// Render y eventos. La UI no calcula reglas: pregunta al motor y dibuja lo que devuelve
// (constitución 1 y 2). Este módulo no toca el estado del partido ni lo persiste:
// solo muestra y avisa clics.
//
// Lo de arriba de la línea "DOM" son funciones puras, sin navegador: se testean con
// `node --test tests/ui.test.js`. Lo de abajo necesita el navegador: se verifica en la Fase 12.

import {
  resultadoPartido,
  etiquetaResultadoSet,
  etiquetaPunto,
  setEnCurso,
  indiceSetEnCurso,
  valoresValidosPuntos,
  valoresValidosJuegos,
  valoresValidosPuntoDeTieBreak,
  puedeEditarPuntos,
  cerradoAMano,
  derivados,
  nombreDeEquipo,
  parejaGanadora,
  puedeAnularUltimoPunto,
  MODALIDADES,
} from './motor.js';
import { MOVIMIENTOS, etiquetaMovimiento } from './movimientos.js';
import { generarResumen } from './resumen.js';
import { SECCIONES, ETIQUETAS_GOLPES } from './ayuda.js';

export const ETIQUETAS_MODALIDAD = {
  ventaja: 'Ventaja tradicional',
  punto_oro: 'Punto de oro',
  star_point: 'Star point',
};

// ================================================================= funciones puras

// Cómo se escribe un valor del editor: el motor ya devuelve valores con su forma final.
export function etiquetaDeValor(valor) {
  return String(valor);
}

// Los valores que van como botón en la fila de edición, más la etiqueta del valor actual.
//
// El valor actual NUNCA es botón: se muestra como etiqueta. El filtro es por ETIQUETA y no solo
// por número, porque hay valores que coinciden con la etiqueta sin ser el mismo valor: en fase
// `ventaja` la pareja sin ventaja tiene 'iguales' entre sus valores válidos y su etiqueta actual
// ya dice "iguales", así que como botón repetiría lo que ya está a la vista.
export function valoresDelEditor(valores, etiquetaActual) {
  const actual = String(etiquetaActual);
  return valores.filter((valor) => etiquetaDeValor(valor) !== actual);
}

// Los números que se ven de cada pareja en un set. Un set cerrado en tie-break muestra 7-6,
// que es su resultado, aunque los contadores crudos sigan en 6-6.
export function juegosVisiblesDeSet(set) {
  if (set.porTieBreak) {
    const ganaA = set.tieBreak.A > set.tieBreak.B;
    return { A: ganaA ? '7' : '6', B: ganaA ? '6' : '7' };
  }
  return { A: String(set.juegos.A), B: String(set.juegos.B) };
}

// Qué sets muestran su parcial en el marcador, como índices.
//
// Mientras se juega, sólo el set en curso: los parciales de los sets ya cerrados están a la
// vista en el resumen y, en vertical, cada cajita de más hace crecer el marcador hasta que la
// pantalla no scrollea y el resto se va de pantalla.
//
// En la pantalla de fin van todos: ahí el marcador es el resultado del partido, y en esa vista
// no compite con nada.
export function indicesDeSetsVisibles(partido, vista) {
  if (vista === 'fin') return partido.marcador.sets.map((_, indice) => indice);
  const indice = indiceSetEnCurso(partido.marcador);
  return indice === -1 ? [] : [indice];
}

// Los avisos de set point y match point. No bloquean nada: son texto (RF-44).
export function avisosDePunto(partido) {
  const { matchPointA, matchPointB, setPointA, setPointB } = derivados(partido);
  const avisos = [];

  for (const [letra, tieneMatch, tieneSet] of [['A', matchPointA, setPointA], ['B', matchPointB, setPointB]]) {
    if (!tieneMatch && !tieneSet) continue;
    avisos.push({
      pareja: letra,
      texto: tieneMatch ? 'match point' : 'set point',
      nivel: tieneMatch ? 'match' : 'set',
    });
  }

  return avisos;
}

// Los valores de un editor de juegos, ya filtrados por lo que se ve en pantalla.
export function valoresDeJuegos(partido, indiceSet, pareja) {
  const set = partido.marcador.sets[indiceSet];
  if (set === undefined) return [];
  return valoresDelEditor(valoresValidosJuegos(partido, indiceSet, pareja), juegosVisiblesDeSet(set)[pareja]);
}

// Los valores de un editor de puntos del juego, ya filtrados.
export function valoresDePuntos(partido, pareja) {
  const set = setEnCurso(partido);
  if (set === null) return [];
  return valoresDelEditor(valoresValidosPuntos(partido, pareja), etiquetaPunto(set, pareja));
}

// Los valores del editor de tie-break, ya filtrados.
// "¿Estamos en tie-break?" lo responde `derivados`, no leyendo la fase del juego: renombrar una
// fase en el motor no debería romper tres lugares del render.
export function valoresDeTieBreak(partido, pareja) {
  if (!enTieBreak(partido)) return [];
  const set = setEnCurso(partido);
  if (set === null) return [];
  return valoresDelEditor(valoresValidosPuntoDeTieBreak(partido, pareja), etiquetaPunto(set, pareja));
}

// El set en curso está en fase tie-break.
export function enTieBreak(partido) {
  return derivados(partido).enTieBreak;
}

// Con el partido terminado por alcance de sets no se registran puntos, pero editar games y
// sets sigue disponible para poder reabrirlo (RF-36, CE-15).
export function sePuedeRegistrarPunto(partido) {
  return puedeEditarPuntos(partido);
}

// Cerrar a mano es definitivo: no se edita nada (RF-64).
export function sePuedeEditarJuegos(partido) {
  return !cerradoAMano(partido);
}

// El jugador del puesto N, en el orden en que la app los muestra.
export function jugadorPorPuesto(partido, puesto) {
  return [...partido.parejas.A.jugadores, ...partido.parejas.B.jugadores]
    .find((jugador) => jugador.puesto === puesto) ?? null;
}

// Con el partido terminado se muestra el cartel de por qué terminó.
export function mensajeDeEstado(partido) {
  if (partido.estado !== 'terminado') return null;
  return partido.motivoFin === 'manual' ? 'Cerrado a mano' : 'Fin del partido';
}

// Los nombres del formulario de creación, ya con trim. El motor no compara nombres nunca.
export function leerFormulario(formulario) {
  const valor = (name) => (formulario.elements[name]?.value ?? '').trim();
  const numero = (name, porDefecto) => {
    const crudo = Number(valor(name));
    return Number.isFinite(crudo) && crudo > 0 ? crudo : porDefecto;
  };

  return {
    parejaA: { jugadores: [valor('jugadorA1'), valor('jugadorA2')] },
    parejaB: { jugadores: [valor('jugadorB1'), valor('jugadorB2')] },
    setsAElegir: numero('setsAElegir', 3),
    modalidad: valor('modalidad') || 'punto_oro',
    parejaQueSacaElPrimero: valor('parejaQueSacaElPrimero'),
  };
}

// Habilita "Empezar" solo con los 4 nombres de jugador completos (RF-4).
// Cuenta igual que `crearPartido`: 4 nombres no vacíos, para que la UI nunca habilite un
// formulario que el motor vaya a rechazar.
export function formularioCompleto(datos) {
  const nombres = [...datos.parejaA.jugadores, ...datos.parejaB.jugadores];
  return nombres.length === 4 && nombres.every((nombre) => nombre.trim() !== '');
}

// Título del modal de movimientos: dice a quién se le está anotando el punto.
export function tituloDelPuntoPendiente(jugador, resultado) {
  const nombre = jugador?.nombre?.trim() || '';
  return resultado === 'fallado' ? `Fallo de ${nombre}` : `Punto de ${nombre}`;
}

export function ordenarHistorial(partidos) {
  return [...partidos].sort((a, b) => Date.parse(b.fechaFin) - Date.parse(a.fechaFin)
    || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export function datosDeRegistro(registro) {
  const { partido } = registro;
  const resultado = resultadoPartido(partido);
  return {
    fecha: new Date(registro.fechaFin).toLocaleString('es-AR'),
    equipos: ['A', 'B'].map((letra) => nombreDeEquipo(partido, letra)),
    resultado: `Sets ${resultado.A}-${resultado.B}`,
    motivo: cerradoAMano(partido) ? 'Cerrado a mano · sin ganador definitivo' : 'Terminado por sets',
    parciales: partido.marcador.sets.map((set, indice) => {
      const tb = set.tieBreak === null ? '' : ` · TB ${set.tieBreak.A}-${set.tieBreak.B}`;
      const puntos = set.juego === null || set.tieBreak !== null ? ''
        : ` · Puntos ${etiquetaPunto(set, 'A')}-${etiquetaPunto(set, 'B')}`;
      return `Set ${indice + 1}: ${etiquetaResultadoSet(set)}${tb}${set.juego === null ? '' : ' · inconcluso'}${puntos}`;
    }),
  };
}

export function estadisticasDeRegistro(partido) {
  const jugadoresDelPartido = ['A', 'B'].flatMap((pareja) => partido.parejas[pareja].jugadores);
  // Conservar también contadores históricos de un ID que ya no figure entre los jugadores.
  const ids = new Set(jugadoresDelPartido.map((jugador) => jugador.id));
  const todos = [...jugadoresDelPartido, ...Object.keys(partido.estadisticas)
    .filter((id) => !ids.has(id)).map((id) => ({ id, nombre: `Jugador ${id}` }))];
  return todos.map((jugador) => {
    const stats = Object.hasOwn(partido.estadisticas, jugador.id)
      ? partido.estadisticas[jugador.id] : { winners: {}, fallos: {} };
    const golpes = [...new Set([...Object.keys(stats.winners), ...Object.keys(stats.fallos)])].map((id) => {
      const etiqueta = etiquetaMovimiento(id);
      return {
        id, etiqueta: etiqueta === 'Sin especificar' && id !== 'sin_especificar' ? id : etiqueta,
        winners: Object.hasOwn(stats.winners, id) ? stats.winners[id] : 0,
        fallos: Object.hasOwn(stats.fallos, id) ? stats.fallos[id] : 0,
      };
    });
    return { nombre: jugador.nombre, golpes, sinGolpes: !golpes.some((golpe) => golpe.winners > 0 || golpe.fallos > 0) };
  });
}

export function controlesBloqueados(estado) {
  return estado.pendienteGuardado != null || estado.avisoFin === true;
}

export function anulacionDisponible(estado) {
  return estado.pendienteGuardado == null && estado.conservacion !== 'eliminado'
    && puedeAnularUltimoPunto(estado.partido, estado.ultimoPunto);
}

export function mensajeDeGanadores(partido) {
  const ganadora = parejaGanadora(partido);
  return ganadora === null ? null
    : `¡Terminó! Ganaron ${partido.parejas[ganadora].jugadores.map((jugador) => jugador.nombre).join(' / ')}`;
}

export function mensajePersistencia(estado) {
  if (estado.errorPersistencia === null || estado.errorPersistencia === undefined) {
    if (estado.errorHistorial != null) return estado.reintentoHistorial?.tipo === 'eliminar'
      ? 'No se pudo eliminar el partido del historial. Reintentá para completar la eliminación.'
      : 'No se pudo leer el historial. Los datos guardados se conservan. Reintentá.';
    return null;
  }
  const error = estado.errorPersistencia;
  if (error.fase === 'limpieza') return 'El cambio del historial ya se guardó, pero no se pudo limpiar el partido activo. Reintentá antes de continuar.';
  if (error.etapa === 'formato') return 'Hay datos guardados que no se pueden leer. No se borraron ni se reemplazaron. Reintentá cuando se resuelva el problema.';
  return 'No se pudo completar la conservación del partido. Reintentá antes de continuar. Recargar puede perder cambios todavía no guardados.';
}

// ================================================================= DOM

// Crea un elemento. Props especiales: `clase`, `texto`, `datos` (dataset), `svg` (HTML crudo de
// un icono) y cualquier `on*`, que se engancha con addEventListener (nunca con setAttribute:
// ahí una función se convierte en texto y no ejecuta).
function el(etiqueta, props = {}, hijos = []) {
  const nodo = document.createElement(etiqueta);

  for (const [clave, valor] of Object.entries(props)) {
    if (clave === 'clase') nodo.className = valor;
    else if (clave === 'texto') nodo.textContent = valor;
    else if (clave === 'svg') nodo.innerHTML = valor;
    else if (clave === 'datos') Object.assign(nodo.dataset, valor);
    else if (clave.startsWith('on') && typeof valor === 'function') {
      nodo.addEventListener(clave.slice(2), valor);
    } else if (valor === true) nodo.setAttribute(clave, '');
    else if (valor !== false && valor !== null && valor !== undefined) nodo.setAttribute(clave, valor);
  }

  for (const hijo of Array.isArray(hijos) ? hijos : [hijos]) if (hijo) nodo.append(hijo);
  return nodo;
}

// ---------------------------------------------------------------- iconos

// SVG inline, sin CDN ni fuentes. Trazo de 2 y `currentcolor`: el icono toma el color
// del botón y no necesita variantes.
const ICONO_COPIAR = '<rect x="9" y="3" width="11" height="17" rx="2.5"/><path d="M6 7H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-1"/>';
const ICONO_REINICIAR = '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3 4v5h5"/>';
const ICONO_VOLVER = '<path d="m8 4-5 5 5 5"/><path d="M3 9h11a7 7 0 0 1 0 14"/>';
const ICONO_CERRAR = '<path d="m6 6 12 12M18 6 6 18"/>';
const ICONO_MAS = '<path d="M12 4.5v15M4.5 12h15"/>';
const ICONO_RAQUETA = '<path d="M7 4.8v14.4L19 12z"/>';
const ICONO_TROFEO = '<path d="M7.5 4h9v5.2a4.5 4.5 0 0 1-9 0z"/><path d="M16.5 5.4H19v1.9a2.9 2.9 0 0 1-2.9 2.9M7.5 5.4H5v1.9a2.9 2.9 0 0 0 2.9 2.9"/><path d="M12 13.9V18M8.6 21h6.8l-.8-3H9.4z"/>';

function icono(dibujo) {
  return `<svg class="icono" viewBox="0 0 24 24" aria-hidden="true">${dibujo}</svg>`;
}

// Un botón de la barra de acciones: ícono + texto, nunca sólo ícono (se toca al tacto).
function boton(texto, alTocar, { clase = '', dibujo = null } = {}) {
  return el('button', {
    clase: `btn ${clase}`.trim(),
    type: 'button',
    onclick: alTocar,
  }, [dibujo === null ? null : el('span', { clase: 'btn__icono', svg: icono(dibujo) }), texto]);
}

// ---------------------------------------------------------------- estado del DOM

let nodos = null;
let jugadores = new Map();
let acciones = null;

// ¿El clic fue fuera de la hoja? El velo y la capa son lo mismo para el usuario: tocar el
// fondo descarta. Comparar sólo con la capa no alcanzaba: el velo es un hijo y el evento
// llega con `target` en el velo, así que tocar fuera no cerraba nada.
function esToqueFuera(evento) {
  return evento.target === nodos.capaModal || evento.target?.classList?.contains('velo') === true;
}

// app.js inyecta el cableado una vez, antes de montar.
export function conectarAcciones(lasAcciones) {
  acciones = lasAcciones;
}

// Arma el esqueleto una sola vez. Las vistas existen siempre y se muestran u ocultan:
// así los inputs de la creación conservan lo escrito al cambiar de vista, y nada se pierde
// al rotar el teléfono (RF-41). No se recalcula nada acá: solo se construye la estructura.
export function montar(contenedor, capaModal) {
  jugadores = new Map();

  const vistas = {
    // Un <form> de verdad: `leerFormulario` usa `form.elements`, y además Enter empieza el partido.
    crear: el('form', {
      clase: 'creacion',
      'aria-label': 'Crear partido',
      onsubmit: (evento) => { evento.preventDefault(); acciones.empezar(); },
    }),
    partido: el('section', { clase: 'partido', 'aria-label': 'Marcador' }),
    fin: el('section', { clase: 'fin', 'aria-label': 'Resumen del partido' }),
    historial: el('section', { clase: 'historial', 'aria-label': 'Historial de partidos' }),
    detalle: el('section', { clase: 'historial', 'aria-label': 'Detalle del partido' }),
    ayuda: el('section', { clase: 'historial ayuda', 'aria-label': 'Ayuda' }),
  };

  vistas.crear.append(construirCreacion());
  vistas.partido.append(construirMarcador(), construirCancha(), construirAccionesDePartido());
  vistas.fin.append(construirFin());
  vistas.ayuda.append(...construirAyuda());
  const avisoPersistencia = el('aside', { clase: 'conservacion', hidden: true });
  const textoPersistencia = el('p');
  avisoPersistencia.append(textoPersistencia, boton('Reintentar', () => acciones.reintentar()));

  contenedor.replaceChildren(avisoPersistencia, ...Object.values(vistas));

  nodos = {
    vistas,
    capaModal,
    avisoPersistencia,
    textoPersistencia,
    botonEmpezar: vistas.crear.querySelector('.boton-principal'),
    // El marcador se muda entre la vista de partido y la de fin: hay que guardar el nodo.
    marcador: vistas.partido.querySelector('.marcador'),
    parciales: vistas.partido.querySelector('.parciales'),
    editorParciales: vistas.partido.querySelector('.editor--parciales'),
    editorPuntos: vistas.partido.querySelector('.editor--puntos'),
    puntos: {
      A: vistas.partido.querySelector('.punto--a'),
      B: vistas.partido.querySelector('.punto--b'),
      vs: vistas.partido.querySelector('.punto__medio'),
    },
    cuenta: {
      A: vistas.partido.querySelector('[data-juegos="A"]'),
      B: vistas.partido.querySelector('[data-juegos="B"]'),
      equipoA: vistas.partido.querySelector('.eq__nombre--a'),
      equipoB: vistas.partido.querySelector('.eq__nombre--b'),
    },
    sacaA: vistas.partido.querySelector('.eq__saca--a'),
    sacaB: vistas.partido.querySelector('.eq__saca--b'),
    pie: vistas.partido.querySelector('.marcador__pie'),
    resumen: vistas.fin.querySelector('.resumen'),
    motivoFin: vistas.fin.querySelector('.fin__motivo'),
    marcadorFin: vistas.fin.querySelector('.fin__marcador'),
    avisos: document.getElementById('avisos'),
  };
}

// ---------------------------------------------------------------- creación

function construirCreacion() {
  const contenedor = el('div', { clase: 'creacion__campos' });

  contenedor.append(
    el('div', { clase: 'creacion__titulo' }, [
      el('h1', { texto: 'Padel Scores' }),
    ]),
    grupoPareja('A', 'Pareja A'),
    grupoPareja('B', 'Pareja B'),
    construirOpciones(),
    el('div', { clase: 'creacion__pie' }, [
      el('span', { clase: 'micro creacion__pista', texto: 'Los 4 nombres son obligatorios' }),
      boton('Empezar', () => acciones.empezar(), {
        clase: 'btn--pelota btn--alto boton-principal',
        dibujo: ICONO_RAQUETA,
      }),
      el('div', { clase: 'acciones__par' }, [
        boton('Historial', () => acciones.abrirHistorial()),
        boton('Ayuda', () => acciones.abrirAyuda()),
      ]),
    ]),
  );

  return contenedor;
}

// La tarjeta de un lado de la cancha. Sólo los dos jugadores: el nombre de pareja no es un
// dato elegible, los equipos se llaman por los nombres de quienes juegan.
//
// "Pareja A" / "Pareja B" acá es la etiqueta del lado (izquierda o derecha de la red, color
// cian o naranja), no el nombre del equipo.
function grupoPareja(letra, rotulo) {
  const casillas = ['1', '2'].map((n) => el('label', { clase: 'campo' }, [
    el('span', { texto: `Jugador ${n}` }),
    el('input', {
      type: 'text',
      name: `jugador${letra}${n}`,
      placeholder: `Jugador ${n}`,
      autocomplete: 'off',
      required: true,
    }),
  ]));

  return el('div', { clase: `creacion__pareja creacion__pareja--${letra.toLowerCase()}` }, [
    el('span', { clase: 'creacion__rotulo' }, [
      el('i', { clase: 'creacion__punto' }),
      rotulo,
    ]),
    ...casillas,
  ]);
}

// Los grupos de opciones son botones, no <select>: se tocan, no se abren. El valor elegido
// vive en un <input hidden> con el mismo `name`, así que `leerFormulario` sigue leyendo
// `form.elements[name].value` y no hay que tocar esa lógica.
function construirOpciones() {
  return el('div', { clase: 'opciones' }, [
    bloqueOpciones('setsAElegir', 'Sets', 'a cuántos sets se gana', [
      { valor: '1', texto: '1 set', nota: 'partido único' },
      { valor: '3', texto: '3 sets', nota: 'al mejor de 3' },
      { valor: '5', texto: '5 sets', nota: 'al mejor de 5' },
    ], '3', 3, 'opcion-set'),

    bloqueOpciones('modalidad', 'Modalidad', 'qué pasa en el deuce', [
      { valor: 'ventaja', texto: 'Ventaja', nota: 'deuce + ventaja' },
      { valor: 'punto_oro', texto: 'Punto de oro', nota: 'oro en el deuce' },
      { valor: 'star_point', texto: 'Star point', nota: 'punto único' },
    ], 'punto_oro', 3, 'opcion-set'),

    bloqueSaque(),
  ]);
}

// Un <label> con el rótulo y la pista, más el input hidden que lleva el valor.
function bloqueOpciones(name, rotulo, pista, opciones, porDefecto, columnas, claseBoton) {
  const oculto = el('input', { type: 'hidden', name, value: porDefecto });

  const botones = opciones.map((opcion) => el('button', {
    clase: claseBoton,
    type: 'button',
    datos: { valor: opcion.valor, name },
    onclick: () => elegirOpcion(name, opcion.valor, claseBoton),
  }, [
    el('span', { texto: opcion.texto }),
    el('span', { clase: 'opcion-set__nota', texto: opcion.nota }),
  ]));

  // El default viene elegido de arranque.
  marcarElegido(botones, porDefecto, claseBoton);

  return el('div', { clase: 'opciones__bloque' }, [
    el('div', { clase: 'opciones__rotulo' }, [
      el('span', { texto: rotulo }),
      el('span', { clase: 'opciones__pista', texto: pista }),
    ]),
    oculto,
    el('div', { clase: `segmento segmento--${columnas}` }, botones),
  ]);
}

function bloqueSaque() {
  const oculto = el('input', { type: 'hidden', name: 'parejaQueSacaElPrimero', value: '' });

  const botones = ['A', 'B'].map((letra) => el('button', {
    clase: `saca-btn saca-btn--${letra.toLowerCase()}`,
    type: 'button',
    datos: { valor: letra, name: 'parejaQueSacaElPrimero' },
    onclick: () => elegirSaque(letra),
  }, [
    el('i', { clase: 'saca-btn__punto' }),
    el('span', { texto: `Pareja ${letra}` }),
    // Eligen la pareja por los nombres que ya están escritos arriba: si no hay nombre de
    // pareja, se muestran los jugadores, que es lo que el jugador de la cancha va a leer.
    el('span', { clase: 'saca-btn__nota', texto: '' }),
  ]));

  return el('div', { clase: 'opciones__bloque' }, [
    el('div', { clase: 'opciones__rotulo' }, [
      el('span', { texto: 'Quién saca el primero' }),
    ]),
    oculto,
    el('div', { clase: 'segmento segmento--2' }, botones),
  ]);
}

// Cambia el valor del grupo y repinta cuál de los botones está elegido. El valor va en un
// `<input hidden>` con el `name` del campo, así que `leerFormulario` sigue leyendo lo mismo
// que leía del `<select>`: no cambia ninguna lógica.
function elegirOpcion(name, valor, claseBoton) {
  const oculto = document.querySelector(`input[type="hidden"][name="${name}"]`);
  if (oculto === null) return;
  oculto.value = valor;
  marcarElegido(document.querySelectorAll(`[data-name="${name}"]`), valor, claseBoton);
}

function marcarElegido(botones, valor, claseBoton) {
  for (const botonDeOpciones of botones) {
    botonDeOpciones.classList.toggle(`${claseBoton}--elegida`, botonDeOpciones.dataset.valor === valor);
  }
}

function elegirSaque(letra) {
  const oculto = document.querySelector('input[type="hidden"][name="parejaQueSacaElPrimero"]');
  if (oculto === null) return;
  oculto.value = letra;

  for (const botonDeSaque of document.querySelectorAll('.saca-btn')) {
    botonDeSaque.classList.toggle('saca-btn--elegida', botonDeSaque.dataset.valor === letra);
  }
  actualizarNombresDeSaque();
}

// Debajo de cada botón de saque se lee "quiénes son", y eso cambia con lo que se escribe
// arriba. Es el mismo dato que va a ver en la cancha, así que se lee del formulario y no
// de una copia: si no, se desincroniza.
function actualizarNombresDeSaque() {
  const formulario = document.querySelector('.creacion');
  if (formulario === null) return;

  const valor = (name) => (formulario.elements[name]?.value ?? '').trim();
  for (const nota of document.querySelectorAll('.saca-btn__nota')) {
    const botonDeSaque = nota.closest('.saca-btn');
    nota.textContent = jugadoresDeSaque(valor, botonDeSaque.dataset.valor);
  }
}

// Los dos jugadores de una pareja, separados por un punto medio. Si faltan, se dice: es
// mejor un "sin nombre" que un botón que promete una cosa y muestra otra.
function jugadoresDeSaque(valor, letra) {
  const nombres = [valor(`jugador${letra}1`), valor(`jugador${letra}2`)].filter((n) => n !== '');
  return nombres.length === 2 ? nombres.join(' · ') : 'sin nombre';
}

// ---------------------------------------------------------------- marcador

function construirMarcador() {
  return el('header', { clase: 'marcador' }, [
    // Fila 1: los dos nombres de pareja. La pelota marca de quién es el saque, y va pegada
    // al nombre: el saque cambia de lado, no de fila.
    el('span', { clase: 'eq eq--a' }, [
      el('i', { clase: 'eq__saca eq__saca--a' }),
      el('span', { clase: 'eq__nombre eq__nombre--a' }),
    ]),
    el('span', { clase: 'eq eq--b' }, [
      el('span', { clase: 'eq__nombre eq__nombre--b' }),
      el('i', { clase: 'eq__saca eq__saca--b' }),
    ]),

    // Fila 2: parciales y cuenta de sets, compitiendo entre ellos.
    //
    // `sets` es hijo directo del marcador y ocupa su propia área del grid.
    el('div', { clase: 'marcador__parciales' }, [
      el('span', { clase: 'micro', texto: 'Parciales' }),
      el('div', { clase: 'parciales' }),
    ]),
    el('div', { clase: 'sets' }, [
      el('b', { clase: 'sets__caja sets__caja--a', datos: { juegos: 'A' } }),
      el('span', { classe: '', clase: 'sets__txt', texto: 'sets' }),
      el('b', { clase: 'sets__caja sets__caja--b', datos: { juegos: 'B' } }),
    ]),

    el('div', { clase: 'editor editor--parciales', hidden: true }),

    // Fila 3: el punto del juego. Lo más grande del marcador, porque es lo único que
    // cambia segundo a segundo.
    el('div', { clase: 'marcador__puntos' }, [
      puntoDePareja('A'),
      el('span', { clase: 'punto__medio' }),
      puntoDePareja('B'),
    ]),

    el('div', { clase: 'editor editor--puntos', hidden: true }),

    // Fila 4: los avisos (set point, match point, por qué terminó). El saque no va acá: la
    // pelota pegada al nombre de la pareja, en la fila 1, ya lo dice. Si no hay nada que
    // avisar la fila se oculta, para no dejar un hueco en el marcador.
    el('div', { clase: 'marcador__pie' }),
  ]);
}

function puntoDePareja(pareja) {
  return el('button', {
    clase: `punto punto--${pareja.toLowerCase()}`,
    type: 'button',
    datos: { pareja },
    onclick: () => acciones.tocarPunto(pareja),
  });
}

// ---------------------------------------------------------------- cancha

function construirCancha() {
  // La cancha es un dibujo: fondo, líneas, eje y red. Las fichas de los jugadores se
  // apoyan encima, dentro de la tabla, con una pareja arriba y otra abajo de la red.
  return el('main', { clase: 'cancha' }, [
    el('div', { clase: 'cancha__tabla' }, [
      el('div', { clase: 'cancha__borde' }),
      el('div', { clase: 'cancha__lineas' }),
      el('div', { clase: 'cancha__eje' }),
      el('div', { clase: 'red' }, [el('div', { clase: 'red__cinta' }), el('div', { clase: 'red__malla' })]),
      el('div', { clase: 'fichas' }, [
        grupoFichas('arriba', 'A', 1),
        grupoFichas('abajo', 'B', 3),
      ]),
    ]),
  ]);
}

function grupoFichas(lateral, letra, primerPuesto) {
  return el('div', { clase: `fichas__par fichas__par--${lateral}` },
    [0, 1].map((indice) => construirFicha(primerPuesto + indice, letra, lateral)));
}

function construirFicha(puesto, letra, lateral) {
  // Un `<div>` con el nombre y los botones como hermanos. Meter botones dentro del botón del
  // jugador sería HTML inválido (contenido interactivo anidado) y además obligaba a
  // paddingar el nombre para que el botón no quedara debajo.
  const nombre = el('button', {
    clase: 'ficha__hit',
    type: 'button',
    onclick: () => acciones.tocarJugador(puesto),
  }, [
    el('span', { clase: 'ficha__nombre' }),
  ]);

  const accionesDeFicha = el('div', { clase: 'ficha__acciones' }, [
    el('button', {
      clase: 'resultado resultado--verde',
      type: 'button',
      'aria-label': 'Punto a favor del jugador',
      onclick: () => acciones.elegirResultado(puesto, 'ganado'),
    }, [
      el('span', { clase: 'resultado__glifo', texto: '✓' }),
    ]),
    el('button', {
      clase: 'resultado resultado--rojo',
      type: 'button',
      'aria-label': 'Fallo del jugador: el punto es de la pareja rival',
      onclick: () => acciones.elegirResultado(puesto, 'fallado'),
    }, [
      el('span', { clase: 'resultado__glifo', texto: '✗' }),
    ]),
  ]);

  const ficha = el('div', {
    clase: `ficha ficha--${letra.toLowerCase()} ficha--${lateral}`,
    datos: { puesto: String(puesto) },
  }, [nombre, accionesDeFicha]);

  jugadores.set(puesto, { ficha, nombre, texto: nombre.querySelector('.ficha__nombre') });
  return ficha;
}

// La barra del partido no tiene "Copiar": el resumen solo se copia con el partido terminado
// (pantalla de fin), así que acá el botón no llevaría a ninguna parte.
function construirAccionesDePartido() {
  return el('nav', { clase: 'acciones acciones--partido' }, [
    boton('Anular último punto', () => acciones.anularUltimoPunto(), { clase: 'btn--anular', dibujo: ICONO_VOLVER }),
    boton('Cerrar', () => acciones.cerrar(), { clase: 'btn--peligro', dibujo: ICONO_CERRAR }),
    boton('Historial', () => acciones.abrirHistorial()),
    boton('Ayuda', () => acciones.abrirAyuda()),
  ]);
}

function construirFin() {
  return el('div', { clase: 'fin__interior' }, [
    el('div', { clase: 'fin__titulo' }, [
      el('span', { clase: 'fin__trofeo', svg: icono(ICONO_TROFEO) }),
      el('h2', { texto: '¡Se terminó!' }),
      // El resumen habitual conserva el motivo del cierre.
      el('span', { clase: 'fin__motivo' }),
    ]),

    el('div', { clase: 'fin__izq' }, [
      // El marcador se muda acá con `mudarMarcadorA`: con el partido terminado por sets hay que
      // poder editar un set para reabrirlo (CE-7, RF-52). Cerrado a mano no se edita, pero
      // "Reiniciar" sigue estando: es la única vía para volver a empezar (RF-64).
      el('div', { clase: 'fin__marcador' }),
      el('nav', { clase: 'acciones acciones--fin' }, [
        boton('Copiar resumen', () => acciones.copiarResumen(), { clase: 'btn--pelota', dibujo: ICONO_COPIAR }),
        el('div', { clase: 'acciones__par' }, [
          boton('Reiniciar', () => acciones.reiniciar(), { dibujo: ICONO_REINICIAR }),
          boton('Empezar otro', () => acciones.empezarOtro(), { clase: 'btn--peligro', dibujo: ICONO_MAS }),
        ]),
        el('div', { clase: 'acciones__par' }, [
          boton('Historial', () => acciones.abrirHistorial()),
          boton('Ayuda', () => acciones.abrirAyuda()),
        ]),
      ]),
    ]),

    el('div', { clase: 'fin__der' }, [
      el('div', { clase: 'resumen-caja' }, [
        el('div', { clase: 'resumen-caja__cab' }, [
          el('span', { clase: 'micro', texto: 'Para mandar por WhatsApp' }),
          el('span', { clase: 'resumen-caja__n' }),
        ]),
        el('pre', { clase: 'resumen', tabindex: '0' }),
      ]),
    ]),
  ]);
}

// Devuelve los grupos de opciones a su valor por defecto, incluido el botón que queda
// marcado. Lo usa "Empezar otro": si sólo se vacía el input hidden, los botones siguen
// mostrando la elección anterior y el formulario miente.
export function reiniciarOpciones() {
  const porDefecto = { setsAElegir: '3', modalidad: 'punto_oro', parejaQueSacaElPrimero: '' };

  for (const [name, valor] of Object.entries(porDefecto)) {
    const oculto = document.querySelector(`input[type="hidden"][name="${name}"]`);
    if (oculto !== null) oculto.value = valor;
    const claseBoton = name === 'parejaQueSacaElPrimero' ? 'saca-btn' : 'opcion-set';
    marcarElegido(document.querySelectorAll(`[data-name="${name}"]`), valor, claseBoton);
  }
  actualizarNombresDeSaque();
}

// El marcador es un solo nodo: se muda de la vista de partido a la de fin en vez de duplicarlo,
// así que nunca hay dos marcadores desincronizados.
export function mudarMarcadorA(destino) {
  const casa = destino === 'fin' ? nodos.marcadorFin : nodos.vistas.partido;
  if (nodos.marcador.parentElement !== casa) {
    if (destino === 'fin') casa.append(nodos.marcador);
    else casa.prepend(nodos.marcador);
  }
}

// ---------------------------------------------------------------- render

export function render(estado) {
  const vista = estado.vista;

  for (const [nombre, nodo] of Object.entries(nodos.vistas)) nodo.hidden = vista !== nombre;
  const mensaje = mensajePersistencia(estado);
  nodos.avisoPersistencia.hidden = mensaje === null;
  nodos.textoPersistencia.textContent = mensaje ?? '';
  for (const nodo of Object.values(nodos.vistas)) nodo.inert = estado.avisoFin === true;
  if (estado.avisoFin) mostrarModalFin(estado);

  if (vista === 'ayuda') return;

  if (vista === 'historial' || vista === 'detalle') {
    dibujarHistorial(estado);
    return;
  }

  if (vista === 'crear') {
    actualizarPantallaCreacion(estado);
    actualizarNombresDeSaque();
    return;
  }

  dibujarCuentas(estado.partido);
  dibujarParciales(estado);
  dibujarPuntos(estado);
  dibujarPie(estado);
  dibujarEditor(estado);
  dibujarCancha(estado);
  dibujarResumen(estado);
  for (const vistaDeAcciones of [nodos.vistas.partido, nodos.vistas.fin]) {
    for (const nodo of vistaDeAcciones.querySelectorAll('.acciones button')) {
      nodo.disabled = controlesBloqueados(estado) && !['Historial', 'Ayuda', 'Copiar resumen'].includes(nodo.textContent.trim());
      if (nodo.classList.contains('btn--anular')) {
        nodo.disabled = !anulacionDisponible(estado) || estado.avisoFin === true;
      }
    }
  }
}

function actualizarPantallaCreacion(estado) {
  const completo = formularioCompleto(leerFormulario(nodos.vistas.crear));
  nodos.botonEmpezar.disabled = !completo || controlesBloqueados(estado);
}

function dibujarCuentas(partido) {
  const { A, B } = resultadoPartido(partido);
  nodos.cuenta.equipoA.textContent = nombreDeEquipo(partido, 'A');
  nodos.cuenta.equipoB.textContent = nombreDeEquipo(partido, 'B');
  nodos.cuenta.A.textContent = String(A);
  nodos.cuenta.B.textContent = String(B);
  // La pelota de saque va pegada al nombre de quien saca, en la fila 1 del marcador.
  nodos.sacaA.hidden = partido.marcador.servidor !== 'A';
  nodos.sacaB.hidden = partido.marcador.servidor !== 'B';
}

function dibujarParciales(estado) {
  const { partido } = estado;
  const editable = !controlesBloqueados(estado) && estado.conservacion !== 'eliminado' && sePuedeEditarJuegos(partido);

  // Sólo se dibujan los sets que `indicesDeSetsVisibles` deja ver: en la vista de partido, el
  // set en curso; en la de fin, todos.
  const grupos = indicesDeSetsVisibles(partido, estado.vista).map((indice) => {
    const set = partido.marcador.sets[indice];
    const enCurso = indice === indiceSetEnCurso(partido.marcador);
    const visibles = juegosVisiblesDeSet(set);
    const grupo = el('span', { clase: enCurso ? 'parcial parcial--curso' : 'parcial' });

    for (const pareja of ['A', 'B']) {
      if (pareja === 'B') grupo.append(el('span', { clase: 'parcial__guion', texto: '–' }));
      grupo.append(el('button', {
        clase: `parcial__${pareja.toLowerCase()}`,
        type: 'button',
        texto: visibles[pareja],
        disabled: !editable,
        onclick: () => acciones.tocarJuegos(indice, pareja),
      }));
    }

    return grupo;
  });

  nodos.parciales.replaceChildren(...grupos);
}

function dibujarPuntos(estado) {
  const { partido } = estado;
  const set = setEnCurso(partido);
  const editable = !controlesBloqueados(estado) && estado.conservacion !== 'eliminado' && sePuedeRegistrarPunto(partido);

  nodos.puntos.vs.textContent = enTieBreak(partido) ? 'TB' : 'punto';

  for (const pareja of ['A', 'B']) {
    const botonDePunto = nodos.puntos[pareja];
    const etiqueta = set === null ? '—' : etiquetaPunto(set, pareja);
    botonDePunto.textContent = etiqueta;
    botonDePunto.disabled = !editable;
    botonDePunto.classList.toggle('punto--etiqueta', !/^\d+$/.test(etiqueta));
    botonDePunto.classList.remove('punto--activo');
  }
}

function dibujarPie(estado) {
  const { partido } = estado;
  const partes = [];

  // Los avisos de set point y match point: píldoras de amarillo de pelota. El texto lo
  // decide el motor (`avisosDePunto`), acá solo se pinta.
  for (const aviso of avisosDePunto(partido)) {
    partes.push(el('span', { clase: 'chip-alerta', texto: aviso.texto }));
  }

  const mensaje = mensajeDeEstado(partido);
  if (mensaje !== null) partes.push(el('span', { clase: 'chip-alerta', texto: mensaje }));

  // Sin avisos no queda nada que decir ahí, y la fila se oculta: una fila vacía igual ocupa
  // alto en el marcador y le roba lugar a la cancha. El saque no vive más en este lugar: la
  // pelota pegada al nombre de la pareja, en la fila 1, ya lo dice.
  nodos.pie.replaceChildren(...partes);
  nodos.pie.hidden = partes.length === 0;
}

function dibujarEditor(estado) {
  const editor = estado.editor;
  const destino = editor?.tipo === 'juegos' ? nodos.editorParciales : nodos.editorPuntos;
  const otro = editor?.tipo === 'juegos' ? nodos.editorPuntos : nodos.editorParciales;

  otro.hidden = true;
  otro.replaceChildren();

  // El dato que se está editando se levanta: sin esto no se sabe de quién es el número.
  for (const pareja of ['A', 'B']) nodos.puntos[pareja].classList.remove('punto--activo');

  if (editor === null || controlesBloqueados(estado) || estado.conservacion === 'eliminado') {
    destino.hidden = true;
    destino.replaceChildren();
    return;
  }

  const { valores, etiquetaActual } = editorAbierto(estado);

  if (editor.tipo !== 'juegos') nodos.puntos[editor.pareja].classList.add('punto--activo');

  destino.hidden = false;

  // Si solo quedaba el valor actual, no hay nada que ofrecer y la fila se cierra (T47).
  const vacio = valores.length === 0;
  // `classList`, no `className`: pisar la clase entera borraría el modificador
  // `editor--puntos` / `editor--parciales` con el que se ubica cada fila.
  destino.classList.toggle('editor--vacio', vacio);

  if (vacio) {
    destino.replaceChildren(el('span', { texto: 'No hay otros valores posibles.' }));
    return;
  }

  destino.replaceChildren(
    el('span', { clase: 'editor__rotulo' }, [
      el('span', { clase: 'micro', texto: rotuloDelEditor(estado) }),
      el('span', { clase: 'editor__valor', texto: etiquetaActual }),
    ]),
    el('div', { clase: 'editor__opciones' }, valores.map((valor) => el('button', {
      clase: 'opcion',
      type: 'button',
      texto: etiquetaDeValor(valor),
      onclick: () => acciones.aplicarValor(editor, valor),
    }))),
    el('button', {
      clase: 'editor__cerrar',
      type: 'button',
      'aria-label': 'Cerrar la edición',
      svg: icono(ICONO_CERRAR),
      onclick: () => acciones.cerrarEditor(),
    }),
  );
}

// Qué se está editando, en palabras. Sólo el rótulo: el valor es el que ya muestra el dato.
//
// El número de set identifica el parcial que se está tocando; no es una regla.
function rotuloDelEditor(estado) {
  const { partido, editor } = estado;
  if (editor.tipo === 'juegos') return 'Juego del set ' + (editor.indiceSet + 1);
  return enTieBreak(partido) ? 'TB de' : 'Punto de';
}

function editorAbierto(estado) {
  const { partido, editor } = estado;
  const set = setEnCurso(partido);

  if (editor.tipo === 'juegos') {
    const setEditado = partido.marcador.sets[editor.indiceSet];
    return {
      valores: valoresDeJuegos(partido, editor.indiceSet, editor.pareja),
      etiquetaActual: juegosVisiblesDeSet(setEditado)[editor.pareja],
    };
  }

  const etiquetaActual = set === null ? '' : etiquetaPunto(set, editor.pareja);
  const valores = editor.tipo === 'tieBreak'
    ? valoresDeTieBreak(partido, editor.pareja)
    : valoresDePuntos(partido, editor.pareja);
  return { valores, etiquetaActual };
}

function dibujarCancha(estado) {
  const { partido } = estado;
  const puede = !controlesBloqueados(estado) && estado.conservacion !== 'eliminado' && sePuedeRegistrarPunto(partido);
  const elegido = estado.jugadorSeleccionado;

  for (const puesto of [1, 2, 3, 4]) {
    const { ficha, nombre, texto } = jugadores.get(puesto);
    const jugador = jugadorPorPuesto(partido, puesto);
    const textoNombre = jugador?.nombre ?? '';

    texto.textContent = textoNombre;

    // Los nombres largos bajan un escalón de tamaño en vez de cortarse con puntos
    // suspensivos: en la cancha se lee al jugador de frente.
    const largo = textoNombre.length > 12;
    texto.classList.toggle('ficha__nombre--largo', largo);

    const estaElegido = puede && elegido === jugador?.id;
    ficha.classList.toggle('ficha--elegida', estaElegido);
    ficha.classList.toggle('ficha--vacia', textoNombre === '');
    // Con el partido terminado tocar un jugador no hace nada (CE-15).
    nombre.disabled = !puede;
  }

  // Con una ficha elegida, las otras tres bajan un escalón: el foco va al que se está por
  // tocar. Nunca por debajo de 0.7, que es donde el nombre dejaba de leerse.
  const fichas = document.querySelector('.fichas');
  if (fichas !== null) fichas.classList.toggle('fichas--con-foco', elegido !== null && puede);
}

function dibujarResumen(estado) {
  nodos.resumen.textContent = estado.avisoFin ? '' : generarResumen(estado.partido);
  nodos.motivoFin.textContent = mensajeDeEstado(estado.partido) ?? 'Fin del partido';
  nodos.motivoFin.classList.toggle('fin__motivo--eliminado', estado.conservacion === 'eliminado');
  if (estado.conservacion === 'eliminado') nodos.motivoFin.textContent += ' · eliminado del historial, sin edición';
}

function tarjetaRegistro(registro) {
  const datos = datosDeRegistro(registro);
  return el('article', { clase: 'historico' }, [
    el('time', { datetime: registro.fechaFin, texto: datos.fecha }),
    ...datos.equipos.map((nombre, indice) => el('p', { clase: indice === 0 ? 'equipo-a' : 'equipo-b', texto: nombre })),
    el('h3', { texto: datos.resultado }),
    el('p', { clase: 'historico__motivo', texto: datos.motivo }),
    ...datos.parciales.map((parcial) => el('p', { texto: parcial })),
  ]);
}

function botonEliminar(registro, estado) {
  const nodo = boton('Eliminar', () => acciones.eliminarTerminado(registro.id), { clase: 'btn--peligro' });
  nodo.disabled = controlesBloqueados(estado) || estado.reintentoHistorial != null;
  return nodo;
}

function dibujarHistorial(estado) {
  const detalle = estado.vista === 'detalle';
  const destino = nodos.vistas[estado.vista];
  const encabezado = el('header', { clase: 'historial__cab' }, [
    el('h2', { texto: detalle ? 'Detalle del partido' : 'Historial' }),
    el('div', { clase: 'historial__botones' }, [
      boton(detalle ? 'Volver a la lista' : 'Volver', () => detalle ? acciones.abrirHistorial() : acciones.volverDeHistorial()),
      boton('Ayuda', () => acciones.abrirAyuda()),
    ]),
  ]);
  const contenido = [encabezado, el('p', { clase: 'historial__nota', texto: 'Se guarda solo en este navegador y dispositivo. Si borrás los datos del navegador, podés perder el historial.' })];
  if (estado.errorHistorial != null) {
    contenido.push(el('aside', { clase: 'conservacion' }, [
      el('p', { texto: estado.reintentoHistorial?.tipo === 'eliminar'
        ? 'No se pudo eliminar el partido. No se confirmó la eliminación; reintentá.'
        : 'No se pudo leer el historial. Los datos guardados no se borraron ni se reemplazaron.' }),
      boton('Reintentar', () => acciones.reintentarHistorial()),
    ]));
  } else if (detalle) {
    const registro = estado.registroSeleccionado;
    if (registro == null) contenido.push(el('p', { texto: 'Este partido ya no está en el historial.' }));
    else {
      const tarjeta = tarjetaRegistro(registro);
      tarjeta.append(botonEliminar(registro, estado));
      contenido.push(tarjeta, el('h3', { texto: 'Estadísticas por jugador' }));
      for (const jugador of estadisticasDeRegistro(registro.partido)) {
        const seccion = el('section', { clase: 'historico' }, [el('h3', { texto: jugador.nombre })]);
        if (jugador.sinGolpes) seccion.append(el('p', { texto: 'Sin golpes registrados' }));
        if (jugador.golpes.length > 0) {
          const tabla = el('table', { clase: 'historico__stats' }, [
            el('thead', {}, [el('tr', {}, ['Golpe', 'Winners', 'Fallos'].map((texto) => el('th', { texto }))) ]),
            el('tbody', {}, jugador.golpes.map((golpe) => el('tr', {}, [
              el('th', { texto: golpe.etiqueta }), el('td', { texto: String(golpe.winners) }), el('td', { texto: String(golpe.fallos) }),
            ]))),
          ]);
          seccion.append(tabla);
        }
        contenido.push(seccion);
      }
    }
  } else {
    const partidos = estado.historial?.estado === 'ok' ? estado.historial.partidos : [];
    if (partidos.length === 0) contenido.push(el('p', { texto: 'Todavía no hay partidos terminados.' }));
    for (const registro of ordenarHistorial(partidos)) {
      const tarjeta = tarjetaRegistro(registro);
      tarjeta.append(el('nav', { clase: 'acciones' }, [
        boton('Ver detalle', () => acciones.verDetalle(registro.id)), botonEliminar(registro, estado),
      ]));
      contenido.push(tarjeta);
    }
  }
  destino.replaceChildren(...contenido);
}

// ---------------------------------------------------------------- ayuda

// Contenido estático: se construye una vez al montar. Las maquetas son dibujos decorativos
// (aria-hidden), no controles: no hacen nada al tocarlas.
function construirAyuda() {
  const indice = el('nav', { clase: 'ayuda__indice', 'aria-label': 'Índice de la ayuda' },
    SECCIONES.map((seccion) => el('button', {
      clase: 'ayuda__enlace',
      type: 'button',
      texto: seccion.titulo,
      onclick: () => document.getElementById(`ayuda-${seccion.id}`)?.scrollIntoView({ block: 'start' }),
    })));

  return [
    el('header', { clase: 'historial__cab ayuda__cab' }, [
      el('h2', { texto: 'Ayuda' }),
      el('div', { clase: 'ayuda__cab-botones' }, [
        boton('Arriba', () => window.scrollTo({ top: 0, behavior: 'smooth' }), {
          dibujo: '<path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
        }),
        boton('Volver', () => acciones.volverDeAyuda()),
      ]),
    ]),
    el('p', { clase: 'historial__nota', texto: 'Cómo se usa Padel Scores, paso a paso. Tocá un tema para ir directo.' }),
    indice,
    ...SECCIONES.map(seccionDeAyuda),
    boton('Volver', () => acciones.volverDeAyuda(), { clase: 'ayuda__volver' }),
  ];
}

function seccionDeAyuda(seccion) {
  return el('section', { clase: 'historico ayuda__seccion', id: `ayuda-${seccion.id}` }, [
    el('h3', { texto: seccion.titulo }),
    ...seccion.bloques.map(bloqueDeAyuda),
  ]);
}

function bloqueDeAyuda(bloque) {
  switch (bloque.tipo) {
    case 'parrafo': return el('p', { texto: bloque.texto });
    case 'nota': return el('p', { clase: 'ayuda__nota', texto: bloque.texto });
    case 'pasos': return el('ol', { clase: 'ayuda__lista' }, bloque.items.map((texto) => el('li', { texto })));
    case 'lista': return el('ul', { clase: 'ayuda__lista' }, bloque.items.map((texto) => el('li', { texto })));
    case 'golpes': return el('p', { texto: `Los golpes disponibles son: ${ETIQUETAS_GOLPES.join(', ')}.` });
    case 'maqueta': return maquetaDeAyuda(bloque.id);
    case 'pregunta': return el('details', { clase: 'ayuda__pregunta' }, [
      el('summary', { texto: bloque.pregunta }),
      el('p', { texto: bloque.respuesta }),
    ]);
    default: return null;
  }
}

function maquetaDeAyuda(id) {
  const caja = (clase, hijos) => el('div', { clase: `maqueta ${clase}`, 'aria-hidden': 'true' }, hijos);
  const span = (clase, texto) => el('span', { clase, texto });

  if (id === 'formulario') {
    return caja('maqueta--formulario', [
      el('div', { clase: 'maqueta__fila' }, [span('maqueta__eq maqueta__eq--a', 'Pareja A'), span('maqueta__campo', 'Jugador 1'), span('maqueta__campo', 'Jugador 2')]),
      el('div', { clase: 'maqueta__fila' }, [span('maqueta__eq maqueta__eq--b', 'Pareja B'), span('maqueta__campo', 'Jugador 1'), span('maqueta__campo', 'Jugador 2')]),
      el('div', { clase: 'maqueta__fila' }, [span('maqueta__rotulo', 'Sets'), span('maqueta__op', '1'), span('maqueta__op maqueta__op--on', '3'), span('maqueta__op', '5')]),
      el('div', { clase: 'maqueta__fila' }, [span('maqueta__rotulo', 'Modalidad'), span('maqueta__op', 'Ventaja'), span('maqueta__op maqueta__op--on', 'Oro'), span('maqueta__op', 'Star')]),
      el('div', { clase: 'maqueta__fila' }, [span('maqueta__rotulo', 'Saca primero'), span('maqueta__op maqueta__op--on', 'Pareja A'), span('maqueta__op', 'Pareja B')]),
      el('div', { clase: 'maqueta__fila' }, [span('maqueta__empezar', 'Empezar')]),
    ]);
  }

  if (id === 'marcador') {
    return caja('maqueta--marcador', [
      el('div', { clase: 'maqueta__fila maqueta__fila--entre' }, [
        el('span', { clase: 'maqueta__nombres maqueta__nombres--a' }, [el('i', { clase: 'maqueta__pelota' }), 'Ana / Bea']),
        span('maqueta__nombres maqueta__nombres--b', 'Cris / Dani'),
      ]),
      el('div', { clase: 'maqueta__fila maqueta__fila--entre' }, [
        span('maqueta__rotulo', 'Parciales 4–3'),
        span('maqueta__rotulo', 'Sets 1 – 0'),
      ]),
      el('div', { clase: 'maqueta__fila maqueta__fila--entre' }, [
        span('maqueta__punto maqueta__punto--a', '40'),
        span('maqueta__rotulo', 'punto'),
        span('maqueta__punto maqueta__punto--b', '30'),
      ]),
      el('div', { clase: 'maqueta__fila' }, [span('chip-alerta', 'set point')]),
    ]);
  }

  if (id === 'ficha') {
    return caja('maqueta--ficha', [
      el('div', { clase: 'maqueta__ficha' }, [
        span('maqueta__jugador', 'Ana'),
        span('maqueta__res maqueta__res--ok', '✓'),
        span('maqueta__res maqueta__res--no', '✗'),
      ]),
      span('maqueta__leyenda', '✓ ganó el punto · ✗ falló: punto para la pareja rival'),
    ]);
  }

  if (id === 'golpes') {
    return caja('maqueta--golpes', [
      span('maqueta__rotulo', 'Punto de Ana · ✓ Ganó'),
      el('div', { clase: 'maqueta__grilla' }, [
        ...ETIQUETAS_GOLPES.map((etiqueta) => span(etiqueta === 'Sin especificar' ? 'maqueta__golpe maqueta__golpe--pelota' : 'maqueta__golpe', etiqueta)),
        span('maqueta__golpe maqueta__golpe--soltar', 'Descartar'),
      ]),
    ]);
  }

  if (id === 'editor') {
    return caja('maqueta--editor', [
      el('div', { clase: 'maqueta__fila' }, [span('maqueta__rotulo', 'Punto de'), span('maqueta__punto maqueta__punto--a', '40'), span('maqueta__op', '0'), span('maqueta__op', '15'), span('maqueta__op', '30'), span('maqueta__op', '✕')]),
    ]);
  }

  return null;
}

// ---------------------------------------------------------------- avisos

// Aviso flotante: se ve desde cualquier vista y desaparece solo.
export function mostrarAviso(texto, esError = false) {
  const contenedor = nodos.avisos ?? document.getElementById('avisos');
  if (contenedor === null) return;

  const aviso = el('div', {
    clase: esError ? 'aviso aviso--error' : 'aviso',
    texto,
  });
  contenedor.append(aviso);

  globalThis.setTimeout(() => aviso.remove(), esError ? 5200 : 2600);
}

// ---------------------------------------------------------------- modal

function mostrarModalFin(estado) {
  const avanzar = boton('Avanzar', () => acciones.avanzar(), { clase: 'btn--pelota' });
  avanzar.disabled = estado.pendienteGuardado != null;
  const anular = boton('Anular último punto', () => acciones.anularUltimoPunto(), { clase: 'btn--anular', dibujo: ICONO_VOLVER });
  anular.disabled = !anulacionDisponible(estado);
  const mensaje = mensajePersistencia(estado);
  const conservacion = mensaje === null ? null : el('aside', { clase: 'conservacion' }, [
    el('p', { texto: mensaje }),
    boton('Reintentar', () => acciones.reintentar()),
  ]);
  const hoja = el('div', { clase: 'hoja hoja--fin', role: 'dialog', 'aria-modal': 'true' }, [
    el('h2', { clase: 'aviso-fin__titulo', texto: mensajeDeGanadores(estado.partido) }),
    conservacion,
    el('nav', { clase: 'aviso-fin__acciones' }, [avanzar, anular]),
  ]);
  // Sin descarte ni cierre al tocar el fondo: solo Avanzar o Anular resuelven el aviso.
  nodos.capaModal.onclick = null;
  nodos.capaModal.replaceChildren(el('div', { clase: 'velo velo--fin' }), hoja);
  nodos.capaModal.hidden = false;
}

// Hoja de movimientos centrada por CSS, sin depender de la ficha ni de mediciones.
export function mostrarModalMovimientos(pendiente, alElegir, alDescartar) {
  const cerrar = () => {
    nodos.capaModal.hidden = true;
    nodos.capaModal.replaceChildren();
    nodos.capaModal.onclick = null;
  };

  // 8 movimientos de la lista fija + "Descartar" = 9 celdas: 3×3 exactas. "Sin
  // especificar" YA viene en la lista (movimientos.js), así que no se agrega otra vez:
  // duplicado sería 10 celdas y una fila huérfana.
  //
  // "Sin especificar" es el único con borde de amarillo de pelota: es el que se toca cuando
  // nadie vio qué pasó, y tiene que verse distinto de los siete movimientos de verdad.
  const botones = MOVIMIENTOS.map((movimiento) => el('button', {
    clase: movimiento.id === 'sin_especificar' ? 'mov mov--pelota' : 'mov',
    type: 'button',
    texto: movimiento.etiqueta,
    onclick: () => { cerrar(); alElegir(movimiento.id); },
  }));

  const hojas = [
    el('div', { clase: 'hoja__titulo' }, [
      el('span', { clase: 'hoja__jugador', svg: '' }),
      el('span', { clase: `hoja__resultado hoja__resultado--${pendiente.resultado === 'ganado' ? 'verde' : 'rojo'}` }, [
        el('span', { texto: pendiente.resultado === 'ganado' ? '✓ Ganó' : '✗ Falló' }),
      ]),
    ]),
    el('div', { clase: 'movs' }, [
      ...botones,
      boton('Descartar', () => { cerrar(); alDescartar(); }, { clase: 'mov mov--soltar', dibujo: ICONO_CERRAR }),
    ]),
  ];

  const titulo = hojas[0].querySelector('.hoja__jugador');
  titulo.append('Punto de ', el('em', { texto: pendiente.jugador?.nombre ?? '' }));

  nodos.capaModal.onclick = (evento) => {
    if (esToqueFuera(evento)) { cerrar(); alDescartar(); }
  };

  const hoja = el('div', { clase: 'hoja', role: 'dialog', 'aria-modal': 'true' }, hojas);
  nodos.capaModal.replaceChildren(el('div', { clase: 'velo' }), hoja);
  nodos.capaModal.hidden = false;

}

export function ocultarModal() {
  if (nodos === null) return;
  nodos.capaModal.hidden = true;
  nodos.capaModal.replaceChildren();
  nodos.capaModal.onclick = null;
}

export function hayModalAbierto() {
  return nodos !== null && nodos.capaModal.hidden === false;
}

// Reexportado para que app.js no tenga que saber de movimientos.js.
export { MOVIMIENTOS };
