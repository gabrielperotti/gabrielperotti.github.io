// Motor de reglas de pádel. Dominio puro: sin DOM, sin persistencia, sin UI (constitución 1).
// Toda decisión de puntaje vive acá. La UI solo llama funciones y dibuja lo que devuelven.

// El motor importa solo `movimientos.js`: la lista fija es dato de dominio, no de UI.
import { validarMovimiento } from './movimientos.js';

export const VERSION_ESTADO = 1;

export const FASE_NORMAL = 'normal';
export const FASE_IGUALES = 'iguales';
export const FASE_VENTAJA = 'ventaja';
export const FASE_STAR_POINT = 'star_point';
export const FASE_TIE_BREAK = 'tie_break';

export const MODALIDAD_VENTAJA = 'ventaja';
export const MODALIDAD_PUNTO_ORO = 'punto_oro';
export const MODALIDAD_STAR_POINT = 'star_point';

// Las tres modalidades configurables y las únicas cantidades de sets de la v1 (RF-2).
export const MODALIDADES = [MODALIDAD_VENTAJA, MODALIDAD_PUNTO_ORO, MODALIDAD_STAR_POINT];
export const CANTIDADES_DE_SETS = [1, 3, 5];

export const RESULTADO_GANADO = 'ganado';
export const RESULTADO_FALLADO = 'fallado';

// Cómo terminó el partido. `manual` es definitivo: cerrar a mano no se deshace editando
// el marcador, solo reiniciando (RF-64).
export const MOTIVO_FIN_SETS = 'sets';
export const MOTIVO_FIN_MANUAL = 'manual';

const OTRAS_PAREJAS = { A: 'B', B: 'A' };

// Progresión de puntos dentro de un juego. No es lineal (RF-11).
const PUNTOS = [0, 15, 30, 40];

// Un set no llega a 8-6: con 7-5 ya cerró. El techo sale de la regla (plan §7).
const JUEGOS_MAXIMO = 7;

// En el tie-break no hay techo de puntos, pero sí un tope de corrección: `rival + 7`,
// que es el valor con el que el set cerraría a favor de esa pareja (plan §7).
const DIFERENCIA_MINIMA = 2;

// ---------------------------------------------------------------- constructores

// Un set está cerrado si y solo si `juego === null`. No hay campo `cerrado` que lo contradiga.
export function nuevoJuego(fase = FASE_NORMAL) {
  return {
    fase,
    puntos: { A: 0, B: 0 },
    ventajaDe: null,
    cicloStar: null,
  };
}

export function nuevoSetAbierto() {
  return {
    juegos: { A: 0, B: 0 },
    tieBreak: null,
    porTieBreak: false,
    servidorAlEntrarAlTieBreak: null,
    juego: nuevoJuego(),
  };
}

export function nuevoTieBreak() {
  return { A: 0, B: 0 };
}

// ---------------------------------------------------------------- predicados

// Un set cierra al llegar a 6 juegos con diferencia mínima de 2 (RF-19).
export function cierraElSet(juegos) {
  return Math.max(juegos.A, juegos.B) >= 6 && Math.abs(juegos.A - juegos.B) >= DIFERENCIA_MINIMA;
}

// Marcadores que ningún set puede tener (RF-48).
//
// Con 6 juegos se llega a 6-6 y de ahí al tie-break, y con 7 ya cerró el set: 7-6 y 7-7
// son inalcanzables. Sin este predicado, un set abierto en 6-7 dejaría que `cerrarJuego`
// sumara hasta 8.
export function esJuegoImposibleDeSet(juegos) {
  const maximo = Math.max(juegos.A, juegos.B);
  if (maximo < 7) return false;
  return Math.abs(juegos.A - juegos.B) < DIFERENCIA_MINIMA;
}

// El tie-break reemplaza al último game del set (RF-20).
export function entraATieBreak(juegos) {
  return juegos.A === 6 && juegos.B === 6;
}

