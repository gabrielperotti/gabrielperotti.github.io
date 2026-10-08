// Arranque y cableado. Es el dueño del estado en memoria: aplica las acciones llamando al
// motor, persiste después de cada cambio y vuelve a dibujar.
//
// El estado de la UI (qué jugador está seleccionado, qué fila de edición está abierta) vive acá
// también, y es solo de esta sesión: no se persiste ni es parte del partido.

import {
  crearPartido,
  scorePoint,
  editarPuntos,
  editarPuntoDeTieBreak,
  editarJuegos,
  reiniciar,
  cerrar,
  estaTerminado,
  setEnCurso,
} from './motor.js';
import { crearAlmacen } from './estado.js';
import { generarResumen } from './resumen.js';
import * as ui from './ui.js';

const almacen = crearAlmacen();

// Estado de la UI. `partido` es la única fuente de verdad del marcador.
let estado = {
  partido: null,
  vista: 'crear',
  jugadorSeleccionado: null,
  pendiente: null,
  editor: null,
};

// ================================================================= acciones

const acciones = {
  // ---------------------------------------------------------------- creación

  empezar() {
    const datos = ui.leerFormulario(document.querySelector('.creacion'));
    if (!ui.formularioCompleto(datos)) return;

    // No hay dos partidos en paralelo: uno nuevo es empezar de cero (RF-9).
    estado.partido = crearPartido(datos);
    estado.vista = 'partido';
    limpiarTodo();
    persistir();
    dibujar();
  },

  empezarOtro() {
    almacen.limpiar();
    estado.partido = null;
    estado.vista = 'crear';
    limpiarTodo();
    ui.mudarMarcadorA('partido');
    reiniciarFormulario();
    dibujar();
  },

  // ---------------------------------------------------------------- 3 toques

  tocarJugador(puesto) {
    if (estado.partido === null) return;
    // Con el partido terminado, tocar un jugador no muestra los botones (CE-15).
    if (!ui.sePuedeRegistrarPunto(estado.partido)) return;

    const jugador = ui.jugadorPorPuesto(estado.partido, puesto);
    if (jugador === null) return;

    // Tocar otro jugador con los botones visibles cambia la selección (RF-34).
    estado.jugadorSeleccionado = jugador.id;
    dibujar();
  },

  elegirResultado(puesto, resultado) {
    if (estado.partido === null) return;
    if (!ui.sePuedeRegistrarPunto(estado.partido)) return;

    const jugador = ui.jugadorPorPuesto(estado.partido, puesto);
    if (jugador === null) return;

    // El punto todavía no existe: recién se registra cuando se elige el movimiento (RF-31).
    estado.pendiente = { jugador, pareja: puesto <= 2 ? 'A' : 'B', resultado };
    dibujar();

    ui.mostrarModalMovimientos(
      estado.pendiente,
      (movimientoId) => confirmarPunto(movimientoId),
      descartarPunto,
    );
  },

  // ---------------------------------------------------------------- edición

  tocarPunto(pareja) {
    if (estado.partido === null) return;
    if (setEnCurso(estado.partido) === null) return;

    // Un set en tie-break tiene su propio editor, no el de 0/15/30/40.
    // "¿Estamos en tie-break?" lo responde `derivados`, no la fase: si el motor renombra la
    // fase, este archivo no se entera (menor 6).
    const tipo = ui.enTieBreak(estado.partido) ? 'tieBreak' : 'puntos';

    // Si no hay ningún valor distinto del actual, no se abre una fila vacía (T47).
    const hayValores = tipo === 'tieBreak'
      ? ui.valoresDeTieBreak(estado.partido, pareja).length > 0
      : ui.valoresDePuntos(estado.partido, pareja).length > 0;

    estado.editor = hayValores ? { tipo, pareja } : null;
    dibujar();
  },

  tocarJuegos(indiceSet, pareja) {
    const { partido } = estado;
    if (partido === null) return;
    if (!ui.sePuedeEditarJuegos(partido)) return;
    if (indiceSet < 0 || indiceSet >= partido.marcador.sets.length) return;

    const hayValores = ui.valoresDeJuegos(partido, indiceSet, pareja).length > 0;
    estado.editor = hayValores ? { tipo: 'juegos', indiceSet, pareja } : null;
    dibujar();
  },

  cerrarEditor() {
    estado.editor = null;
    dibujar();
  },

  aplicarValor(editor, valor) {
    const { partido } = estado;
    estado.editor = null;

    if (editor.tipo === 'juegos') {
      aplicar(editarJuegos(partido, editor.indiceSet, editor.pareja, valor));
    } else if (editor.tipo === 'tieBreak') {
      aplicar(editarPuntoDeTieBreak(partido, editor.pareja, valor));
    } else {
      aplicar(editarPuntos(partido, editor.pareja, valor));
    }

    // Editar con el partido terminado por sets lo reabre: el marcador queda arriba y hay que
    // volver a la vista de partido para poder registrar puntos otra vez (CE-7).
    if (estado.vista === 'fin' && !estaTerminado(estado.partido)) volverAlPartido();
  },

  // ---------------------------------------------------------------- fin

  reiniciar() {
    if (estado.partido === null) return;
    if (!confirmar('¿Reiniciar el partido? Se borran el marcador y las estadísticas.')) return;

    // Conserva configuración y nombres, vuelve marcador y estadísticas a cero (RF-66).
    estado.jugadorSeleccionado = null;
    aplicar(reiniciar(estado.partido));
  },

  cerrar() {
    if (estado.partido === null) return;
    if (!confirmar('¿Cerrar el partido? Es definitivo: solo reiniciar permite volver a empezar.')) return;

    aplicar(cerrar(estado.partido));
    // Cerrar a mano deja el resumen en pantalla hasta elegir "Empezar otro" (RF-82).
    mostrarFin();
  },

  copiarResumen() {
    if (estado.partido === null) return;
    copiarResumen(estado.partido, estado.vista);
  },
};

