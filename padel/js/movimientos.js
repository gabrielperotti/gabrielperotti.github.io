// Lista fija de movimientos: datos puros, sin dependencias.
// No es editable desde la app (RF-37). Ampliarla es un cambio consciente.

export const MOVIMIENTOS = [
  { id: 'remate', etiqueta: 'Remate' },
  { id: 'reves', etiqueta: 'Revés' },
  { id: 'banda', etiqueta: 'Banda' },
  { id: 'volley', etiqueta: 'Volley' },
  { id: 'chapeo', etiqueta: 'Chapeo' },
  { id: 'lob', etiqueta: 'Lob' },
  { id: 'drop', etiqueta: 'Drop' },
  { id: 'sin_especificar', etiqueta: 'Sin especificar' },
];

export const IDS_MOVIMIENTOS = MOVIMIENTOS.map((movimiento) => movimiento.id);

const ETIQUETAS = new Map(MOVIMIENTOS.map((movimiento) => [movimiento.id, movimiento.etiqueta]));

// Etiqueta legible de un movimiento. Un id desconocido cae a la de "sin_especificar":
// el resumen nunca muestra una clave interna.
export function etiquetaMovimiento(id) {
  return ETIQUETAS.get(id) ?? etiquetaMovimiento('sin_especificar');
}

// El id existe en la lista fija. El motor no acepta movimientos inventados (RF-31).
export function validarMovimiento(id) {
  return ETIQUETAS.has(id);
}