// Gana el primero que llega a 7 con diferencia mínima de 2 (RF-22, RF-23).
// No hay techo de puntos: mientras no haya diferencia de 2 sigue en juego.
export function cierraElTieBreak(tieBreak) {
  return Math.max(tieBreak.A, tieBreak.B) >= 7 && Math.abs(tieBreak.A - tieBreak.B) >= DIFERENCIA_MINIMA;
}

// El set en curso es el único con `juego`, y es el último de la lista.
export function indiceSetEnCurso(marcador) {
  for (let i = marcador.sets.length - 1; i >= 0; i -= 1) {
    if (marcador.sets[i].juego !== null) return i;
  }
  return -1;
}

export function setEnCurso(partido) {
  const indice = indiceSetEnCurso(partido.marcador);
  return indice === -1 ? null : partido.marcador.sets[indice];
}

// ---------------------------------------------------------------- creación

// Un partido arranca en cero, con el saque declarado y un solo set abierto (RF-6).
// Lanza error si falta el nombre de un jugador o si la configuración no es válida (RF-4).
//
// `parejaA` y `parejaB` traen sólo `jugadores`. Si viene de más, se ignora: el estado es
// efímero (constitución 9) y un partido guardado con la forma vieja se descarta al cargarlo
// (RF-60), así que no hay nada que migrar.
export function crearPartido({ parejaA, parejaB, setsAElegir = 3, modalidad = MODALIDAD_VENTAJA, parejaQueSacaElPrimero = 'A' } = {}) {
  const jugadores = [...(parejaA?.jugadores ?? []), ...(parejaB?.jugadores ?? [])];
  if (jugadores.length !== 4 || jugadores.some((nombre) => limpiarNombre(nombre) === '')) {
    throw new Error('Falta el nombre de algún jugador');
  }
  if (!CANTIDADES_DE_SETS.includes(setsAElegir)) {
    throw new Error('La cantidad de sets tiene que ser 1, 3 o 5');
  }
  if (!MODALIDADES.includes(modalidad)) {
    throw new Error('Modalidad de puntos desconocida');
  }

  return {
    version: VERSION_ESTADO,
    estado: 'en_curso',
    motivoFin: null,
    config: {
      setsAElegir,
      setsParaGanar: (setsAElegir + 1) / 2,
      modalidad,
      parejaQueSacaElPrimero,
    },
    parejas: {
      A: crearPareja('A', parejaA, 1),
      B: crearPareja('B', parejaB, 3),
    },
    marcador: {
      sets: [nuevoSetAbierto()],
      servidor: parejaQueSacaElPrimero,
      terminado: false,
    },
    estadisticas: {},
  };
}

// Una pareja es sólo sus jugadores: no hay nombre de pareja en el modelo. Los equipos se
// identifican siempre por los nombres de quienes juegan (`nombreDeEquipo`).
function crearPareja(letra, datos, primerPuesto) {
  const { jugadores = [] } = datos ?? {};
  return {
    jugadores: jugadores.map((jugador, i) => ({
      id: `j${primerPuesto + i}`,
      nombre: limpiarNombre(jugador),
      puesto: primerPuesto + i,
    })),
  };
}

// Cómo se escribe un equipo: los nombres de sus jugadores unidos con una barra, en orden de
// puesto en la cancha. `Gabi/Maxi`.
//
// Es la única fuente de ese texto: la usan el marcador, el pie (quién saca) y el resumen.
// No hay nombre de pareja que pueda overriding, así que no hay nada que decidir acá — salvo
// un estado que no venga de `crearPartido`, donde sí hace falta un texto que no esté vacío.
export function nombreDeEquipo(partido, letra) {
  const pareja = partido?.parejas?.[letra];
  const jugadores = (pareja?.jugadores ?? [])
    .slice()
    .sort((a, b) => a.puesto - b.puesto)
    .map((jugador) => limpiarNombre(jugador.nombre))
    .filter((nombre) => nombre !== '');

  if (jugadores.length === 0) return `Pareja ${letra}`;
  return jugadores.join('/');
}