// Un punto se registra recién con el movimiento elegido: antes no existe (RF-31, RF-33).
function confirmarPunto(movimientoId) {
  const pendiente = estado.pendiente;
  if (pendiente === null) return;

  estado.pendiente = null;
  ui.ocultarModal();

  aplicar(scorePoint(estado.partido, pendiente.pareja, {
    jugadorId: pendiente.jugador.id,
    resultado: pendiente.resultado,
    movimientoId,
  }));

  // El jugador ya no queda elegido: el punto está anotado, así que los botones verde/rojo
  // desaparecen y la ficha vuelve a su estado normal. Para el siguiente punto hay que volver
  // a tocar el jugador.
  estado.jugadorSeleccionado = null;
  dibujar();
}

function descartarPunto() {
  // Descartar el modal no registra nada (RF-33).
  estado.pendiente = null;
  // La selección se limpia también acá: si no, el modal descartado dejaba a un jugador con
  // los botones verdes y rojos abiertos y ningún flujo los cerraba.
  estado.jugadorSeleccionado = null;
  ui.ocultarModal();
  dibujar();
}

// Copia el resumen. La API de portapapeles solo existe en contexto seguro: sirviendo por la
// IP de la LAN (el procedimiento de AGENTS.md) no hay contexto seguro y SIEMPRE falla. Por eso
// copiar es el atajo y el texto a mano es la vía real: si la copia falla, se muestra el resumen
// en pantalla, seleccionable (RF-81).
async function copiarResumen(partido, vista) {
  const texto = generarResumen(partido);

  try {
    if (globalThis.navigator?.clipboard?.writeText === undefined) throw new Error('Sin API de portapapeles');
    await globalThis.navigator.clipboard.writeText(texto);
    ui.mostrarAviso('¡Resumen copiado!', false);
    return;
  } catch {
    // En la pantalla de fin el texto ya está a la vista: alcanza con avisar.
    if (vista === 'fin') {
      ui.mostrarAviso('No se pudo copiar: seleccioná el texto de arriba y copialo a mano.', true);
      return;
    }
    ui.mostrarModalResumen(texto, () => copiarResumen(partido, vista));
    ui.mostrarAviso('No se pudo copiar. Seleccioná el texto y copialo a mano.', true);
  }
}

function confirmar(pregunta) {
  return globalThis.confirm(pregunta);
}

// ================================================================= flujo de estado

function dibujar() {
  ui.render(estado);
}

// Toda acción mutante pasa por acá. El motor devuelve el mismo objeto cuando no cambió nada,
// así que comparar referencias dice si la acción surtió efecto.
function aplicar(nuevoPartido, { limpiar = false } = {}) {
  const cambio = nuevoPartido !== estado.partido;
  estado.partido = nuevoPartido;

  if (limpiar) limpiarTodo();
  if (cambio) persistir();

  dibujar();

  // El fin automático no pide confirmación: muestra el resultado y el resumen (RF-61).
  if (cambio && terminoSolo()) mostrarFin();
}

function terminoSolo() {
  return estado.partido !== null
    && estado.partido.motivoFin === 'sets'
    && estado.vista !== 'fin';
}

// La pantalla de fin se queda con el marcador encima: es la única forma de reabrir el partido
// editando un set (CE-7, RF-52). El marcador es el mismo nodo, mudado de lugar.
function mostrarFin() {
  estado.vista = 'fin';
  limpiarTodo();
  ui.mudarMarcadorA('fin');
  dibujar();
}

function volverAlPartido() {
  estado.vista = 'partido';
  ui.mudarMarcadorA('partido');
  dibujar();
}

function limpiarTodo() {
  estado.jugadorSeleccionado = null;
  estado.pendiente = null;
  estado.editor = null;
  ui.ocultarModal();
}

// Al terminar se limpia lo guardado (RF-58). El resumen sale del estado en memoria, así que
// sigue estando disponible aunque no quede nada persistido (RF-82).
function persistir() {
  if (estado.partido === null) return;
  if (estaTerminado(estado.partido)) almacen.limpiar();
  else almacen.guardar(estado.partido);
}

// "Empezar otro" vuelve a la creación con la configuración en cero (RF-65).
function reiniciarFormulario() {
  const formulario = document.querySelector('.creacion');
  if (formulario === null) return;

  // Sólo los de texto: los `<input hidden>` de los grupos de opciones llevan la
  // configuración y hay que ponerlos en su valor por defecto, no vaciarlos.
  for (const control of formulario.querySelectorAll('input[type="text"]')) control.value = '';

  ui.reiniciarOpciones();
}

// ================================================================= arranque

export function iniciar({ contenedor, capaModal } = {}) {
  ui.conectarAcciones(acciones);
  ui.montar(
    contenedor ?? document.getElementById('app'),
    capaModal ?? document.getElementById('capa-modal'),
  );

  // La creación se revalida mientras se escribe, sin redibujar el formulario.
  document.querySelector('.creacion')?.addEventListener('input', () => ui.render(estado));

  // Si hay un partido guardado se retoma directo, sin pantalla intermedia (RF-57).
  const guardado = almacen.cargar();
  if (guardado !== null) {
    estado.partido = guardado;
    estado.vista = 'partido';
  }

  dibujar();
  return estado;
}

iniciar();

export { estado, acciones };