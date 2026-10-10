// Contenido de la pantalla de Ayuda: datos estáticos, sin DOM. Explica cómo se usa la app;
// no explica reglas de pádel (se asume que quien juega ya las conoce).
//
// Cada bloque es { tipo, ... }:
//   parrafo  { texto }          pasos   { items }         lista { items }
//   nota     { texto }          maqueta { id }            golpes {}
//   pregunta { pregunta, respuesta }
// ui.js sabe dibujar cada tipo. Los golpes salen de la lista fija, no se repiten a mano.

import { MOVIMIENTOS } from './movimientos.js';

export const ETIQUETAS_GOLPES = MOVIMIENTOS.map((movimiento) => movimiento.etiqueta);

export const SECCIONES = [
  {
    id: 'que-es',
    titulo: 'Qué es y para qué sirve',
    bloques: [
      { tipo: 'parrafo', texto: 'Padel Scores es un marcador para llevar el partido desde el teléfono. Pensado para que una persona que está afuera de la cancha vaya anotando cada punto, sin tener que escribir ni hacer cuentas: vos tocás lo que pasó y el marcador se actualiza solo.' },
      { tipo: 'parrafo', texto: 'Además del resultado, la app va juntando estadísticas de cada jugador (puntos ganados y fallos, y con qué golpe) y al final te arma un resumen listo para mandar por WhatsApp.' },
    ],
  },
  {
    id: 'crear',
    titulo: 'Crear un partido',
    bloques: [
      { tipo: 'maqueta', id: 'formulario' },
      { tipo: 'pasos', items: [
        'Escribí los 4 nombres: dos jugadores en la Pareja A (cian) y dos en la Pareja B (naranja). Son obligatorios: mientras falte alguno, el botón «Empezar» está deshabilitado.',
        'Elegí cuántos sets se juegan: 1 set (partido único), 3 sets (al mejor de 3) o 5 sets (al mejor de 5). Viene elegido 3.',
        'Elegí la modalidad: «Ventaja» (deuce + ventaja), «Punto de oro» (punto de oro en el deuce) o «Star point» (punto único). Viene elegido «Punto de oro».',
        'Elegí quién saca el primero: la Pareja A o la Pareja B. Debajo de cada botón ves los nombres de esa pareja. Es obligatorio: si tocás «Empezar» sin elegir, la app te avisa «Elegí qué pareja saca el primero.».',
        'Tocá «Empezar» (o la tecla Enter del teclado). Arranca el partido en 0 a 0.',
      ] },
      { tipo: 'nota', texto: 'Si tocás «Ayuda» o «Historial» mientras armás el partido, lo que escribiste se conserva: al volver lo encontrás igual.' },
    ],
  },
  {
    id: 'marcador',
    titulo: 'La pantalla del partido',
    bloques: [
      { tipo: 'maqueta', id: 'marcador' },
      { tipo: 'parrafo', texto: 'Arriba está el marcador y abajo la cancha con los cuatro jugadores. Así se lee el marcador:' },
      { tipo: 'lista', items: [
        'Los nombres de cada pareja, uno de cada lado. La pareja A va en cian y la B en naranja.',
        'La pelota amarilla pegada al nombre indica qué pareja saca en este momento.',
        'Parciales: los games del set que se está jugando.',
        'Sets: cuántos sets ganó cada pareja.',
        'El número grande de cada pareja es el punto del game actual. Cuando el set está en tie-break, entre los dos aparece «TB» en vez de «punto» y los números son los puntos del tie-break.',
        'Abajo del marcador pueden aparecer los avisos «set point» y «match point» para la pareja que corresponda.',
      ] },
      { tipo: 'parrafo', texto: 'En la cancha, la Pareja A queda del lado de arriba de la red y la Pareja B del lado de abajo. Cada jugador tiene su ficha con su nombre; los nombres largos se muestran más chicos para que entren.' },
    ],
  },
  {
    id: 'punto',
    titulo: 'Registrar un punto',
    bloques: [
      { tipo: 'parrafo', texto: 'Cada punto se anota en 3 toques:' },
      { tipo: 'maqueta', id: 'ficha' },
      { tipo: 'pasos', items: [
        'Tocá al jugador protagonista del punto. Su ficha se marca y le aparecen dos botones.',
        'Tocá ✓ (verde) si el jugador ganó el punto, o ✗ (rojo) si falló: en ese caso el punto es de la pareja rival.',
        'Elegí el golpe en la ventana que se abre.',
      ] },
      { tipo: 'maqueta', id: 'golpes' },
      { tipo: 'golpes' },
      { tipo: 'lista', items: [
        '«Sin especificar» es para cuando nadie vio bien qué pasó. El punto se anota igual.',
        '«Descartar», o tocar fuera de la ventana, cancela: no se registra nada.',
        'El punto se anota recién cuando elegís el golpe. Hasta ese momento el marcador no cambia.',
        'Si tocás a otro jugador antes de elegir ✓ o ✗, la selección pasa a ese jugador.',
      ] },
      { tipo: 'parrafo', texto: 'Los golpes sirven para las estadísticas de cada jugador: cuántos puntos ganó (winners) y cuántos fallos tuvo, y con qué golpe. Son aproximadas, tan buenas como lo que hayas anotado.' },
    ],
  },
  {
    id: 'anular',
    titulo: 'Anular el último punto',
    bloques: [
      { tipo: 'parrafo', texto: 'El botón «Anular último punto» deshace el último punto registrado: vuelve el marcador y las estadísticas a como estaban antes.' },
      { tipo: 'lista', items: [
        'Solo se puede anular el último punto, no varios para atrás.',
        'Si no hay nada para anular, el botón aparece deshabilitado.',
        'Deja de estar disponible si corregís el marcador a mano, si cerrás el partido o si recargás la página.',
      ] },
    ],
  },
  {
    id: 'corregir',
    titulo: 'Corregir el marcador a mano',
    bloques: [
      { tipo: 'maqueta', id: 'editor' },
      { tipo: 'parrafo', texto: 'Si el marcador quedó mal (por ejemplo, un punto que no anotaste), podés corregirlo directamente:' },
      { tipo: 'pasos', items: [
        'Para el punto del game: tocá el número grande de la pareja. Se abre una fila con los valores posibles.',
        'Para los games: tocá el número de la pareja en «Parciales». Se abre la misma fila con los valores posibles.',
        'Tocá el valor que querés y se aplica al instante. Con la X cerrás la fila sin cambiar nada.',
      ] },
      { tipo: 'lista', items: [
        'Con el partido en curso solo se pueden editar los games del set que se está jugando. Un set que ya terminó se corrige desde la pantalla de fin.',
        'Si cambiás la cuenta de games, el saque se actualiza solo.',
        'Las estadísticas no se recalculan al corregir: editar el marcador no agrega ni quita golpes.',
      ] },
    ],
  },
  {
    id: 'saque',
    titulo: 'Quién saca',
    bloques: [
      { tipo: 'parrafo', texto: 'Solo tenés que decir quién saca el primero al crear el partido. A partir de ahí la pelota amarilla se mueve sola de una pareja a la otra. No hay que registrar el saque ni indicar qué jugador saca.' },
    ],
  },
  {
    id: 'fin',
    titulo: 'Cuando termina el partido',
    bloques: [
      { tipo: 'parrafo', texto: 'Al ganarse el último punto aparece un aviso con la pareja ganadora y dos botones:' },
      { tipo: 'lista', items: [
        '«Avanzar»: pasa a la pantalla de fin.',
        '«Anular último punto»: si el último punto estaba mal anotado, lo deshace y el partido sigue.',
      ] },
      { tipo: 'parrafo', texto: 'Mientras ese aviso está en pantalla no se puede usar el resto de la app. La pantalla de fin muestra el marcador con todos los sets, cómo terminó, el resumen en texto y estos botones:' },
      { tipo: 'lista', items: [
        '«Copiar resumen»: copia el texto para pegarlo en WhatsApp. Si el teléfono no deja copiar, la app te avisa; en ese caso seleccioná el texto del resumen con el dedo y copialo a mano.',
        '«Reiniciar»: pide confirmación y vuelve el marcador y las estadísticas a cero. Se conservan los nombres y la configuración (sets, modalidad y quién saca primero).',
        '«Empezar otro»: te lleva a la pantalla de crear partido, con el formulario vacío y las opciones en sus valores iniciales (3 sets, punto de oro, sin pareja elegida para sacar). El partido que terminó queda en el Historial.',
        '«Historial» y «Ayuda»: abren esas pantallas y después volvés a la de fin.',
      ] },
      { tipo: 'nota', texto: 'Si el partido terminó por un error, podés tocar un número de los parciales y corregir un set: el partido se reabre y podés seguir registrando puntos. Mientras esté reabierto no figura en el Historial; vuelve a guardarse cuando termine de nuevo.' },
    ],
  },
  {
    id: 'cerrar',
    titulo: 'Cerrar el partido a mano',
    bloques: [
      { tipo: 'parrafo', texto: 'Con el partido en curso, el botón «Cerrar» lo da por terminado antes de tiempo (por ejemplo, si se acabó la hora de cancha). Pide confirmación y es definitivo: te lleva a la pantalla de fin, que dice «Cerrado a mano». Un partido cerrado a mano ya no se puede editar; lo único que se puede hacer es «Reiniciar» o «Empezar otro». Queda guardado en el Historial.' },
    ],
  },
  {
    id: 'historial',
    titulo: 'Historial',
    bloques: [
      { tipo: 'lista', items: [
        'Un partido se guarda en el Historial solo cuando termina (por sets o cerrado a mano). No hay que hacer nada.',
        'La lista muestra primero el más reciente, con la fecha, los equipos, el resultado en sets y los parciales.',
        '«Ver detalle» abre el partido completo, con las estadísticas por jugador: winners y fallos de cada golpe.',
        '«Eliminar» borra el partido del Historial. Pide confirmación y no se puede recuperar.',
        '«Volver» te lleva de vuelta a donde estabas, y si había un partido en curso sigue exactamente como lo dejaste.',
        'El Historial se guarda solo en este navegador y dispositivo. Si borrás los datos del navegador, podés perderlo; y no lo vas a ver desde otro teléfono.',
      ] },
    ],
  },
  {
    id: 'retomar',
    titulo: 'Si cerrás o recargás la página',
    bloques: [
      { tipo: 'parrafo', texto: 'No pasa nada: el partido en curso se guarda a medida que jugás y al volver a abrir la app se retoma solo, en el mismo punto. Hay un solo partido activo a la vez; para empezar otro tenés que terminar o cerrar el que está en curso.' },
      { tipo: 'nota', texto: 'Lo único que no se conserva al recargar es la posibilidad de anular el último punto.' },
    ],
  },
  {
    id: 'consejos',
    titulo: 'Consejos para usarla en la cancha',
    bloques: [
      { tipo: 'lista', items: [
        'Anotá cada punto apenas termina: son 3 toques y se hace rápido.',
        'Si no viste bien el golpe, usá «Sin especificar» en lugar de frenar el partido.',
        'Si te equivocás de jugador o de ✓/✗ antes de elegir el golpe, usá «Descartar» y empezá de nuevo.',
        'Podés girar el teléfono sin perder nada del partido.',
        'Al terminar, copiá el resumen y pegalo en el grupo de WhatsApp.',
      ] },
    ],
  },
  {
    id: 'faq',
    titulo: 'Preguntas frecuentes',
    bloques: [
      { tipo: 'pregunta', pregunta: 'Me equivoqué de golpe', respuesta: 'Si todavía no lo elegiste, tocá «Descartar» y empezá de nuevo. Si el punto ya se anotó y fue el último, usá «Anular último punto» y volvé a registrarlo. Si ya pasaron más puntos, el golpe no se puede cambiar: la app no permite editar las estadísticas.' },
      { tipo: 'pregunta', pregunta: 'Me equivoqué de jugador o apreté ✓ en vez de ✗', respuesta: 'Es lo mismo: antes de elegir el golpe, «Descartar»; justo después de anotarlo, «Anular último punto». Más tarde ya no se puede deshacer; podés arreglar el marcador a mano, pero las estadísticas quedan como estaban.' },
      { tipo: 'pregunta', pregunta: 'El marcador quedó mal', respuesta: 'Tocá el número grande de la pareja (para el punto del game) o el número de «Parciales» (para los games) y elegí el valor correcto. Ver «Corregir el marcador a mano».' },
      { tipo: 'pregunta', pregunta: 'No puedo copiar el resumen', respuesta: 'En algunos teléfonos o formas de abrir la app, copiar automáticamente no funciona. Seleccioná el texto del resumen con el dedo, copialo y pegalo en WhatsApp.' },
      { tipo: 'pregunta', pregunta: 'Cómo empiezo otro partido', respuesta: 'Cuando el partido terminó, en la pantalla de fin tocá «Empezar otro». Si todavía está en juego, tenés que terminarlo o usar «Cerrar» primero.' },
      { tipo: 'pregunta', pregunta: 'No veo mi partido en el Historial', respuesta: 'Los partidos aparecen recién cuando terminan. Un partido en curso, o uno que reabriste para corregir un set, todavía no está en la lista. Tampoco se ve si lo jugaste en otro teléfono o si se borraron los datos del navegador.' },
      { tipo: 'pregunta', pregunta: 'Aparece un aviso rojo con «Reintentar»', respuesta: 'Significa que no se pudo guardar. Tocá «Reintentar» antes de seguir; si recargás la página justo ahí, podés perder los últimos cambios.' },
    ],
  },
];
