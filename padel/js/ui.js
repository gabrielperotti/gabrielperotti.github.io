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
  MODALIDADES,
} from './motor.js';
import { MOVIMIENTOS } from './movimientos.js';
import { generarResumen } from './resumen.js';

export const ETIQUETAS_MODALIDAD = {
  ventaja: 'Ventaja tradicional',
  punto_oro: 'Punto de oro',
  star_point: 'Star point',
};

// ================================================================= funciones puras

// Nombre visible de una pareja: el que se le puso, o los jugadores, o "Pareja A" (S-4).
export function nombreDePareja(partido, letra) {
  const pareja = partido?.parejas?.[letra];
  if (pareja === undefined) return `Pareja ${letra}`;

  const nombre = typeof pareja.nombre === 'string' ? pareja.nombre.trim() : '';
  if (nombre !== '') return nombre;

  const jugadores = pareja.jugadores
    .map((jugador) => (typeof jugador.nombre === 'string' ? jugador.nombre.trim() : ''))
    .filter((nombreDeJugador) => nombreDeJugador !== '');
  return jugadores.length > 0 ? jugadores.join('/') : `Pareja ${letra}`;
}

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
    parejaA: { nombre: valor('nombreParejaA'), jugadores: [valor('jugadorA1'), valor('jugadorA2')] },
    parejaB: { nombre: valor('nombreParejaB'), jugadores: [valor('jugadorB1'), valor('jugadorB2')] },
    setsAElegir: numero('setsAElegir', 3),
    modalidad: valor('modalidad') || 'ventaja',
    parejaQueSacaElPrimero: valor('parejaQueSacaElPrimero') || 'A',
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

// ================================================================= DOM

// Crea un elemento. Props especiales: `clase`, `texto`, `datos` (dataset) y cualquier `on*`,
// que se engancha con addEventListener (nunca con setAttribute: ahí una función se convierte
// en texto y no ejecuta).
function el(etiqueta, props = {}, hijos = []) {
  const nodo = document.createElement(etiqueta);

  for (const [clave, valor] of Object.entries(props)) {
    if (clave === 'clase') nodo.className = valor;
    else if (clave === 'texto') nodo.textContent = valor;
    else if (clave === 'datos') Object.assign(nodo.dataset, valor);
    else if (clave.startsWith('on') && typeof valor === 'function') {
      nodo.addEventListener(clave.slice(2), valor);
    } else if (valor === true) nodo.setAttribute(clave, '');
    else if (valor !== false && valor !== null && valor !== undefined) nodo.setAttribute(clave, valor);
  }

  for (const hijo of Array.isArray(hijos) ? hijos : [hijos]) if (hijo) nodo.append(hijo);
  return nodo;
}

let nodos = null;
let jugadores = new Map();
let acciones = null;

// app.js inyecta el cableado una vez, antes de montar.
export function conectarAcciones(lasAcciones) {
  acciones = lasAcciones;
}

// Arma el esqueleto una sola vez. Las tres vistas existen siempre y se muestran u ocultan:
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
  };

  vistas.crear.append(construirCreacion());
  vistas.partido.append(construirMarcador(), construirCancha(), construirAccionesDePartido());
  vistas.fin.append(construirFin());

  contenedor.replaceChildren(vistas.crear, vistas.partido, vistas.fin);

  nodos = {
    vistas,
    capaModal,
    botonEmpezar: vistas.crear.querySelector('.boton-principal'),
    // El marcador se muda entre la vista de partido y la de fin: hay que guardar el nodo.
    marcador: vistas.partido.querySelector('.marcador'),
    parciales: vistas.partido.querySelector('.parciales'),
    editorParciales: vistas.partido.querySelector('.editor--parciales'),
    editorPuntos: vistas.partido.querySelector('.editor--puntos'),
    puntos: {
      A: vistas.partido.querySelector('.punto--a'),
      B: vistas.partido.querySelector('.punto--b'),
      vs: vistas.partido.querySelector('.puntos__vs'),
    },
    cuenta: {
      A: vistas.partido.querySelector('[data-juegos="A"]'),
      B: vistas.partido.querySelector('[data-juegos="B"]'),
      equipoA: vistas.partido.querySelector('.marcador__equipo--a'),
      equipoB: vistas.partido.querySelector('.marcador__equipo--b'),
    },
    pie: vistas.partido.querySelector('.marcador__pie'),
    resumen: vistas.fin.querySelector('.resumen'),
    marcadorFin: vistas.fin.querySelector('.fin__marcador'),
    avisos: document.getElementById('avisos'),
  };
}