// Editar el punto de una pareja en el tie-break del set en curso.
// Solo tiene sentido con el juego en fase tie_break; en cualquier otro caso, sin cambios.
export function editarPuntoDeTieBreak(partido, pareja, valor) {
  if (!puedeEditarPuntos(partido)) return partido;
  if (!esPareja(pareja)) return partido;

  const set = setEnCurso(partido);
  if (set.juego.fase !== FASE_TIE_BREAK) return partido;

  // Tope de corrección: `rival + 7`, el valor con el que el set cerraría a favor de esta
  // pareja. Es el mismo criterio que ofrece `valoresValidosPuntoDeTieBreak`.
  const techo = set.tieBreak[otraPareja(pareja)] + 7;
  if (!Number.isInteger(valor) || valor < 0 || valor > techo) return partido;

  const copia = copiaProfunda(partido);
  const indice = indiceSetEnCurso(copia.marcador);
  copia.marcador.sets[indice].tieBreak[pareja] = valor;
  return conMarcadorDerivado(copia);
}

// Editar el valor de una pareja en el juego del set en curso.
// Aplica el valor, re-deriva la fase del juego y deja que `derivar`cascadee.
// Un valor que no es válido para la fase, o sin set en curso: sin cambios.
export function editarPuntos(partido, pareja, valoracion) {
  if (!puedeEditarPuntos(partido)) return partido;
  if (!esPareja(pareja)) return partido;

  const set = setEnCurso(partido);
  if (set.juego.fase === FASE_TIE_BREAK) return partido;
  if (!valoresValidosPuntos(partido, pareja).includes(valoracion)) return partido;

  const copia = copiaProfunda(partido);
  const setCopia = copia.marcador.sets[indiceSetEnCurso(copia.marcador)];

  if (valoracion === 'iguales') {
    // Iguales ES 40-40 (RF-12), no 0-0. Y el ciclo de star point se conserva: venir del
    // ciclo 2 o del star point no puede borrar el star point pendiente.
    setCopia.juego = {
      fase: FASE_IGUALES,
      puntos: { A: 40, B: 40 },
      ventajaDe: null,
      cicloStar: setCopia.juego.cicloStar ?? cicloInicial(copia.config.modalidad),
    };
  } else if (valoracion === 0) {
    // Volver a 0-0 deja el juego como nuevo, sin fase de ventaja colgando.
    setCopia.juego = nuevoJuego();
  } else {
    setCopia.juego.puntos[pareja] = valoracion;
    // 40 contra 40 es deuce: la fase se deriva sola (RF-12).
    if (setCopia.juego.puntos.A === 40 && setCopia.juego.puntos.B === 40) {
      setCopia.juego.fase = FASE_IGUALES;
      setCopia.juego.ventajaDe = null;
      setCopia.juego.cicloStar = cicloInicial(copia.config.modalidad);
    } else {
      setCopia.juego.fase = FASE_NORMAL;
      setCopia.juego.ventajaDe = null;
      setCopia.juego.cicloStar = null;
    }
  }

  return conMarcadorDerivado(copia);
}

// ---------------------------------------------------------------- edición en cascada

// ---------------------------------------------------------------- valores válidos para el editor

// Los valores válidos de un punto, según la fase del juego (plan §7, RF-47).
// Siempre sin el valor actual: el valor actual se muestra como etiqueta, no como botón.
export function valoresValidosPuntos(partido, pareja) {
  const set = puedeEditarPuntos(partido) ? setEnCurso(partido) : null;
  if (set === null) return [];

  const { fase, ventajaDe } = set.juego;
  // Solo en fase normal el valor actual es un número y se puede excluir de la lista.
  // En las demás fases el valor actual es una etiqueta de estado (`iguales`, `ventaja`,
  // `star point`), no un número, y la lista es exactamente la de la tabla del plan §7.
  switch (fase) {
    case FASE_NORMAL:
      return PUNTOS.filter((valor) => valor !== set.juego.puntos[pareja]);
    case FASE_IGUALES:
    case FASE_STAR_POINT:
      // La única corrección legal desde aquí es volver el juego a 0-0 (CE-16).
      return [0];
    case FASE_VENTAJA:
      // Quien tiene la ventaja solo puede reiniciar el juego. El otro puede además
      // volver a iguales, que es un estado posible de la modalidad.
      return ventajaDe === pareja ? [0] : [0, 'iguales'];
    default:
      // En tie-break el editor es el de puntos de tie-break.
      return [];
  }
}

