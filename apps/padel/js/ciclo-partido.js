// Protocolo recuperable entre dos claves. La sesión siempre pertenece al llamador.
import { estaTerminado } from './motor.js';

export function generarId() {
  const crypto = globalThis.crypto;
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function sesionVacia() {
  return { partido: null, seguimiento: null, conservacion: 'activo', pendiente: null, error: null };
}

export function crearCiclo({ almacen, reloj = () => new Date().toISOString(), crearId = generarId }) {
  const exito = (sesion) => ({ estado: 'ok', sesion });
  function fallo(sesion, resultado, pendiente) {
    return { ...resultado, sesion: { ...sesion, conservacion: 'pendiente', pendiente, error: resultado } };
  }
  function bloqueado(sesion) {
    return { estado: 'error', etapa: 'pendiente', error: new Error('Resolvé la conservación pendiente antes de continuar'), sesion };
  }
  function completar(sesion, conservacion, seguimiento = sesion.seguimiento) {
    return exito({ ...sesion, seguimiento, conservacion, pendiente: null, error: null });
  }

  function ejecutar(sesion) {
    const pendiente = { tipo: 'persistir' };
    let resultado = almacen.guardar(sesion.partido, sesion.seguimiento);
    if (resultado.estado === 'error') return fallo(sesion, { ...resultado, fase: 'intencion' }, pendiente);
    const { operacion, id, fechaFin, objetivoId } = sesion.seguimiento;
    if (operacion === 'ninguna') return completar(sesion, 'activo');

    resultado = operacion === 'archivar'
      ? almacen.guardarTerminado({ id, fechaFin, partido: sesion.partido })
      : almacen.eliminarTerminado(operacion === 'eliminar' ? objetivoId : id);
    if (resultado.estado === 'error') return fallo(sesion, { ...resultado, fase: 'historial' }, pendiente);

    if (operacion === 'retirar') {
      const seguimiento = { id, fechaFin: null, operacion: 'ninguna' };
      resultado = almacen.guardar(sesion.partido, seguimiento);
      if (resultado.estado === 'error') return fallo(sesion, { ...resultado, fase: 'completar' }, pendiente);
      return completar(sesion, 'activo', seguimiento);
    }
    resultado = almacen.limpiar();
    if (resultado.estado === 'error') return fallo(sesion, { ...resultado, fase: 'limpieza' }, pendiente);
    return completar(sesion, operacion === 'eliminar' ? 'eliminado' : 'archivado', {
      id, fechaFin, operacion: 'ninguna',
    });
  }

  function preparar(sesion, partido, nuevo) {
    try {
      const id = nuevo ? crearId() : sesion.seguimiento.id;
      const terminado = estaTerminado(partido);
      const fechaFin = terminado ? (!nuevo && sesion.seguimiento.fechaFin) || reloj() : null;
      const operacion = terminado ? 'archivar'
        : !nuevo && sesion.partido !== null && estaTerminado(sesion.partido) ? 'retirar' : 'ninguna';
      return exito({ ...sesion, partido, seguimiento: { id, fechaFin, operacion }, pendiente: null, error: null });
    } catch (error) {
      return fallo(nuevo ? sesion : { ...sesion, partido }, { estado: 'error', etapa: 'identidad-fecha', error }, { tipo: 'preparar', partido, nuevo });
    }
  }

  function iniciar(sesion, partido) {
    if (sesion.pendiente !== null) return bloqueado(sesion);
    const preparado = preparar(sesion, partido, true);
    if (preparado.estado === 'error') return preparado;
    const resultado = ejecutar(preparado.sesion);
    if (resultado.estado === 'error') {
      // No reemplazar el fin visible antes de persistir el nuevo activo.
      return fallo(sesion, resultado.sesion.error, { tipo: 'iniciar', candidata: resultado.sesion });
    }
    return resultado;
  }

  function recuperar() {
    const sesion = sesionVacia();
    const lectura = almacen.cargar();
    if (lectura.estado === 'error') return fallo(sesion, lectura, { tipo: 'recuperar' });
    if (lectura.estado === 'ausente') return exito(sesion);
    if (lectura.seguimiento === null) {
      const preparado = preparar({ ...sesion, partido: lectura.partido }, lectura.partido, true);
      if (preparado.estado === 'error') return preparado;
      return ejecutar(preparado.sesion);
    }
    const retomada = { ...sesion, partido: lectura.partido, seguimiento: lectura.seguimiento };
    if (lectura.seguimiento.operacion !== 'ninguna') return ejecutar(retomada);
    // Un contenedor compatible terminado sin intención se conserva igualmente.
    if (estaTerminado(lectura.partido)) {
      const preparado = preparar(retomada, lectura.partido, false);
      return preparado.estado === 'error' ? preparado : ejecutar(preparado.sesion);
    }
    return exito(retomada);
  }

  function aplicar(sesion, partido) {
    if (sesion.pendiente !== null) return bloqueado(sesion);
    if (sesion.conservacion === 'eliminado') {
      return { estado: 'error', etapa: 'eliminado', error: new Error('Este fin fue eliminado y no admite edición'), sesion };
    }
    if (partido === sesion.partido) return exito(sesion);
    const preparado = preparar(sesion, partido, false);
    return preparado.estado === 'error' ? preparado : ejecutar(preparado.sesion);
  }

  function liberar(sesion) {
    if (sesion.pendiente !== null) return bloqueado(sesion);
    const resultado = almacen.limpiar();
    return resultado.estado === 'error' ? fallo(sesion, resultado, { tipo: 'liberar' }) : exito(sesionVacia());
  }

  function eliminar(sesion, id) {
    if (sesion.pendiente !== null) return bloqueado(sesion);
    if (sesion.partido !== null && estaTerminado(sesion.partido) && sesion.seguimiento.id === id) {
      return ejecutar({ ...sesion, seguimiento: { ...sesion.seguimiento, operacion: 'eliminar', objetivoId: id } });
    }
    // Un error de eliminación ajena no convierte al activo en una operación pendiente.
    return { ...almacen.eliminarTerminado(id), sesion };
  }

  function reintentar(sesion) {
    const pendiente = sesion.pendiente;
    if (pendiente === null) return exito(sesion);
    if (pendiente.tipo === 'recuperar') return recuperar();
    if (pendiente.tipo === 'persistir') return ejecutar(sesion);
    const libre = { ...sesion, pendiente: null, error: null };
    if (pendiente.tipo === 'liberar') return liberar(libre);
    if (pendiente.tipo === 'iniciar') {
      const resultado = ejecutar(pendiente.candidata);
      return resultado.estado === 'error'
        ? fallo(sesion, resultado.sesion.error, { ...pendiente, candidata: resultado.sesion }) : resultado;
    }
    const preparado = preparar(libre, pendiente.partido, pendiente.nuevo);
    return preparado.estado === 'error' ? preparado : ejecutar(preparado.sesion);
  }

  return { recuperar, iniciar, aplicar, liberar, eliminar, reintentar };
}
