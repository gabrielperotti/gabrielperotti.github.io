// Persistencia del partido en curso. Habla con localStorage y no sabe de reglas (plan §9).
// El estado es efímero: sin historial, sin migraciones, sin nada que sincronizar.

const CLAVE = 'padel-scores.partido.v1';
const VERSION_ESPERADA = 1;

// El `storage` se inyecta para poder testear sin navegador. Por defecto es el del navegador.
export function crearAlmacen(storage = globalThis.localStorage) {
  return {
    // Escribe el partido entero: marcador, configuración y estadísticas. Sin historial.
    guardar(partido) {
      try {
        storage.setItem(CLAVE, JSON.stringify(partido));
      } catch (error) {
        // Sin historial no hay nada que sacrificar: se conserva lo anterior y se avisa.
        // Constitución 9: nunca romper un partido en curso.
        reportarFalloDeGuardado(error);
      }
    },

    // null si no hay nada. null y clave borrada si el JSON está corrupto o la versión no es la.
    cargar() {
      const raw = storage.getItem(CLAVE);
      if (raw === null || raw === undefined) return null;

      let datos;
      try {
        datos = JSON.parse(raw);
      } catch {
        storage.removeItem(CLAVE);
        return null;
      }

      if (!tieneFormaDePartido(datos)) {
        storage.removeItem(CLAVE);
        return null;
      }

      return datos;
    },

    limpiar() {
      storage.removeItem(CLAVE);
    },
  };
}

// La versión sola no alcanza: si el estado quedó a medio escribir o lo dejó una versión
// anterior del formato, adoptarlo deja la app muerta en el primer render y el error se repite
// en cada carga. Lo que no tiene la forma que la app sabe leer se descarta (RF-60).
//
// No es migración: si no tiene la forma esperada, se tira y se empieza de cero (constitución 9).
function tieneFormaDePartido(datos) {
  if (datos === null || typeof datos !== 'object') return false;
  if (datos.version !== VERSION_ESPERADA) return false;

  const marcador = datos.marcador;
  if (marcador === null || typeof marcador !== 'object') return false;
  if (!Array.isArray(marcador.sets) || marcador.sets.length === 0) return false;
  if (marcador.servidor !== 'A' && marcador.servidor !== 'B') return false;

  for (const letra of ['A', 'B']) {
    const pareja = datos.parejas?.[letra];
    if (pareja === null || typeof pareja !== 'object') return false;
    // `nombre` en la pareja es la forma vieja, cuando el equipo tenía un nombre propio.
    // Ahora no existe: los equipos se llaman por sus jugadores. No hay migración (el estado es
    // efímero, constitución 9), así que un partido guardado con esa forma se descarta y se
    // empieza de cero (RF-60). Adoptarlo no rompería nada visible —el nombre está de más y
    // nadie lo lee—, pero es un estado de una versión del modelo que la app ya no tiene.
    if ('nombre' in pareja) return false;
    if (!Array.isArray(pareja.jugadores) || pareja.jugadores.length === 0) return false;
    if (!pareja.jugadores.every((jugador) => typeof jugador?.nombre === 'string')) return false;
    if (!pareja.jugadores.every((jugador) => typeof jugador?.id === 'string')) return false;
  }

  if (datos.config === null || typeof datos.config !== 'object') return false;
  if (typeof datos.config.setsParaGanar !== 'number') return false;

  return datos.estadisticas === null || typeof datos.estadisticas === 'object';
}

// Informe en consola y nada más: la app sigue andando con el estado en memoria.
function reportarFalloDeGuardado(error) {
  if (globalThis.console !== undefined && typeof globalThis.console.warn === 'function') {
    globalThis.console.warn('No se pudo guardar el partido:', error);
  }
}