// Los valores válidos de juegos: enteros de 0 a 7, para cualquier set y cualquier pareja,
// menos el actual y menos los que dejarían al set en un marcador imposible (RF-48).
//
// Que el editor ofrezca valores que *cierran* un set es intencional (plan §7): 5-4 a 6-4 es
// la corrección más común. Lo que no se ofrece es un set que no puede existir.
export function valoresValidosJuegos(partido, indiceSet, pareja) {
  const set = partido.marcador.sets[indiceSet];
  if (set === undefined || !esPareja(pareja)) return [];
  if (cerradoAMano(partido)) return [];

  const valores = [];
  for (let n = 0; n <= JUEGOS_MAXIMO; n += 1) {
    if (n === set.juegos[pareja]) continue;
    if (esJuegoImposibleDeSet({ ...set.juegos, [pareja]: n })) continue;
    valores.push(n);
  }
  return valores;
}

// Los valores válidos del punto de tie-break: de 0 al rival + 7, sin el valor actual.
// El techo `rival + 7` es el valor que cerraría el set a favor de esa pareja (plan §7).
export function valoresValidosPuntoDeTieBreak(partido, pareja) {
  if (!puedeEditarPuntos(partido)) return [];
  const set = setEnCurso(partido);
  if (set.juego.fase !== FASE_TIE_BREAK) return [];

  const techo = set.tieBreak[otraPareja(pareja)] + 7;
  const actual = set.tieBreak[pareja];
  const valores = [];
  for (let n = 0; n <= techo; n += 1) {
    if (n !== actual) valores.push(n);
  }
  return valores;
}

// ---------------------------------------------------------------- edición en cascada

// Editar los juegos de CUALQUIER set. Índice fuera de rango, pareja inválida o valor que
// dejaría al set en un marcador imposible: el estado vuelve sin cambios (RF-48, RF-49).
export function editarJuegos(partido, indiceSet, pareja, juegos) {
  const set = partido.marcador.sets[indiceSet];
  if (set === undefined) return partido;
  if (!esPareja(pareja)) return partido;
  if (cerradoAMano(partido)) return partido;
  if (typeof juegos !== 'number' || !Number.isInteger(juegos) || juegos < 0 || juegos > JUEGOS_MAXIMO) return partido;
  if (set.juegos[pareja] === juegos) return partido;
  if (esJuegoImposibleDeSet({ ...set.juegos, [pareja]: juegos })) return partido;

  const copia = copiaProfunda(partido);
  copia.marcador.sets[indiceSet].juegos[pareja] = juegos;
  return conMarcadorDerivado(copia);
}

// ---------------------------------------------------------------- derivados

// Datos que la UI necesita y no puede calcular. Solo pintan avisos: no habilitan ni
// bloquean ninguna acción (RF-44, plan §8).
export function derivados(partido) {
  const set = setEnCurso(partido);
  const enTieBreak = set !== null && set.juego.fase === FASE_TIE_BREAK;
  const tieBreakActivo = set !== null && set.tieBreak !== null;

  if (set === null) {
    return {
      setPointA: false, setPointB: false,
      matchPointA: false, matchPointB: false,
      enTieBreak: false, tieBreakActivo: false,
    };
  }

  return {
    setPointA: tieneSetPoint(partido, 'A'),
    setPointB: tieneSetPoint(partido, 'B'),
    matchPointA: tieneMatchPoint(partido, 'A'),
    matchPointB: tieneMatchPoint(partido, 'B'),
    enTieBreak,
    tieBreakActivo,
  };
}

