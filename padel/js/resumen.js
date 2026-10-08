// Resumen en texto plano para pegar en un chat. Función pura: no toca el portapapeles,
// no toca el DOM, no calcula reglas (solo lee lo que el motor ya decidió).
//
// El texto va ANGOSTO Y ALTO a propósito: se pega desde el teléfono en un chat, donde una
// línea ancha se parte donde no debe o se sale de la pantalla. Por eso cada dato va en su
// propia línea y los títulos de sección, sin sangría, arriba de su contenido con dos.

import { MOVIMIENTOS, etiquetaMovimiento } from './movimientos.js';
import {
  resultadoPartido,
  etiquetaResultadoSet,
  mejorMovimiento,
  peorMovimiento,
  nombreDeEquipo,
} from './motor.js';

const SEPARADOR = '·';
// Dos espacios alcanzan para distinguir "contenido" de "título" sin gastar ancho.
const SANGRIA = '  ';

export function generarResumen(partido) {
  const lineas = [
    'Pádel de hoy 🎾',
    '',
    'Resultado:',
    ...lineasDeResultado(partido),
    lineaDeParciales(partido),
  ];

  const lineasDeJugadores = lineasPorJugador(partido);
  if (lineasDeJugadores.length > 0) {
    lineas.push('', ...lineasDeJugadores);
  }

  const lineasDeDuelos = lineasDeDuelosPorMovimiento(partido);
  if (lineasDeDuelos !== null) {
    lineas.push('', ...lineasDeDuelos);
  }

  lineas.push('', '¡Buen partido, fellas! 🎉');

  return lineas.join('\n');
}

// Una línea por pareja con los sets GANADOS entre corchetes. Solo cuentan los sets cerrados,
// y eso lo decide `resultadoPartido`: acá no se cuenta nada.
//
// `(ganador)` va en la pareja que va ganando, sin importar si el partido terminó o no. Con
// las dos parejas empatadas no lo lleva ninguna: el partido se puede cerrar a mano en el medio
// y ahí no hay ganador que pueda poner.
// (El resumen solo se copia con el partido terminado, así que en la práctica "(ganador)" es
// el que ganó; igual el texto no depende de eso y `generarResumen` se sigue llamando en
// partido en curso.)
function lineasDeResultado(partido) {
  const { A, B } = resultadoPartido(partido);

  let ganador = null;
  if (A > B) ganador = 'A';
  else if (B > A) ganador = 'B';

  return [
    lineaDePareja(partido, 'A', A, ganador),
    lineaDePareja(partido, 'B', B, ganador),
  ];
}

// El nombre del equipo lo arma el motor (`nombreDeEquipo`): los nombres de los jugadores
// unidos. No hay nombre de pareja en el modelo, así que acá no hay nada que decidir.
function lineaDePareja(partido, letra, sets, ganador) {
  const linea = `[${sets}] ${nombreDeEquipo(partido, letra)}`;
  return letra === ganador ? `${linea} (ganador)` : linea;
}

// Los parciales van en UNA línea, con la misma notación de tie-break de siempre. El set en
// curso va al final si lo hay: es el único que todavía puede cambiar.
function lineaDeParciales(partido) {
  const parciales = partido.marcador.sets.map(etiquetaDeSet).join(` ${SEPARADOR} `);
  return `${SANGRIA}sets: ${parciales}`;
}

// Un set cerrado va con su resultado (7-6 si se ganó en tie-break). Un set en tie-break en
// curso muestra además el desempate: sin eso, un 6-6 a mitad de tie-break no dice nada nuevo.
function etiquetaDeSet(set) {
  const etiqueta = etiquetaResultadoSet(set);
  if (set.juego === null || set.juego.fase !== 'tie_break' || set.tieBreak === null) {
    return etiqueta;
  }
  return `${etiqueta} (TB ${set.tieBreak.A}-${set.tieBreak.B})`;
}

// El nombre del jugador en su propia línea y las estadísticas abajo: pegado en un chat, un
// nombre suelto arriba de sus números se lee mucho mejor que dos datos pegados en un renglón.
function lineasPorJugador(partido) {
  const lineas = [];

  for (const jugador of jugadoresEnOrdenDePuesto(partido)) {
    const estadisticas = partido.estadisticas[jugador.id];
    if (estadisticas === undefined) continue;

    const winners = totalDe(estadisticas.winners);
    const fallos = totalDe(estadisticas.fallos);
    if (winners === 0 && fallos === 0) continue;

    lineas.push(`${jugador.nombre}:`, ...lineasDeEstadisticas(partido, jugador, estadisticas));
  }

  return lineas;
}

// En orden de puesto en la cancha: 1, 2, 3, 4.
function jugadoresEnOrdenDePuesto(partido) {
  return [...partido.parejas.A.jugadores, ...partido.parejas.B.jugadores]
    .sort((a, b) => a.puesto - b.puesto);
}

// `  + 14 winners (lo mejor: remate)` y `  - 6 fallos (lo peor: banda)`
//
// El `+` y el `-` delatan de un vistazo cuál de las dos líneas es la buena. El paréntesis
// solo aparece si hay algo que destacar: con cero winners no hay "lo mejor".
function lineasDeEstadisticas(partido, jugador, estadisticas) {
  const lineas = [];

  const winners = totalDe(estadisticas.winners);
  if (winners > 0) {
    lineas.push(`${SANGRIA}+ ${winners} winners ${entreParentesis(mejorMovimiento(partido, jugador.id), 'lo mejor')}`);
  }

  const fallos = totalDe(estadisticas.fallos);
  if (fallos > 0) {
    lineas.push(`${SANGRIA}- ${fallos} fallos ${entreParentesis(peorMovimiento(partido, jugador.id), 'lo peor')}`);
  }

  return lineas;
}

function entreParentesis(movimientoId, rotulo) {
  if (movimientoId === null || movimientoId === undefined) return '';
  // El resumen usa la etiqueta del movimiento, no el id interno.
  return `(${rotulo}: ${etiquetaMovimiento(movimientoId).toLowerCase()})`;
}

// Totales por movimiento, en el orden de la lista fija, solo los que se usaron: un movimiento
// por línea, como las estadísticas de los jugadores.
function lineasDeDuelosPorMovimiento(partido) {
  const totales = new Map();

  for (const estadisticas of Object.values(partido.estadisticas)) {
    for (const tipo of ['winners', 'fallos']) {
      for (const [movimientoId, cantidad] of Object.entries(estadisticas[tipo] ?? {})) {
        totales.set(movimientoId, (totales.get(movimientoId) ?? 0) + cantidad);
      }
    }
  }

  const lineas = [];
  for (const movimiento of MOVIMIENTOS) {
    const total = totales.get(movimiento.id) ?? 0;
    if (total > 0) lineas.push(`${SANGRIA}${movimiento.etiqueta} ${total}`);
  }

  if (lineas.length === 0) return null;
  return ['Duelos:', ...lineas];
}

function totalDe(contadores = {}) {
  return Object.values(contadores).reduce((suma, cantidad) => suma + cantidad, 0);
}