// Arranque y cableado. Es el dueño del estado en memoria: aplica las acciones llamando al
// motor, persiste después de cada cambio y vuelve a dibujar.
//
// El estado de la UI (qué jugador está seleccionado, qué fila de edición está abierta) vive acá
// también, y es solo de esta sesión: no se persiste ni es parte del partido.

import {
  crearPartido,
  scorePoint,
  capturarAntesDelPunto,
  puedeAnularUltimoPunto as tokenEsAnulable,
  anularUltimoPunto,
  editarPuntos,
  editarPuntoDeTieBreak,
  editarJuegos,
  reiniciar,
  cerrar,
  estaTerminado,
  setEnCurso,
} from './motor.js';
import { crearAlmacen } from './estado.js';
import { crearCiclo } from './ciclo-partido.js';
import { generarResumen } from './resumen.js';
import * as ui from './ui.js';

const almacen = crearAlmacen();
const ciclo = crearCiclo({ almacen });

// Estado de la UI. `partido` es la única fuente de verdad del marcador.
let estado = {
  partido: null,
  vista: 'crear',
  jugadorSeleccionado: null,
  pendiente: null,
  editor: null,
  seguimiento: null,
  conservacion: 'activo',
  pendienteGuardado: null,
  errorPersistencia: null,
  vistaRetorno: 'crear',
  vistaRetornoAyuda: 'crear',
  historial: { estado: 'ausente' },
  registroId: null,
  registroSeleccionado: null,
  errorHistorial: null,
  reintentoHistorial: null,
  ultimoPunto: null,
  avisoFin: false,
};

// ================================================================= acciones