// Tiene set point si ganando un game más cerraría el set. En `star_point` el juego se
// decide con un punto, así que cuenta igual.
function tieneSetPoint(partido, pareja) {
  const set = setEnCurso(partido);
  if (set === null || estaTerminado(partido)) return false;

  if (set.juego.fase === FASE_TIE_BREAK) {
    const rival = otraPareja(pareja);
    return cierraElTieBreak({ ...set.tieBreak, [pareja]: set.tieBreak[pareja] + 1 });
  }

  const rival = otraPareja(pareja);
  return cierraElSet({ ...set.juegos, [pareja]: set.juegos[pareja] + 1 });
}

// Match point es un set point que además le da el partido.
function tieneMatchPoint(partido, pareja) {
  if (!tieneSetPoint(partido, pareja)) return false;
  return setsGanados(partido.marcador, pareja) + 1 >= partido.config.setsParaGanar;
}

// Lo mejor de un jugador es su movimiento con más winners (RF-71).
export function mejorMovimiento(partido, jugadorId) {
  return movimientoConMas(estadisticasDe(partido, jugadorId), 'winners');
}

// Lo peor es su movimiento con más fallos. Se mira por separado: no se netean (RF-72).
export function peorMovimiento(partido, jugadorId) {
  return movimientoConMas(estadisticasDe(partido, jugadorId), 'fallos');
}

function estadisticasDe(partido, jugadorId) {
  return partido.estadisticas?.[jugadorId];
}

// Un movimiento con un solo uso ya es "el más": por eso `maximo` arranca en 0 y no en 1.
function movimientoConMas(estadisticas, tipo) {
  const contadores = estadisticas?.[tipo];
  if (!contadores) return null;

  let elegido = null;
  let maximo = 0;
  for (const [movimientoId, cantidad] of Object.entries(contadores)) {
    if (cantidad > maximo) {
      elegido = movimientoId;
      maximo = cantidad;
    }
  }
  return elegido;
}

// ---------------------------------------------------------------- copia

// Cada función devuelve un estado nuevo y no muta su argumento (plan §4).
// Copia a mano y no con una librería: la forma del estado es fija y conocida.
function copiaProfunda(partido) {
  return {
    version: partido.version,
    estado: partido.estado,
    motivoFin: partido.motivoFin ?? null,
    config: { ...partido.config },
    parejas: {
      A: copiarPareja(partido.parejas.A),
      B: copiarPareja(partido.parejas.B),
    },
    marcador: {
      sets: partido.marcador.sets.map(copiarSet),
      servidor: partido.marcador.servidor,
      terminado: partido.marcador.terminado,
    },
    estadisticas: copiarEstadisticas(partido.estadisticas),
  };
}

function copiarPareja(pareja) {
  return {
    jugadores: pareja.jugadores.map((jugador) => ({ ...jugador })),
  };
}

function copiarSet(set) {
  return {
    juegos: { ...set.juegos },
    tieBreak: set.tieBreak === null ? null : { ...set.tieBreak },
    porTieBreak: set.porTieBreak,
    servidorAlEntrarAlTieBreak: set.servidorAlEntrarAlTieBreak ?? null,
    juego: set.juego === null ? null : { ...set.juego, puntos: { ...set.juego.puntos } },
  };
}

function copiarEstadisticas(estadisticas) {
  const copia = {};
  for (const [jugadorId, stats] of Object.entries(estadisticas)) {
    copia[jugadorId] = { winners: { ...stats.winners }, fallos: { ...stats.fallos } };
  }
  return copia;
}

// Reiniciar deja marcador y estadísticas en cero conservando configuración y nombres (RF-66).
// No hay nada más que limpiar: la v1 no guarda acciones registradas.
export function reiniciar(partido) {
  return {
    ...partido,
    config: { ...partido.config },
    parejas: {
      A: copiarPareja(partido.parejas.A),
      B: copiarPareja(partido.parejas.B),
    },
    estado: 'en_curso',
    motivoFin: null,
    marcador: {
      sets: [nuevoSetAbierto()],
      servidor: partido.config.parejaQueSacaElPrimero,
      terminado: false,
    },
    estadisticas: {},
  };
}

