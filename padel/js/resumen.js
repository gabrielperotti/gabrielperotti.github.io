// Resumen en texto plano para pegar en un chat. Función pura: no toca el portapapeles,
// no toca el DOM, no calcula reglas (solo lee lo que el motor ya decidió).
// Formato exacto en el plan §11.

import { MOVIMIENTOS, etiquetaMovimiento } from './movimientos.js';
import { resultadoPartido, etiquetaResultadoSet, mejorMovimiento, peorMovimiento } from './motor.js';

const SEPARADOR = '·';

export function generarResumen(partido) {
  const lineas = [];

  lineas.push('Pádel de hoy 🎾');
  lineas.push('');
  lineas.push(lineaDeResultado(partido));
  lineas.push(lineaDeParciales(partido));

  const lineasDeJugadores = lineasPorJugador(partido);
  if (lineasDeJugadores.length > 0) {
    lineas.push('');
    lineas.push(...lineasDeJugadores);
  }

  const lineaDeDuelos = lineaDeDuelosPorMovimiento(partido);
  if (lineaDeDuelos !== null) {
    lineas.push('');
    lineas.push(lineaDeDuelos);
  }

  lineas.push('');
  lineas.push('¡Buen partido, fellas! 🎉');

  return lineas.join('\n');
}

// `<equipoA>  <setsA>-<setsB>  <equipoB>`, contando solo sets cerrados.
function lineaDeResultado(partido) {
  const { A, B } = resultadoPartido(partido);
  return `${nombreDePareja(partido, 'A')}  ${A}-${B}  ${nombreDePareja(partido, 'B')}`;
}

// Una pareja sin nombre cae a "Pareja A" / "Pareja B" (S-4).
function nombreDePareja(partido, letra) {
  const pareja = partido.parejas[letra];
  if (pareja === undefined) return `Pareja ${letra}`;

  const nombreDePareja = pareja.nombre?.trim();
  if (nombreDePareja) return nombreDePareja;

  return pareja.jugadores.map((jugador) => jugador.nombre).filter(Boolean).join('/');
}

// Sets cerrados separados por dos espacios, más el set en curso al final si lo hay.
function lineaDeParciales(partido) {
  return partido.marcador.sets.map(etiquetaDeSet).join('  ');
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

function lineasPorJugador(partido) {
  const lineas = [];

  for (const jugador of jugadoresEnOrdenDePuesto(partido)) {
    const estadisticas = partido.estadisticas[jugador.id];
    if (estadisticas === undefined) continue;

    const winners = totalDe(estadisticas.winners);
    const fallos = totalDe(estadisticas.fallos);
    if (winners === 0 && fallos === 0) continue;

    lineas.push(lineaDeJugador(partido, jugador, estadisticas));
  }

  return lineas;
}

// En orden de puesto en la cancha: 1, 2, 3, 4.
function jugadoresEnOrdenDePuesto(partido) {
  return [...partido.parejas.A.jugadores, ...partido.parejas.B.jugadores]
    .sort((a, b) => a.puesto - b.puesto);
}

// `Gabi: 14 winners (lo mejor: remate) · 6 fallos (lo peor: banda)`
//
// El paréntesis solo aparece si hay algo que destacar: con cero winners no hay "lo mejor".
function lineaDeJugador(partido, jugador, estadisticas) {
  const partes = [];

  const winners = totalDe(estadisticas.winners);
  if (winners > 0) {
    partes.push(`${winners} winners ${entreParentesis(mejorMovimiento(partido, jugador.id), 'lo mejor')}`);
  }

  const fallos = totalDe(estadisticas.fallos);
  if (fallos > 0) {
    partes.push(`${fallos} fallos ${entreParentesis(peorMovimiento(partido, jugador.id), 'lo peor')}`);
  }

  return `${jugador.nombre}: ${partes.join(` ${SEPARADOR} `)}`;
}

function entreParentesis(movimientoId, rotulo) {
  if (movimientoId === null || movimientoId === undefined) return '';
  // El resumen usa la etiqueta del movimiento, no el id interno.
  return `(${rotulo}: ${etiquetaMovimiento(movimientoId).toLowerCase()})`;
}

// Totales por movimiento, en el orden de la lista fija, solo los que se usaron.
function lineaDeDuelosPorMovimiento(partido) {
  const totales = new Map();

  for (const estadisticas of Object.values(partido.estadisticas)) {
    for (const tipo of ['winners', 'fallos']) {
      for (const [movimientoId, cantidad] of Object.entries(estadisticas[tipo] ?? {})) {
        totales.set(movimientoId, (totales.get(movimientoId) ?? 0) + cantidad);
      }
    }
  }

  const partes = [];
  for (const movimiento of MOVIMIENTOS) {
    const total = totales.get(movimiento.id) ?? 0;
    if (total > 0) partes.push(`${movimiento.etiqueta} ${total}`);
  }

  if (partes.length === 0) return null;
  return `Duelos: ${partes.join(` ${SEPARADOR} `)}`;
}

function totalDe(contadores = {}) {
  return Object.values(contadores).reduce((suma, cantidad) => suma + cantidad, 0);
}