// ---------------------------------------------------------------- creación

function construirCreacion() {
  const contenedor = el('div', { clase: 'creacion__campos' });

  contenedor.append(
    el('h1', { texto: 'Nuevo partido' }),
    grupoPareja('A', 'Pareja A'),
    grupoPareja('B', 'Pareja B'),
    el('div', { clase: 'creacion__opciones' }, [
      campoSelect('setsAElegir', 'Sets', [
        { valor: '1', texto: '1 set' },
        { valor: '3', texto: '3 sets' },
        { valor: '5', texto: '5 sets' },
      ], '3'),
      campoSelect('modalidad', 'Modalidad', MODALIDADES.map((id) => ({
        valor: id,
        texto: ETIQUETAS_MODALIDAD[id] ?? id,
      })), 'ventaja'),
      campoSelect('parejaQueSacaElPrimero', 'Quién saca el primero', [
        { valor: 'A', texto: 'Pareja A' },
        { valor: 'B', texto: 'Pareja B' },
      ], 'A'),
    ]),
    el('p', { clase: 'aviso-mini', texto: 'Los 4 nombres de jugador son obligatorios.' }),
    el('button', {
      clase: 'boton-principal',
      type: 'button',
      texto: 'Empezar',
      onclick: () => acciones.empezar(),
    }),
  );

  return contenedor;
}

function grupoPareja(letra, rotulo) {
  const casillas = ['1', '2'].map((n) => el('input', {
    type: 'text',
    name: `jugador${letra}${n}`,
    placeholder: `Jugador ${n} de la ${rotulo.toLowerCase()}`,
    autocomplete: 'off',
    required: true,
  }));

  return el('div', { clase: `creacion__pareja creacion__pareja--${letra.toLowerCase()}` }, [
    el('p', { clase: 'creacion__rotulo', texto: rotulo }),
    el('input', {
      type: 'text',
      name: `nombrePareja${letra}`,
      placeholder: 'Nombre de la pareja (opcional)',
      autocomplete: 'off',
    }),
    ...casillas,
  ]);
}

function campoSelect(name, rotulo, opciones, porDefecto) {
  const select = el('select', { name });
  for (const opcion of opciones) {
    select.append(el('option', { value: opcion.valor, texto: opcion.texto, selected: opcion.valor === porDefecto }));
  }
  return el('label', { clase: 'campo' }, [el('span', { texto: rotulo }), select]);
}

// ---------------------------------------------------------------- marcador