// Cerrar a mano marca el partido terminado sin tocar el marcador (RF-62).
// Devuelve una copia: las funciones del motor no comparten estado con su argumento.
export function cerrar(partido) {
  const copia = copiaProfunda(partido);
  copia.estado = 'terminado';
  copia.motivoFin = MOTIVO_FIN_MANUAL;
  copia.marcador.terminado = true;
  return copia;
}

// Cerrar a mano es terminal: ni registrar puntos ni editar el marcador lo reabren (RF-64).
// Reiniciar es la única vía para volver a empezar.
export function cerradoAMano(partido) {
  return partido.motivoFin === MOTIVO_FIN_MANUAL;
}

export function esPareja(pareja) {
  return OTRAS_PAREJAS[pareja] !== undefined;
}

// Los nombres entran con trim y no se validan por unicidad (RF-5, CE-18).
function limpiarNombre(nombre) {
  if (typeof nombre !== 'string') return '';
  return nombre.trim();
}

function otraPareja(pareja) {
  return OTRAS_PAREJAS[pareja];
}

// ---------------------------------------------------------------- puntos

// Decide a favor de quién es el punto, avanza la fase y suma al winner o al fallo.
// El fallo del jugador es punto de la pareja rival (RF-28, RF-29).
export function scorePoint(partido, pareja, { jugadorId, resultado, movimientoId }) {
  // Un movimiento inexistente es un error de programación de la UI, no un dato: se lanza.
  if (!validarMovimiento(movimientoId)) {
    throw new Error(`Movimiento desconocido: ${movimientoId}`);
  }
  if (estaTerminado(partido)) return partido;
  if (cerradoAMano(partido)) return partido;

  const indice = indiceSetEnCurso(partido.marcador);
  if (indice === -1) return partido;

  const copia = copiaProfunda(partido);
  const set = copia.marcador.sets[indice];
  const favecible = resultado === RESULTADO_FALLADO ? otraPareja(pareja) : pareja;

  if (set.juego.fase === FASE_TIE_BREAK) {
    avanzarPuntoDeTieBreak(set, favecible);
  } else if (avanzarPunto(set.juego, favecible, copia.config.modalidad)) {
    cerrarJuego(copia.marcador, set, favecible);
  }

  sumarEstadistica(copia, jugadorId, resultado, movimientoId);

  // El saque no se recalcula acá: lo cambia `cerrarJuego`, y una edición no lo toca (RF-54).
  return conMarcadorDerivado(copia);
}

function avanzarPuntoDeTieBreak(set, pareja) {
  set.tieBreak[pareja] += 1;
}

// Devuelve true si el punto cerró el juego.
function avanzarPunto(juego, pareja, modalidad) {
  const { fase } = juego;

  // El star point dura un solo punto: quien lo gana gana el juego (RF-17).
  if (fase === FASE_STAR_POINT) return true;

  if (fase === FASE_VENTAJA) {
    if (juego.ventajaDe === pareja) return true;

    // Perdió el que tenía la ventaja. En el segundo ciclo de star point, al star point (RF-16).
    if (modalidad === MODALIDAD_STAR_POINT && juego.cicloStar === 2) {
      juego.fase = FASE_STAR_POINT;
      juego.puntos = { A: 0, B: 0 };
      juego.ventajaDe = null;
      return false;
    }
    juego.fase = FASE_IGUALES;
    juego.ventajaDe = null;
    juego.cicloStar = siguienteCicloStar(modalidad, juego.cicloStar);
    return false;
  }

  if (fase === FASE_IGUALES) {
    // El punto de oro decide el juego con un punto y nunca pasa por ventaja (RF-14).
    if (modalidad === MODALIDAD_PUNTO_ORO) return true;
    juego.fase = FASE_VENTAJA;
    juego.ventajaDe = pareja;
    return false;
  }

  // Fase normal: 0 -> 15 -> 30 -> 40. Con 40 arriba y el rival por debajo, el punto cierra el
  // juego (40-0 y 40-15 se ganan con un punto). Con los dos en 40 el juego pasa a iguales (RF-12).
  if (juego.puntos[pareja] === 40 && juego.puntos[otraPareja(pareja)] < 40) return true;

  juego.puntos[pareja] = siguientePuntos(juego.puntos[pareja]);
  if (juego.puntos.A === 40 && juego.puntos.B === 40) {
    juego.fase = FASE_IGUALES;
    juego.ventajaDe = null;
    juego.cicloStar = cicloInicial(modalidad);
  }
  return false;
}

