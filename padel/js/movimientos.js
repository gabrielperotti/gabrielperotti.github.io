// Lista fija de movimientos: datos puros, sin dependencias.
// No es editable desde la app (RF-37). Ampliarla es un cambio consciente.

export const MOVIMIENTOS = [
  { id: 'remate', etiqueta: 'Remate' },
  { id: 'drive', etiqueta: 'Drive' },
  { id: 'lob', etiqueta: 'Globo' },
  { id: 'volley', etiqueta: 'Volea' },
  { id: 'reves', etiqueta: 'Revés' },
  { id: 'drop', etiqueta: 'Drop' },
  { id: 'bandeja', etiqueta: 'Bandeja' },
  { id: 'sin_especificar', etiqueta: 'Sin especificar' },
];

export const IDS_MOVIMIENTOS = MOVIMIENTOS.map((movimiento) => movimiento.id);

const ETIQUETAS = new Map(MOVIMIENTOS.map((movimiento) => [movimiento.id, movimiento.etiqueta]));
// Solo lectura de estadísticas guardadas: no son opciones ni aliases del catálogo actual.
const ETIQUETAS_HISTORICAS = new Map([['banda', 'Banda'], ['chapeo', 'Chapeo']]);

// Etiqueta legible de un movimiento. Un id desconocido cae a la de "sin_especificar":
// el resumen nunca muestra una clave interna.
export function etiquetaMovimiento(id) {
  return ETIQUETAS.get(id) ?? ETIQUETAS_HISTORICAS.get(id) ?? ETIQUETAS.get('sin_especificar');
}

// El id existe en la lista fija. El motor no acepta movimientos inventados (RF-31).
export function validarMovimiento(id) {
  return ETIQUETAS.has(id);
}