function construirMarcador() {
  return el('header', { clase: 'marcador' }, [
    el('div', { clase: 'marcador__sets' }, [
      el('span', { clase: 'marcador__equipo marcador__equipo--a' }),
      el('div', { clase: 'marcador__cuenta' }, [
        el('b', { datos: { juegos: 'A' } }),
        el('span', { texto: 'sets' }),
        el('b', { datos: { juegos: 'B' } }),
      ]),
      el('span', { clase: 'marcador__equipo marcador__equipo--b' }),
    ]),
    el('div', { clase: 'parciales' }),
    el('div', { clase: 'editor editor--parciales', hidden: true }),
    el('div', { clase: 'puntos' }, [
      puntoDePareja('A'),
      el('div', { clase: 'puntos__vs' }),
      puntoDePareja('B'),
    ]),
    el('div', { clase: 'editor editor--puntos', hidden: true }),
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
  const cancha = el('main', { clase: 'cancha' });
  for (const puesto of [1, 2, 3, 4]) cancha.append(construirJugador(puesto));
  return cancha;
}

// Un `<div>` con el nombre y los botones como hermanos. Meter botones dentro del botón del
// jugador era HTML inválido (contenido interactivo anidado) y obligaba a.paddingar el nombre
// para que el botón no quedara debajo: ese padding inflaba la columna del grid y empujaba la
// cancha fuera de pantalla. Ahora los botones van en una capa aparte, sin tocar el nombre.
function construirJugador(puesto) {
  const letra = puesto <= 2 ? 'A' : 'B';

  const nombre = el('button', {
    clase: 'jugador__nombre',
    type: 'button',
    onclick: () => acciones.tocarJugador(puesto),
  });

  const accionesDelJugador = el('div', { clase: 'jugador__acciones' }, [
    el('button', {
      clase: 'resultado resultado--verde',
      type: 'button',
      texto: '✓',
      'aria-label': 'Punto a favor del jugador',
      onclick: () => acciones.elegirResultado(puesto, 'ganado'),
    }),
    el('button', {
      clase: 'resultado resultado--rojo',
      type: 'button',
      texto: '✗',
      'aria-label': 'Fallo del jugador: el punto es de la pareja rival',
      onclick: () => acciones.elegirResultado(puesto, 'fallado'),
    }),
  ]);

  const celda = el('div', {
    clase: `jugador jugador--${letra.toLowerCase()} jugador--${puesto <= 2 ? 'arriba' : 'abajo'}`,
    datos: { puesto: String(puesto) },
  }, [nombre, accionesDelJugador]);

  jugadores.set(puesto, { celda, nombre });
  return celda;
}

function construirAccionesDePartido() {
  return el('nav', { clase: 'acciones' }, [
    el('button', { type: 'button', texto: 'Copiar', onclick: () => acciones.copiarResumen() }),
    el('button', { type: 'button', texto: 'Reiniciar', onclick: () => acciones.reiniciar() }),
    el('button', { clase: 'peligro', type: 'button', texto: 'Cerrar', onclick: () => acciones.cerrar() }),
  ]);
}

function construirFin() {
  return el('div', { clase: 'fin' }, [
    el('h2', { texto: '¡Se terminó!' }),
    // El marcador se muda acá con `mudarMarcadorA`: con el partido terminado por sets hay que
    // poder editar un set para reabrirlo (CE-7, RF-52). Cerrado a mano no se edita, pero
    // "Reiniciar" sigue estando: es la única vía para volver a empezar (RF-64).
    el('div', { clase: 'fin__marcador' }),
    el('pre', { clase: 'resumen', tabindex: '0' }),
    el('nav', { clase: 'acciones' }, [
      el('button', { type: 'button', texto: 'Copiar', onclick: () => acciones.copiarResumen() }),
      el('button', { type: 'button', texto: 'Reiniciar', onclick: () => acciones.reiniciar() }),
      el('button', { clase: 'peligro', type: 'button', texto: 'Empezar otro', onclick: () => acciones.empezarOtro() }),
    ]),
  ]);
}

// El marcador es un solo nodo: se muda de la vista de partido a la de fin en vez de duplicarlo,
// así que nunca hay dos marcadores desincronizados.
export function mudarMarcadorA(destino) {
  const casa = destino === 'fin' ? nodos.marcadorFin : nodos.vistas.partido;
  if (nodos.marcador.parentElement !== casa) casa.append(nodos.marcador);
}

// ---------------------------------------------------------------- render

export function render(estado) {
  const vista = estado.vista;

  nodos.vistas.crear.hidden = vista !== 'crear';
  nodos.vistas.partido.hidden = vista !== 'partido';
  nodos.vistas.fin.hidden = vista !== 'fin';

  if (vista === 'crear') {
    actualizarPantallaCreacion();
    return;
  }

  dibujarCuentas(estado.partido);
  dibujarParciales(estado);
  dibujarPuntos(estado);
  dibujarPie(estado);
  dibujarEditor(estado);
  dibujarCancha(estado);
  dibujarResumen(estado);
}

function actualizarPantallaCreacion() {
  const completo = formularioCompleto(leerFormulario(nodos.vistas.crear));
  nodos.botonEmpezar.disabled = !completo;
}

function dibujarCuentas(partido) {
  const { A, B } = resultadoPartido(partido);
  nodos.cuenta.equipoA.textContent = nombreDePareja(partido, 'A');
  nodos.cuenta.equipoB.textContent = nombreDePareja(partido, 'B');
  nodos.cuenta.A.textContent = String(A);
  nodos.cuenta.B.textContent = String(B);
}

function dibujarParciales(estado) {
  const { partido } = estado;
  const editable = sePuedeEditarJuegos(partido);

  const grupos = partido.marcador.sets.map((set, indice) => {
    const enCurso = indice === indiceSetEnCurso(partido.marcador);
    const visibles = juegosVisiblesDeSet(set);
    const grupo = el('span', { clase: enCurso ? 'parcial parcial--en-curso' : 'parcial' });

    for (const pareja of ['A', 'B']) {
      if (pareja === 'B') grupo.append(el('span', { clase: 'parcial__guion', texto: '-' }));
      grupo.append(el('button', {
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
  const editable = sePuedeRegistrarPunto(partido);

  nodos.puntos.vs.textContent = enTieBreak(partido) ? 'TB' : 'punto';

  for (const pareja of ['A', 'B']) {
    const boton = nodos.puntos[pareja];
    const etiqueta = set === null ? '—' : etiquetaPunto(set, pareja);
    boton.textContent = etiqueta;
    boton.disabled = !editable;
    boton.classList.toggle('punto--etiqueta', !/^\d+$/.test(etiqueta));
  }
}

function dibujarPie(estado) {
  const { partido } = estado;
  const partes = [
    el('span', { texto: `Saca: ${nombreDePareja(partido, partido.marcador.servidor)}` }),
  ];

  for (const aviso of avisosDePunto(partido)) {
    partes.push(el('span', { clase: 'aviso-punto', texto: `${nombreDePareja(partido, aviso.pareja)}: ${aviso.texto}` }));
  }

  const mensaje = mensajeDeEstado(partido);
  if (mensaje !== null) partes.push(el('span', { clase: 'aviso-fin', texto: mensaje }));

  nodos.pie.replaceChildren(...partes);
}

function dibujarEditor(estado) {
  const editor = estado.editor;
  const destino = editor?.tipo === 'juegos' ? nodos.editorParciales : nodos.editorPuntos;
  const otro = editor?.tipo === 'juegos' ? nodos.editorPuntos : nodos.editorParciales;

  otro.hidden = true;
  otro.replaceChildren();

  if (editor === null) {
    destino.hidden = true;
    destino.replaceChildren();
    return;
  }

  const { valores, etiquetaActual } = editorAbierto(estado);

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
    el('span', { clase: 'editor__actual', texto: `${etiquetaActual} →` }),
    ...valores.map((valor) => el('button', {
      type: 'button',
      texto: etiquetaDeValor(valor),
      onclick: () => acciones.aplicarValor(editor, valor),
    })),
  );
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
  const puede = sePuedeRegistrarPunto(partido);

  for (const puesto of [1, 2, 3, 4]) {
    const { celda, nombre } = jugadores.get(puesto);
    const jugador = jugadorPorPuesto(partido, puesto);
    nombre.textContent = jugador?.nombre ?? '';

    celda.classList.toggle('jugador--seleccionado', puede && estado.jugadorSeleccionado === jugador?.id);
    // Con el partido terminado tocar un jugador no hace nada (CE-15).
    nombre.disabled = !puede;
  }
}

function dibujarResumen(estado) {
  nodos.resumen.textContent = generarResumen(estado.partido);
}

// ---------------------------------------------------------------- avisos y copia manual

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

// El resumen a la vista y seleccionable, para cuando la copia automática no pudoarse
// (contexto no seguro: sirviendo por la IP de la LAN no hay portapapeles).
export function mostrarModalResumen(texto, alReintentar) {
  const cerrar = () => ocultarModal();

  const modal = el('div', { clase: 'modal', role: 'dialog', 'aria-modal': 'true' }, [
    el('h2', { clase: 'modal__titulo', texto: 'Resumen del partido' }),
    el('pre', { clase: 'resumen-modal', tabindex: '0', texto }),
    el('nav', { clase: 'acciones' }, [
      el('button', { type: 'button', texto: 'Copiar', onclick: () => alReintentar() }),
      el('button', { type: 'button', texto: 'Cerrar', onclick: cerrar }),
    ]),
  ]);

  nodos.capaModal.onclick = (evento) => { if (evento.target === nodos.capaModal) cerrar(); };
  nodos.capaModal.replaceChildren(modal);
  nodos.capaModal.hidden = false;
}

// ---------------------------------------------------------------- modal

// Modal de movimientos: entra casi a pantalla completa (T45). Toca fuera lo descarta.
export function mostrarModalMovimientos(pendiente, alElegir, alDescartar) {
  const cerrar = () => {
    nodos.capaModal.hidden = true;
    nodos.capaModal.replaceChildren();
    nodos.capaModal.onclick = null;
  };

  const botones = MOVIMIENTOS.map((movimiento) => el('button', {
    type: 'button',
    texto: movimiento.etiqueta,
    onclick: () => { cerrar(); alElegir(movimiento.id); },
  }));

  const modal = el('div', { clase: 'modal', role: 'dialog', 'aria-modal': 'true' }, [
    el('h2', {
      clase: 'modal__titulo',
      texto: tituloDelPuntoPendiente(pendiente.jugador, pendiente.resultado),
    }),
    el('div', { clase: 'modal__movimientos' }, botones),
    el('button', {
      clase: 'modal__descartar',
      type: 'button',
      texto: 'Descartar',
      onclick: () => { cerrar(); alDescartar(); },
    }),
  ]);

  nodos.capaModal.onclick = (evento) => {
    if (evento.target === nodos.capaModal) { cerrar(); alDescartar(); }
  };
  nodos.capaModal.replaceChildren(modal);
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