function cicloInicial(modalidad) {
  return modalidad === MODALIDAD_STAR_POINT ? 1 : null;
}

// El ciclo solo avanza en star point, y solo una vez: del primer ciclo al segundo.
function siguienteCicloStar(modalidad, cicloStar) {
  return modalidad === MODALIDAD_STAR_POINT && cicloStar === 1 ? 2 : cicloStar;
}

function siguientePuntos(valor) {
  return PUNTOS[PUNTOS.indexOf(valor) + 1];
}

// Suma el juego, reinicia el puntaje y pasa el saque a la pareja que ganó (RF-18).
function cerrarJuego(marcador, set, pareja) {
  set.juegos[pareja] += 1;
  set.juego = nuevoJuego();
  marcador.servidor = pareja;
}

// `derivar` es la única que decide cierre de set, set siguiente y fin de partido.
// La usan igual `scorePoint` y las tres `editar*` (constitución 4).
function derivar(marcador, setsParaGanar) {
  const sets = marcador.sets.map((set) => normalizarSet(set, marcador.servidor));

  // Un set en curso nunca puede estar seguido de otros, ni siquiera cerrados: el primero
  // con `juego` manda y lo que viene después se descarta (RF-51, CE-5).
  let abierto = -1;
  for (let i = 0; i < sets.length; i += 1) {
    if (sets[i].juego !== null) {
      abierto = i;
      sets.length = i + 1;
      break;
    }
  }

  let servidor = marcador.servidor;

  // Cerrar por tie-break el set en curso, si corresponde (RF-22).
  if (abierto !== -1) {
    const set = sets[abierto];
    if (set.tieBreak !== null && cierraElTieBreak(set.tieBreak)) {
      set.juego = null;
      set.porTieBreak = true;
      // FIP: el set siguiente lo empieza la pareja que NO sacaba primero en el tie-break.
      servidor = otraPareja(set.servidorAlEntrarAlTieBreak ?? marcador.servidor);
      abierto = -1;
    }
  }

  const derivado = { ...marcador, sets, servidor };
  const terminado = setsGanados(derivado, 'A') >= setsParaGanar || setsGanados(derivado, 'B') >= setsParaGanar;

  if (terminado) {
    // No se juega un set después de ganar: el que quedó abierto se trunca (RF-24).
    if (abierto !== -1) sets.length = abierto;
  } else if (abierto === -1) {
    sets.push(nuevoSetAbierto());
  }

  return { ...derivado, terminado };
}

// Deja cada set coherente consigo mismo antes de contar.
function normalizarSet(set, servidor) {
  const copia = { ...set, juegos: { ...set.juegos } };

  if (entraATieBreak(copia.juegos)) {
    if (copia.tieBreak === null) {
      // El tie-break arranca acá. Se anota quién sacaba en ese momento, que es el que
      // decide el saque del set siguiente cuando el tie-break cierre (FIP).
      copia.tieBreak = nuevoTieBreak();
      copia.servidorAlEntrarAlTieBreak = servidor;
    }
  } else {
    // Los juegos ya no son 6-6: se descarta el contador de tie-break y cómo cerró (CE-6).
    copia.tieBreak = null;
    copia.porTieBreak = false;
    copia.servidorAlEntrarAlTieBreak = null;
  }

  const cierra = cierraElSet(copia.juegos);

  if (copia.porTieBreak) {
    // Cerrado en tie-break: ya no hay juego. Los juegos siguen en 6-6.
    copia.juego = null;
  } else if (cierra) {
    copia.juego = null;
  } else if (!cierra && copia.juego === null) {
    // Dejó de cerrar: se reabre en 0-0 (RF-51).
    copia.juego = juegoPara(copia);
  } else if (copia.juego !== null && (copia.tieBreak !== null || copia.juego.fase === FASE_TIE_BREAK)) {
    copia.juego = juegoPara(copia);
  }

  return copia;
}