const acciones = {
  // ---------------------------------------------------------------- creación

  empezar() {
    if (!puedeCambiar()) return;
    const datos = ui.leerFormulario(document.querySelector('.creacion'));
    if (!ui.formularioCompleto(datos)) return;
    if (!['A', 'B'].includes(datos.parejaQueSacaElPrimero)) {
      ui.mostrarAviso('Elegí qué pareja saca el primero.', true);
      return;
    }

    // No hay dos partidos en paralelo: uno nuevo es empezar de cero (RF-9).
    descartarAnulacion();
    if (!recibir(ciclo.iniciar(sesionActual(), crearPartido(datos)))) {
      dibujar();
      return;
    }
    estado.vista = 'partido';
    limpiarTodo();
    dibujar();
  },

  empezarOtro() {
    if (!puedeCambiar()) return;
    descartarAnulacion();
    if (!recibir(ciclo.liberar(sesionActual()))) {
      dibujar();
      return;
    }
    estado.vista = 'crear';
    limpiarTodo();
    ui.mudarMarcadorA('partido');
    reiniciarFormulario();
    dibujar();
  },

  // ---------------------------------------------------------------- 3 toques

  tocarJugador(puesto) {
    if (!puedeCambiar({ editar: true })) return;
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
    if (!puedeCambiar({ editar: true })) return;
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

  anularUltimoPunto() {
    if (!puedeCambiar({ editar: true, desdeAviso: true }) || !puedeAnularUltimoPunto()) return;
    const anterior = anularUltimoPunto(estado.partido, estado.ultimoPunto);
    // Consumir antes de conservar: un error deja el candidato en el ciclo, no otro undo.
    descartarAnulacion();
    limpiarTodo();
    aplicar(anterior);
    volverAlPartido();
  },

  tocarPunto(pareja) {
    if (!puedeCambiar({ editar: true })) return;
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
    if (!puedeCambiar({ editar: true })) return;
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
    if (!puedeCambiar({ editar: true }) || estado.partido === null) return;
    const { partido } = estado;
    estado.editor = null;
    descartarAnulacion();

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

  avanzar() {
    if (!estado.avisoFin || !puedeCambiar({ desdeAviso: true })) return;
    descartarAnulacion();
    mostrarFin();
  },

  reiniciar() {
    if (!puedeCambiar()) return;
    if (estado.partido === null) return;
    if (!confirmar('¿Reiniciar el partido? Se borran el marcador y las estadísticas.')) return;
    descartarAnulacion();

    // Conserva configuración y nombres, vuelve marcador y estadísticas a cero (RF-66).
    estado.jugadorSeleccionado = null;
    const resultado = ciclo.iniciar(sesionActual(), reiniciar(estado.partido));
    recibir(resultado);
    if (resultado.estado === 'ok') {
      limpiarTodo();
      volverAlPartido();
    } else dibujar();
  },

  cerrar() {
    if (!puedeCambiar({ editar: true })) return;
    if (estado.partido === null) return;
    if (!confirmar('¿Cerrar el partido? Es definitivo: solo reiniciar permite volver a empezar.')) return;
    descartarAnulacion();

    aplicar(cerrar(estado.partido));
    // Cerrar a mano deja el resumen en pantalla hasta elegir "Empezar otro" (RF-82).
    mostrarFin();
  },

  copiarResumen() {
    if (estado.partido === null) return;
    copiarResumen(estado.partido);
  },

  reintentar() {
    if (estado.pendienteGuardado === null && estado.errorHistorial !== null) {
      acciones.reintentarHistorial();
      return;
    }
    const historica = ['historial', 'detalle'].includes(estado.vista);
    const eliminando = estado.seguimiento?.operacion === 'eliminar';
    const liberando = estado.pendienteGuardado?.tipo === 'liberar';
    const resultado = ciclo.reintentar(sesionActual());
    recibir(resultado);
    if (liberando && resultado.estado === 'ok') reiniciarFormulario();
    limpiarTodo();
    if (historica) {
      estado.vistaRetorno = estado.partido === null ? 'crear' : estaTerminado(estado.partido) ? 'fin' : 'partido';
      if (eliminando && resultado.estado === 'ok') estado.vista = 'historial';
      leerHistorial();
      dibujar();
    } else sincronizarVista();
  },

  eliminarTerminado(id) {
    if (!puedeCambiar() || estado.reintentoHistorial !== null) return;
    if (!confirmar('¿Eliminar este partido del historial? No se puede recuperar.')) return;
    return eliminarConfirmado(id);
  },

  abrirHistorial() {
    if (estado.avisoFin) return;
    if (!['historial', 'detalle'].includes(estado.vista)) estado.vistaRetorno = estado.vista;
    limpiarTodo();
    estado.vista = 'historial';
    estado.registroId = null;
    estado.registroSeleccionado = null;
    leerHistorial();
    dibujar();
  },

  verDetalle(id) {
    if (estado.avisoFin) return;
    limpiarTodo();
    estado.vista = 'detalle';
    estado.registroId = id;
    leerHistorial();
    dibujar();
  },

  volverDeHistorial() {
    limpiarTodo();
    estado.vista = estado.vistaRetorno;
    if (estado.partido !== null) ui.mudarMarcadorA(estado.vista === 'fin' ? 'fin' : 'partido');
    dibujar();
  },

  // La ayuda es contenido estático: no toca el partido. Vuelve a la vista desde la que se abrió
  // (incluidos historial y detalle, que conservan lo que estaban mostrando).
  abrirAyuda() {
    if (estado.avisoFin || estado.vista === 'ayuda') return;
    estado.vistaRetornoAyuda = estado.vista;
    limpiarTodo();
    estado.vista = 'ayuda';
    dibujar();
  },

  volverDeAyuda() {
    if (estado.vista !== 'ayuda') return;
    limpiarTodo();
    estado.vista = estado.vistaRetornoAyuda;
    if (estado.partido !== null && ['partido', 'fin'].includes(estado.vista)) ui.mudarMarcadorA(estado.vista);
    dibujar();
  },

  reintentarHistorial() {
    if (estado.reintentoHistorial?.tipo === 'eliminar') {
      eliminarConfirmado(estado.reintentoHistorial.id);
    } else {
      leerHistorial();
      dibujar();
    }
  },
};

function eliminarConfirmado(id) {
  if (!puedeCambiar()) return;
  if (estado.seguimiento?.id === id && estaTerminado(estado.partido)) descartarAnulacion();
  const resultado = ciclo.eliminar(sesionActual(), id);
  if (resultado.sesion.pendiente !== null || resultado.estado === 'ok') recibir(resultado);
  if (resultado.estado === 'error' && resultado.sesion.pendiente === null) {
    estado.errorHistorial = resultado;
    estado.reintentoHistorial = { tipo: 'eliminar', id };
  } else if (resultado.estado === 'ok') {
    estado.errorHistorial = null;
    estado.reintentoHistorial = null;
    estado.vista = 'historial';
    estado.registroId = null;
    estado.registroSeleccionado = null;
    leerHistorial();
  }
  dibujar();
  return resultado;
}

function leerHistorial() {
  const lectura = almacen.cargarHistorial();
  estado.historial = lectura;
  estado.registroSeleccionado = lectura.estado === 'ok'
    ? lectura.partidos.find((registro) => registro.id === estado.registroId) ?? null : null;
  if (lectura.estado === 'error') {
    estado.errorHistorial = lectura;
    if (estado.reintentoHistorial?.tipo !== 'eliminar') estado.reintentoHistorial = { tipo: 'leer' };
  } else if (estado.reintentoHistorial?.tipo !== 'eliminar') {
    estado.errorHistorial = null;
    estado.reintentoHistorial = null;
  }
}

// Un punto se registra recién con el movimiento elegido: antes no existe (RF-31, RF-33).
function confirmarPunto(movimientoId) {
  if (!puedeCambiar({ editar: true })) return;
  const pendiente = estado.pendiente;
  if (pendiente === null) return;

  estado.pendiente = null;
  ui.ocultarModal();

  const antes = capturarAntesDelPunto(estado.partido);
  const despues = scorePoint(estado.partido, pendiente.pareja, {
    jugadorId: pendiente.jugador.id,
    resultado: pendiente.resultado,
    movimientoId,
  });
  if (despues !== estado.partido) {
    estado.ultimoPunto = { antes, despues };
    estado.avisoFin = estaTerminado(despues) && despues.motivoFin === 'sets';
  }
  aplicar(despues);

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

// Copia el resumen. Solo se llama desde la pantalla de fin: con el partido en curso no hay
// botón (el resumen es el resultado, no un estado parcial).
//
// La API de portapapeles solo existe en contexto seguro: sirviendo por la IP de la LAN (el
// procedimiento de AGENTS.md) no hay contexto seguro y SIEMPRE falla. Por eso copiar es el
// atajo y el texto a mano es la vía real: si la copia falla, se avisa y la persona selecciona
// el texto del `.resumen`, que ya está a la vista y es seleccionable (RF-81).
async function copiarResumen(partido) {
  const texto = generarResumen(partido);

  try {
    if (globalThis.navigator?.clipboard?.writeText === undefined) throw new Error('Sin API de portapapeles');
    await globalThis.navigator.clipboard.writeText(texto);
    ui.mostrarAviso('¡Resumen copiado!', false);
  } catch {
    ui.mostrarAviso('No se pudo copiar: seleccioná el texto de arriba y copialo a mano.', true);
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
  if (cambio) recibir(ciclo.aplicar(sesionActual(), nuevoPartido));

  if (limpiar) limpiarTodo();

  dibujar();

  // Edición terminal conserva el fin habitual; una carga terminal espera Avanzar/Anular.
  if (cambio && !estado.avisoFin && terminoSolo()) mostrarFin();
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

function sesionActual() {
  return {
    partido: estado.partido, seguimiento: estado.seguimiento, conservacion: estado.conservacion,
    pendiente: estado.pendienteGuardado, error: estado.errorPersistencia,
  };
}

// Consulta compartida con los futuros controles; no basta con deshabilitar el botón.
export function puedeAnularUltimoPunto() {
  return estado.pendienteGuardado === null && estado.conservacion !== 'eliminado'
    && tokenEsAnulable(estado.partido, estado.ultimoPunto);
}

function descartarAnulacion() {
  estado.ultimoPunto = null;
  estado.avisoFin = false;
}

function recibir(resultado) {
  const sesion = resultado.sesion;
  estado.partido = sesion.partido;
  estado.seguimiento = sesion.seguimiento;
  estado.conservacion = sesion.conservacion;
  estado.pendienteGuardado = sesion.pendiente;
  estado.errorPersistencia = sesion.error ?? (resultado.estado === 'error' ? resultado : null);
  if (resultado.estado === 'error') {
    const mensaje = resultado.fase === 'limpieza'
      ? 'El cambio del historial ya se guardó, pero no se pudo limpiar el partido activo. Reintentá antes de continuar.'
      : 'No se pudo completar el guardado o la eliminación. Reintentá antes de continuar; recargar puede perder cambios todavía no guardados.';
    ui.mostrarAviso(mensaje, true);
  }
  return resultado.estado === 'ok';
}

function puedeCambiar({ editar = false, desdeAviso = false } = {}) {
  if (estado.pendienteGuardado !== null) {
    ui.mostrarAviso('Hay datos pendientes de conservación. Reintentá antes de continuar.', true);
    return false;
  }
  if (estado.avisoFin && !desdeAviso) return false;
  if (editar && estado.conservacion === 'eliminado') {
    ui.mostrarAviso('Este partido fue eliminado del historial. Podés reiniciar o empezar otro.', true);
    return false;
  }
  return true;
}

function sincronizarVista() {
  if (estado.partido === null) {
    estado.vista = 'crear';
    ui.mudarMarcadorA('partido');
    dibujar();
  } else if (estado.avisoFin) volverAlPartido();
  else if (estaTerminado(estado.partido)) mostrarFin();
  else volverAlPartido();
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
  // No acceder a storage desde el dueño: el mismo protocolo se prueba sin DOM.
  Object.assign(estado, {
    partido: null, vista: 'crear', jugadorSeleccionado: null, pendiente: null, editor: null,
    seguimiento: null, conservacion: 'activo', pendienteGuardado: null, errorPersistencia: null,
    vistaRetorno: 'crear', vistaRetornoAyuda: 'crear', historial: { estado: 'ausente' }, registroId: null,
    registroSeleccionado: null, errorHistorial: null, reintentoHistorial: null, ultimoPunto: null, avisoFin: false,
  });
  ui.ocultarModal();
  recibir(ciclo.recuperar());
  sincronizarVista();
  return estado;
}

iniciar();

export { estado, acciones };
