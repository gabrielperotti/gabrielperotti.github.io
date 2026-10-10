// Persistencia local: valida estructura, no decide reglas ni coordina la finalización.
const CLAVE = 'padel-scores.partido.v1';
const CLAVE_HISTORIAL = 'padel-scores.historial.v1';

// Sin parámetro default: el getter de localStorage también puede lanzar.
// Lecturas: { estado: 'ausente' }, { estado: 'ok', ... } o error.
// Mutaciones: { estado: 'ok' } o { estado: 'error', etapa, clave, error }.
export function crearAlmacen(storage) {
  function leer(clave, validar, adaptar) {
    let etapa = 'acceso';
    try {
      const destino = storage === undefined ? globalThis.localStorage : storage;
      etapa = 'lectura';
      const raw = destino.getItem(clave);
      if (raw === null) return { estado: 'ausente' };
      etapa = 'formato';
      const datos = JSON.parse(raw);
      if (!validar(datos)) throw new Error('Formato almacenado incompatible');
      return { estado: 'ok', ...adaptar(datos) };
    } catch (error) {
      return { estado: 'error', etapa, clave, error };
    }
  }

  function mutar(clave, operacion, datos, validar) {
    let etapa = 'validacion';
    try {
      let raw;
      if (operacion === 'escritura') {
        raw = JSON.stringify(datos);
        if (!validar(JSON.parse(raw))) throw new Error('Datos a guardar incompatibles');
      }
      etapa = 'acceso';
      const destino = storage === undefined ? globalThis.localStorage : storage;
      etapa = operacion;
      if (operacion === 'escritura') destino.setItem(clave, raw);
      else destino.removeItem(clave);
      return { estado: 'ok' };
    } catch (error) {
      return { estado: 'error', etapa, clave, error };
    }
  }

  const cargar = () => leer(CLAVE, activoValido, (datos) => datos.version === 1
    ? { partido: datos, seguimiento: null }
    : { partido: datos.partido, seguimiento: datos.seguimiento });
  const cargarHistorial = () => leer(CLAVE_HISTORIAL, historialValido, (datos) => ({ partidos: datos.partidos }));

  function modificarHistorial(transformar) {
    const lectura = cargarHistorial();
    if (lectura.estado === 'error') return lectura;
    return mutar(CLAVE_HISTORIAL, 'escritura', {
      version: 1,
      partidos: transformar(lectura.estado === 'ausente' ? [] : lectura.partidos),
    }, historialValido);
  }

  return {
    cargar,
    guardar(partido, seguimiento) {
      const lectura = cargar();
      if (lectura.estado === 'error') return lectura;
      return mutar(CLAVE, 'escritura', { version: 2, partido, seguimiento }, activoValido);
    },
    limpiar() {
      const lectura = cargar();
      if (lectura.estado === 'error') return lectura;
      return mutar(CLAVE, 'limpieza');
    },
    cargarHistorial,
    guardarTerminado(registro) {
      if (!registroValido(registro)) {
        return { estado: 'error', etapa: 'validacion', clave: CLAVE_HISTORIAL, error: new Error('Registro incompatible') };
      }
      return modificarHistorial((partidos) => {
        const indice = partidos.findIndex((partido) => partido.id === registro.id);
        if (indice === -1) return [...partidos, registro];
        return partidos.map((partido, i) => i === indice ? registro : partido);
      });
    },
    eliminarTerminado(id) {
      if (!idValido(id)) {
        return { estado: 'error', etapa: 'validacion', clave: CLAVE_HISTORIAL, error: new Error('ID incompatible') };
      }
      return modificarHistorial((partidos) => partidos.filter((partido) => partido.id !== id));
    },
  };
}

const objeto = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor);
const entero = (valor) => Number.isSafeInteger(valor) && valor >= 0;
const equipo = (valor) => valor === 'A' || valor === 'B';
const idValido = (valor) => typeof valor === 'string' && valor.trim().length > 0;
const fechaValida = (valor) => typeof valor === 'string' && !Number.isNaN(Date.parse(valor))
  && new Date(valor).toISOString() === valor;
const puntosValidos = (valor) => objeto(valor) && entero(valor.A) && entero(valor.B);

function seguimientoValido(datos) {
  return objeto(datos) && idValido(datos.id)
    && (datos.fechaFin === null || fechaValida(datos.fechaFin))
    && ['ninguna', 'archivar', 'retirar', 'eliminar'].includes(datos.operacion)
    && (datos.operacion !== 'archivar' || fechaValida(datos.fechaFin))
    && (datos.operacion !== 'eliminar' || idValido(datos.objetivoId))
    && (datos.objetivoId === undefined || idValido(datos.objetivoId));
}

function activoValido(datos) {
  return objeto(datos) && (datos.version === 1 ? partidoValido(datos)
    : datos.version === 2 && partidoValido(datos.partido) && seguimientoValido(datos.seguimiento));
}

function registroValido(datos) {
  return objeto(datos) && idValido(datos.id) && fechaValida(datos.fechaFin)
    && partidoValido(datos.partido) && datos.partido.estado === 'terminado';
}

function historialValido(datos) {
  return objeto(datos) && datos.version === 1 && Array.isArray(datos.partidos)
    && datos.partidos.every(registroValido)
    && new Set(datos.partidos.map((partido) => partido.id)).size === datos.partidos.length;
}

function partidoValido(datos) {
  if (!objeto(datos) || datos.version !== 1) return false;
  if (!['en_curso', 'terminado'].includes(datos.estado) || ![null, 'sets', 'manual'].includes(datos.motivoFin)) return false;
  const config = datos.config;
  if (!objeto(config) || ![1, 3, 5].includes(config.setsAElegir)
    || ![1, 2, 3].includes(config.setsParaGanar)
    || !['ventaja', 'punto_oro', 'star_point'].includes(config.modalidad)
    || !equipo(config.parejaQueSacaElPrimero)) return false;
  if (!objeto(datos.parejas)) return false;
  const ids = new Set();
  for (const letra of ['A', 'B']) {
    const pareja = datos.parejas[letra];
    if (!objeto(pareja) || !Array.isArray(pareja.jugadores) || pareja.jugadores.length === 0) return false;
    for (const jugador of pareja.jugadores) {
      if (!objeto(jugador) || !idValido(jugador.id) || ids.has(jugador.id)
        || typeof jugador.nombre !== 'string' || !entero(jugador.puesto) || jugador.puesto === 0) return false;
      ids.add(jugador.id);
    }
  }
  const marcador = datos.marcador;
  if (!objeto(marcador) || !equipo(marcador.servidor) || typeof marcador.terminado !== 'boolean'
    || !Array.isArray(marcador.sets) || marcador.sets.length === 0 || !marcador.sets.every(setValido)) return false;
  if (!objeto(datos.estadisticas)) return false;
  return Object.values(datos.estadisticas).every((estadistica) => objeto(estadistica)
    && ['winners', 'fallos'].every((tipo) => objeto(estadistica[tipo])
      && Object.values(estadistica[tipo]).every(entero)));
}

function setValido(set) {
  if (!objeto(set) || !puntosValidos(set.juegos) || typeof set.porTieBreak !== 'boolean'
    || !(set.tieBreak === null || puntosValidos(set.tieBreak))) return false;
  if (set.juego === null) return true;
  const juego = set.juego;
  return objeto(juego) && puntosValidos(juego.puntos)
    && ['normal', 'iguales', 'ventaja', 'star_point', 'tie_break'].includes(juego.fase)
    && (juego.ventajaDe === null || equipo(juego.ventajaDe))
    && (juego.cicloStar === null || entero(juego.cicloStar));
}