// El juego de un set en curso. En 6-6 es el tie-break, con contador numérico (RF-20, RF-21).
function juegoPara(set) {
  if (set.tieBreak === null) return nuevoJuego();
  return { ...nuevoJuego(), fase: FASE_TIE_BREAK };
}

// Aplica la derivación y sincroniza `estado` y `motivoFin` con `marcador.terminado`.
function conMarcadorDerivado(partido) {
  const marcador = derivar(partido.marcador, partido.config.setsParaGanar);
  return {
    ...partido,
    marcador,
    estado: marcador.terminado ? 'terminado' : 'en_curso',
    motivoFin: marcador.terminado ? MOTIVO_FIN_SETS : null,
  };
}

// Winners y fallos van por separado, sin netearlos (RF-67, RF-72).
function sumarEstadistica(partido, jugadorId, resultado, movimientoId) {
  const tipo = resultado === RESULTADO_FALLADO ? 'fallos' : 'winners';
  const delJugador = partido.estadisticas[jugadorId] ?? { winners: {}, fallos: {} };
  delJugador[tipo][movimientoId] = (delJugador[tipo][movimientoId] ?? 0) + 1;
  partido.estadisticas[jugadorId] = delJugador;
}

// ---------------------------------------------------------------- lectura

// El partido terminó por alcance de sets o a mano (RF-24, RF-62).
export function estaTerminado(partido) {
  return partido.estado === 'terminado';
}

// Resultado en sets. Solo cuenta sets cerrados (RF-24).
export function resultadoPartido(partido) {
  return {
    A: setsGanados(partido.marcador, 'A'),
    B: setsGanados(partido.marcador, 'B'),
    terminado: estaTerminado(partido),
  };
}

export function setsGanados(marcador, pareja) {
  let ganados = 0;
  for (const set of marcador.sets) {
    if (ganaElSet(set, pareja)) ganados += 1;
  }
  return ganados;
}

function ganaElSet(set, pareja) {
  if (set.juego !== null) return false;
  if (set.porTieBreak) return set.tieBreak[pareja] > set.tieBreak[otraPareja(pareja)];
  return set.juegos[pareja] > set.juegos[otraPareja(pareja)];
}

// Un set cerrado en tie-break se imprime 7-6 a favor de quien ganó el tie-break (RF-22).
export function etiquetaResultadoSet(set) {
  if (set.porTieBreak) {
    return set.tieBreak.A > set.tieBreak.B ? '7-6' : '6-7';
  }
  return `${set.juegos.A}-${set.juegos.B}`;
}

// Etiqueta de un punto para la UI. Resuelve la fase en un solo lugar.
export function etiquetaPunto(set, pareja) {
  if (set.juego === null) return '—';

  const { fase, ventajaDe } = set.juego;

  // En tie-break no hay 15 / 30 / 40: el contador numérico vive en el set (RF-21).
  if (fase === FASE_TIE_BREAK) return String(set.tieBreak[pareja]);
  if (fase === FASE_STAR_POINT) return 'star point';
  if (fase === FASE_IGUALES) return 'iguales';
  if (fase === FASE_VENTAJA) return ventajaDe === pareja ? 'ventaja' : 'iguales';
  return String(set.juego.puntos[pareja]);
}

// El registro y la edición de puntos solo existen con un set en curso y el partido vivo (RF-36).
// Cerrar a mano es terminal: no alcanza con que el partido esté terminado, el motivo importa.
export function puedeEditarPuntos(partido) {
  if (cerradoAMano(partido)) return false;
  return !estaTerminado(partido) && indiceSetEnCurso(partido.marcador) !== -1;
}