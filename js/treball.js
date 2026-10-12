/*
 * Proyecto personal GPC: La rata de la plaza
 *
 * Version V5. Estructura copiada del seminario Tron (tron-v1.js):
 *   1- escenario        plaza circular grande, bordillo, fachadas, fuente, farolas, skybox
 *                       y mobiliario con primitivas (mesas, sillas, papeleras, jardineras, bolardos)
 *   2- rata             modelo GLTF con animaciones (ej-loader.js + ej-mixamo.js)
 *   3- movimiento y camara en tercera persona (s3-cam2.js + camara de muelle del Tron)
 *                       con dash de energia limitada (Shift)
 *   4- colisiones       raycaster contra cilindros invisibles (s3-colisiones.js + Tron)
 *   5- personas         pasean de forma erratica; las que saben dar patadas se acercan y
 *                       patean; chocar con cualquiera de ellas acaba la partida
 *   6- quesos           cunas amarillas brillantes que aparecen al azar y se recogen
 *   7- escondites       alcantarillas (nadie te sigue) y arboles (la rata y el gato suben,
 *                       el perro no llega)
 *   7c- plataformas     escalon de la fuente, parterres y bancos: se sube de un salto (Espacio);
 *                       personas y perros no suben, los gatos si. Altura del suelo por rayo
 *                       vertical, copiado del Tron
 *   8- perseguidores    gatos y perros con modelo GLTF (o primitivas si falta el fichero);
 *                       persiguen hasta que te escondes de ellos
 *   9- estado del juego HUD, barra de energia, fps y fin de partida
 *  10- menu y records  menu inicial con nombre de partida, tiempo limite (20 s desde que
 *                       despiertan los animales, +5 s por queso) y tabla de mejores partidas,
 *                       online con Supabase si esta configurado (js/config_online.js)
 */

var renderer, scene, camera;
var cameraControls;
var cameraTop;
var stats;
const objetivo_camera_top = new THREE.Vector3();

var clock = new THREE.Clock();

// 1- escenario
// Medidas principales de la plaza. Es un circulo centrado en el origen.
const radio_plaza = 45;
const radio_acera = 52;
const radio_fachadas = 58;
var obstaculos = null;          // grupo con el mobiliario: obstaculo para todos
var zonas_ocupadas = [];        // {x, z, radio} de todo lo que ocupa suelo, para no poner quesos encima
const alcance_hud = radio_acera * 2 + 4;
var fuente = null;
var agua_fuente = null;

// 2- rata
var pos_rata = new THREE.Vector3(0, 0, -14);
var rata = null;
var mixer = null;
var acciones_rata = {};
var accion_actual = null;
// El modelo de Quaternius viene mirando hacia +Z, igual que nuestro vector velocity,
// asi que no hace falta sumar PI/2 como con la moto del Tron.
const escala_rata = 0.26;   // la rata mide unos 0.6 de alto

// 3- movimiento y camara en tercera persona
// Copiado y pegado de s3-cam2.js / s3-colisiones.js.
var angulo = 0;
var velocity = new THREE.Vector3(0, 0, 1);

// DASH- la carrera (Shift) gasta energia: dura unos segundos y luego hay que
// esperar a que se recargue. Sirve para escapar de los gatos y llegar a un escondite.
const duracion_dash = 2.0;     // segundos corriendo seguidos con la energia llena
const recarga_dash = 5.0;      // segundos para recuperar toda la energia
const energia_minima_dash = 0.25;  // no se puede volver a correr hasta tener este cuarto
var energia_dash = 1;          // de 0 (vacia) a 1 (llena)
var dash_activo = false;

// FINAL- inclinacion visual al girar (copiado del Tron).
const inclinacion_maxima = THREE.MathUtils.degToRad(12);
const rapidez_inclinacion = 10;
let inclinacion_actual = 0;

// FINAL- salto con cinematica basica (copiado del Tron). Aqui el suelo es plano,
// asi que no hace falta el rayo vertical: el suelo esta siempre en y = 0.
const gravedad = -18;
const impulso_salto = 5.5;      // llega a unos 0.84 de alto: suficiente para las plataformas (0.5)
let velocidad_vertical = 0;
let en_suelo = true;

// 7c- plataformas. Deteccion de la altura del suelo con un rayo vertical, copiada
// del Tron (detectarSuelo). Solo las plataformas estan en objetosSuelo: si el rayo
// no toca nada, el suelo es la plaza (y = 0).
const objetosSuelo = [];
const raycaster_suelo = new THREE.Raycaster();
const origen_rayo_suelo = new THREE.Vector3();
const direccion_rayo_suelo = new THREE.Vector3(0, -1, 0);
const altura_escalon_rata = 0.35;   // lo que la rata sube andando sin saltar
const altura_escalon_gato = 0.8;    // los gatos trepan a las plataformas sin saltar
var plataformas = [];               // {tipo, x, z, ancho, fondo, angulo, altura} para poner quesos encima
var grupo_plataformas = null;
// Cajas invisibles que solo frenan a personas y perros: debajo de un banco cabe la
// rata (y el gato sube), pero una persona no deberia atravesarlo entre las patas.
var bloqueo_grandes = null;
var rata_en_plataforma = false;

// Ponemos este modo a true para ajustar la camara y a false para jugar.
var modo_tunear_camara = false;
var distancia_camara = 3.5;
var altura_camara = 1.5;
var desfase_lookat_y = 0.4;

// CAMARA VIGIA- en un escondite (alcantarilla o arbol) la camara sube y se aleja,
// mira unos metros por delante de la rata y abre el angulo de vision: es el zoom
// cambiando el fovy del tema 3. Asi se ve quien ronda y se elige por donde salir;
// con A/D se gira la vista sin salir del escondite.
const distancia_camara_escondite = 10;
const altura_camara_escondite = 13;
const adelanto_mirada_escondite = 3;
const fov_normal = 50;
const fov_escondite = 72;

// FINAL- spring camera. La rigidez atrae la camara hacia su posicion ideal y
// la amortiguacion frena su velocidad para que no oscile indefinidamente.
const rigidez_camara = 50;
const amortiguacion_camara = 14;
const velocidad_camara = new THREE.Vector3();
const velocidad_mirada_camara = new THREE.Vector3();
const posicion_objetivo_camara = new THREE.Vector3();
const mirada_objetivo_camara = new THREE.Vector3();
const mirada_actual_camara = new THREE.Vector3();
const aceleracion_camara = new THREE.Vector3();
let camara_spring_iniciada = false;

// DEBUG- permite cambiar entre tercera persona y camara orbital con la tecla C.
var camara_orbital = false;

// PAUSA- la escena sigue dibujandose, pero el juego deja de actualizarse.
var juego_pausado = false;

// 4- colisiones
// Copiado y pegado LITERAL de js/s3-colisiones.js.
const raycaster = new THREE.Raycaster();
var objectsToCheck = [];      // lo que frena a la rata
var objectsToCheckIA = [];    // lo que esquivan las personas
var objectsToCheckGatos = []; // lo que esquivan los gatos (pueden pasar junto a los arboles)
var marcador_rata = null;
// RADAR- el minimapa sigue a la rata y gira con ella: arriba siempre es hacia donde
// mira (el ejercicio "dificil" de la vista superior de la sesion 3). Con M se cambia
// al mapa completo de la plaza, fijo y con el norte arriba.
var modo_radar = true;
const alcance_radar = 48;           // lado del cuadrado que se ve en modo radar
var alcance_mapa_actual = 0;        // para recalcular la proyeccion solo al cambiar
var lado_mapa_actual = 0;           // para recolocar el marco solo al cambiar de tamano
// Marcadores de la vista de planta (rata, personas, animales y quesos). Solo se ven en el HUD.
var marcadores = [];
const color_marcador = { rata: 0xff0000, persona: 0x3399ff, gato: 0xcc44ff, perro: 0xff7a00, queso: 0xffee00 };
// Material invisible para los cilindros de colision (copiado del limite de la arena del Tron).
const material_invisible = new THREE.MeshBasicMaterial({
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0,
  depthWrite: false,
  colorWrite: false
});

const controls = {
  moveForward: false,
  moveBackward: false,
  moveLeft: false,
  moveRight: false,
  run: false,
  lookAtDown: false,
  lookAtUp: false,
  speed: 0.08,
  speedRun: 0.16
};

// 5- personas
const velocidad_persona = 0.05;
const distancia_deteccion_persona = 3;   // distancia a la que esquivan obstaculos
const giro_persona = 0.04;
// Altura que queremos para las personas. Cada GLB de Quaternius trae una escala
// interna distinta, asi que la escala se calcula al cargar midiendo su caja envolvente.
const altura_persona = 2.6;
// Deteccion de la rata: cerca y dentro del campo de vision (120 grados).
const radio_vision_persona = 4;
const cos_medio_angulo_vision = Math.cos(THREE.MathUtils.degToRad(60));
const alcance_patada = 1.9;              // si la rata esta mas cerca cuando llega el golpe, pierde
const momento_impacto_patada = 0.45;     // segundos desde que empieza el clip
const frames_maximos_acercando = 240;    // si en 4 segundos no alcanza a la rata, desiste
const distancia_atrapar_persona = 1.2;   // chocar con una persona tambien acaba la partida
var personas = [];

// Rayos compartidos por personas y gatos (copiado de la IA del Tron).
const raycaster_ia = new THREE.Raycaster();
const hacia_rata_tmp = new THREE.Vector3();   // vector reutilizado cada frame (sin new)
const origen_rayo_ia = new THREE.Vector3();
const direccion_izquierda_ia = new THREE.Vector3();
const direccion_derecha_ia = new THREE.Vector3();

// Ficheros de las personas. Los tres primeros (CharacterArmature) traen el clip
// Kick_Right; los otros solo tienen Punch y atrapan a la rata al chocar con ella.
const ficheros_personas = [
  'models/personas/Punk by Quaternius - BTALZymknF.glb',
  'models/personas/Business Man by Quaternius - JFrLIKqvCH.glb',
  'models/personas/Adventurer by Quaternius - 5EGWBMpuXq.glb',
  'models/personas/Man by Quaternius - HMnuH5geEG.glb',
  'models/personas/Woman Casual by Quaternius - jpKRgGDxhk.glb',
  'models/personas/Woman in Dress by Quaternius - zMyPlQXBzq.glb',
  'models/personas/Punk by Quaternius - BTALZymknF.glb',
  'models/personas/Man by Quaternius - HMnuH5geEG.glb'
];

// 6- quesos
const max_quesos = 10;
const segundos_entre_quesos = 2.5;
const distancia_recoger_queso = 0.9;
var quesos = [];
var quesos_recogidos = 0;
var tiempo_hasta_queso = 1;
var textura_halo = null;
var textura_haz = null;         // degradado vertical para las columnas de luz de los escondites
var material_queso = null;

// 7- escondites
const radio_escondite = 1.1;
const profundidad_escondite = 0.5;   // cuanto baja la rata por la alcantarilla
var escondites = [];
var rata_escondida = false;

// 7b- arboles: segundo tipo de escondite. La rata sube, el gato tambien, el perro no llega.
const radio_arbol = 1.3;
const altura_subida_rata = 1.9;
const altura_subida_gato = 1.3;
var arboles = [];
var troncos = null;            // grupo con los troncos: obstaculo para personas y perros
var rata_en_arbol = false;
var arbol_actual = null;

// 8- perseguidores: gatos y perros. Cada tipo tiene sus ficheros (se reparten entre
// los animales del tipo), tamano, velocidad y alcance de vision; solo el gato trepa.
// Todos los modelos de Quaternius miran hacia +Z, igual que la rata: se comprobo
// mirando donde queda el hueso de la cabeza respecto a la cola en cada GLB.
// Los modelos sin esqueleto (Poly by Google, madtrollstudio) no se usan: no pueden andar.
const tipos_perseguidor = {
  gato: {
    nombre: 'gato',
    ficheros: ['models/gato/Cat by Quaternius - qKICY6xla2.glb'],
    // Tintes para distinguir a los gatos que salen del mismo fichero (como la moto
    // roja de la IA del Tron, que se colorea clonando los materiales).
    tintes: [0xffffff, 0xffb070, 0x9aa0b4, 0x806050],
    altura: 1.0,
    velocidad: 0.09,       // mas rapido que la rata andando, mas lento que con dash
    radio_vision: 9,
    ancho: 0.2,            // media anchura del cuerpo (para los rayos laterales)
    alcance: 0.6,          // del centro al hocico (distancia a la que se para)
    sube_arboles: true,
    cantidad: 4,
    color_reserva: 0x444444
  },
  perro: {
    nombre: 'perro',
    // El Pug de Quaternius no se usa: su GLB solo trae los clips Idle y Jump, sin andar.
    ficheros: [
      'models/perro/Shiba Inu by Quaternius - y4wdQpg767.glb',
      'models/perro/Husky by Quaternius - wcWiuEqwzq.glb'
    ],
    tintes: [0xffffff, 0xffffff, 0xd8c8b0, 0xb0b8c8],
    altura: 1.3,
    velocidad: 0.1,
    radio_vision: 12,
    ancho: 0.25,
    alcance: 0.75,
    sube_arboles: false,
    cantidad: 4,
    color_reserva: 0xc08040
  }
};
const giro_perseguidor = 0.08;
const distancia_atrapar = 0.9;
const segundos_de_gracia = 6;   // al empezar, los perseguidores tardan un poco en fijarse en la rata
var perseguidores = [];
var objectsToCheckPerros = [];  // como el de los gatos, pero con los troncos de los arboles

// 9- estado del juego
var juego_terminado = false;

// 10- menu, tiempo limite y records
var partida_iniciada = false;      // hasta pulsar "Empezar" solo se ve la plaza de fondo
var nombre_partida = '';
var tiempo_partida = 0;            // segundos jugados (no cuenta la pausa ni el menu)
const tiempo_inicial = 20;         // segundos de margen cuando despiertan gatos y perros
const tiempo_por_queso = 5;        // cada queso alarga el limite
var tiempo_restante = tiempo_inicial;
var aviso_bonus = 0;               // segundos que queda visible el "+5 s"
var angulo_menu = 0;               // la camara gira alrededor de la plaza en el menu
const clave_records = 'rata_plaza_records';
const clave_nombre = 'rata_plaza_nombre';
const max_records = 10;
// DIAGNOSTICO- la tecla L alterna el modo ligero: sin sombras ni brillos. Si con el
// los FPS suben, el cuello de botella esta en el GPU (ventana grande, pantalla retina).
var modo_ligero = false;

// 3- movimiento y camara en tercera persona
// Copiado y pegado LITERAL de js/s3-cam2.js. Se anaden Shift, espacio, C, P y R como en el Tron.
document.addEventListener('keydown', (event) => {
  // En el menu las teclas son para escribir el nombre, no para mover la rata.
  if (!partida_iniciada)
    return;

  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      controls.moveForward = true;
      break;
    case 'ArrowDown':
    case 'KeyS':
      controls.moveBackward = true;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      controls.moveLeft = true;
      break;
    case 'ArrowRight':
    case 'KeyD':
      controls.moveRight = true;
      break;
    case 'ShiftLeft':
    case 'ShiftRight':
      controls.run = true;
      break;
    // Teclas para tunear el desfase vertical del lookAt.
    case 'KeyQ':
      controls.lookAtDown = true;
      break;
    case 'KeyE':
      controls.lookAtUp = true;
      break;
    // FINAL- la barra espaciadora inicia el salto.
    case 'Space':
      event.preventDefault();
      saltar();
      break;
    // PAUSA- la tecla P alterna pausa y camara orbital.
    case 'KeyP':
      if (!event.repeat && !juego_terminado)
        cambiarPausa();
      break;
    // Reiniciar la partida.
    case 'KeyR':
      if (juego_terminado)
        location.reload();
      break;
    // RADAR- alterna entre radar (sigue a la rata) y mapa completo.
    case 'KeyM':
      if (!event.repeat)
        modo_radar = !modo_radar;
      break;
    // Modo ligero (diagnostico de rendimiento).
    case 'KeyL':
      if (!event.repeat)
        alternarModoLigero();
      break;
  }
});

// DIAGNOSTICO- apaga o enciende las sombras y los brillos (halos y columnas de luz).
// Cambiar las sombras obliga a recompilar los materiales: tarda un momento.
function alternarModoLigero()
{
  modo_ligero = !modo_ligero;

  renderer.shadowMap.enabled = !modo_ligero;
  scene.traverse(function(objeto) {
    if (objeto.material) objeto.material.needsUpdate = true;
  });

  var brillos = [];
  escondites.forEach(function(e) { brillos.push(e.halo, e.haz); });
  arboles.forEach(function(a) { brillos.push(a.halo, a.haz); });
  quesos.forEach(function(q) { brillos.push(q.halo, q.charco); });
  brillos.forEach(function(b) { b.visible = !modo_ligero; });

  console.log(modo_ligero ? 'Modo ligero: sin sombras ni brillos' : 'Modo normal');
}

document.addEventListener('keyup', (event) => {
  if (!partida_iniciada)
    return;

  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      controls.moveForward = false;
      break;
    case 'ArrowDown':
    case 'KeyS':
      controls.moveBackward = false;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      controls.moveLeft = false;
      break;
    case 'ArrowRight':
    case 'KeyD':
      controls.moveRight = false;
      break;
    case 'ShiftLeft':
    case 'ShiftRight':
      controls.run = false;
      break;
    case 'KeyQ':
      controls.lookAtDown = false;
      break;
    case 'KeyE':
      controls.lookAtUp = false;
      break;
    // DEBUG- cambio de camara.
    case 'KeyC':
      if (!juego_pausado)
        cambiarCamara();
      break;
  }
});

// FINAL- solo se puede iniciar otro salto despues de volver al suelo.
function saltar()
{
  if (rata === null || !en_suelo || juego_pausado || juego_terminado || rata_escondida || rata_en_arbol)
    return;

  velocidad_vertical = impulso_salto;
  en_suelo = false;
  cambiarAnimacionRata('Jump');
}

// 4- colisiones de la rata. El rayo de s3-colisiones.js sale del centro del cuerpo;
// con uno solo, un bolardo o una farola fina se colaba por un lado. Lanzamos tres,
// como tres bigotes: centro e izquierda y derecha del cuerpo. Salen a 0.3 de los pies,
// asi que en el aire pasan por encima de lo bajo y la rata cae encima (ver objetosSuelo).
const ancho_rata = 0.2;
const lateral_rayo = new THREE.Vector3();
const origen_rayo_rata = new THREE.Vector3();
function caminoLibreRata(direccion, distancia)
{
  // Vector perpendicular a la direccion, en el plano del suelo: (z, 0, -x).
  lateral_rayo.set(direccion.z, 0, -direccion.x).multiplyScalar(ancho_rata);
  raycaster.far = distancia;
  for (var lado = -1; lado <= 1; lado++) {
    origen_rayo_rata.copy(pos_rata).addScaledVector(lateral_rayo, lado);
    origen_rayo_rata.y += 0.3;
    raycaster.set(origen_rayo_rata, direccion);
    if (raycaster.intersectObjects(objectsToCheck, true).length > 0)
      return false;
  }
  return true;
}

// Altura del suelo bajo un punto: rayo hacia abajo lanzado desde un poco por encima
// de la altura actual (asi un escalon mas alto que ese margen no cuenta como suelo).
function alturaSuelo(x, z, alturaActual, margen)
{
  origen_rayo_suelo.set(x, alturaActual + margen, z);
  raycaster_suelo.set(origen_rayo_suelo, direccion_rayo_suelo);
  raycaster_suelo.far = alturaActual + margen + 1;

  var impactos = raycaster_suelo.intersectObjects(objetosSuelo, true);
  return impactos.length > 0 ? impactos[0].point.y : 0;
}

// Copiado de actualizarAlturaJugador() del Tron. En el suelo la rata sigue la altura
// de lo que tenga debajo (si se sale de una plataforma, cae); en el aire aplica la
// gravedad y aterriza sobre la primera superficie que encuentra.
function actualizarAlturaRata(delta)
{
  var alturaDebajo = alturaSuelo(pos_rata.x, pos_rata.z, pos_rata.y, altura_escalon_rata);

  if (en_suelo) {
    if (pos_rata.y > alturaDebajo + 0.05) {
      // Ha salido por el borde de una plataforma: empieza a caer.
      en_suelo = false;
      velocidad_vertical = 0;
    } else {
      pos_rata.y = alturaDebajo;
      return;
    }
  }

  velocidad_vertical += gravedad * delta;
  pos_rata.y += velocidad_vertical * delta;

  if (velocidad_vertical <= 0 && pos_rata.y <= alturaDebajo) {
    pos_rata.y = alturaDebajo;
    velocidad_vertical = 0;
    en_suelo = true;
  }
}

// DASH- gasta energia mientras se corre y la recupera cuando no. Devuelve la
// velocidad que toca este frame.
function actualizarDash(delta)
{
  var quiereCorrer = controls.run && controls.moveForward;

  if (quiereCorrer && energia_dash > 0 && (dash_activo || energia_dash >= energia_minima_dash)) {
    dash_activo = true;
    energia_dash -= delta / duracion_dash;
    if (energia_dash <= 0) {
      energia_dash = 0;
      dash_activo = false;
    }
  } else {
    dash_activo = false;
    energia_dash = Math.min(1, energia_dash + delta / recarga_dash);
  }

  return dash_activo ? controls.speedRun : controls.speed;
}

// FINAL- inclina sobre el eje longitudinal local y vuelve suavemente al
// centro cuando se suelta la direccion.
function actualizarInclinacion(delta)
{
  let inclinacion_objetivo = 0;

  if (controls.moveLeft)
    inclinacion_objetivo = inclinacion_maxima;
  else if (controls.moveRight)
    inclinacion_objetivo = -inclinacion_maxima;

  const factor = 1 - Math.exp(-rapidez_inclinacion * delta);
  inclinacion_actual +=
    (inclinacion_objetivo - inclinacion_actual) * factor;

  // Primero orientamos la rata hacia delante y despues aplicamos el balanceo
  // alrededor de su propio eje, no alrededor de un eje fijo de la escena.
  rata.rotation.set(0, angulo, 0);
  rata.rotateZ(inclinacion_actual);
}

init();
loadScene();
prepararMenu();
render();

function init()
{
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(new THREE.Color(0x000000));
  renderer.outputEncoding = THREE.sRGBEncoding;
  // sombras: 1- habilitar sombras en el renderizador (s5-luces.js)
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // RENDIMIENTO- dibujamos dos vistas por frame (principal y minimapa) y, por defecto,
  // Three.js vuelve a calcular el mapa de sombras en cada render(). Lo calculamos
  // nosotros una vez por frame (needsUpdate en render()) y el minimapa lo reutiliza.
  renderer.shadowMap.autoUpdate = false;
  document.getElementById('container').appendChild(renderer.domElement);

  scene = new THREE.Scene();

  // Iluminacion basica incluida en la plantilla del Tron.
  var luzAmbiente = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(luzAmbiente);

  var luzDireccional = new THREE.DirectionalLight(0xffffff, 0.8);
  luzDireccional.position.set(60, 90, -40);
  // sombras: 2- idem en la luz. La camara de sombras de una luz direccional es
  // ortografica y por defecto es muy pequena: la ampliamos para cubrir la plaza.
  luzDireccional.castShadow = true;
  luzDireccional.shadow.mapSize.width = 2048;
  luzDireccional.shadow.mapSize.height = 2048;
  luzDireccional.shadow.camera.left = -radio_acera;
  luzDireccional.shadow.camera.right = radio_acera;
  luzDireccional.shadow.camera.top = radio_acera;
  luzDireccional.shadow.camera.bottom = -radio_acera;
  luzDireccional.shadow.camera.near = 1;
  luzDireccional.shadow.camera.far = 250;
  scene.add(luzDireccional);

  // RENDIMIENTO- las dos luces tambien iluminan la capa 1 (la del minimapa), para que
  // la fuente, las plataformas y el mobiliario no salgan negros en la vista de planta.
  luzAmbiente.layers.enable(1);
  luzDireccional.layers.enable(1);

  // Nota: antes cada queso tenia una luz puntual (tema 4). En el modelo de Phong cada
  // luz es un termino mas de la suma que se calcula en CADA pixel de cada material,
  // asi que 10 luces multiplicaban el trabajo de toda la pantalla. Ahora el charco de
  // luz se pinta en el suelo con un disco brillante (ver crearQueso).

  var aspectRatio = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(50, aspectRatio, 0.1, 1000);
  // 1 - Camara adaptada al escenario
  camera.position.set(radio_plaza, 25, radio_plaza);

  // Camara cenital ortografica para el HUD (vista de planta de s3-cam2.js).
  cameraTop = new THREE.OrthographicCamera(
    -alcance_hud / 2,
    alcance_hud / 2,
    alcance_hud / 2,
    -alcance_hud / 2,
    1,
    200
  );
  cameraTop.up.set(0, 0, -1);
  // RENDIMIENTO- como el HUD del Tron (halo_hud.layers.set(1)), la vista de planta solo
  // dibuja la capa 1: un suelo esquematico de color plano, las piezas que sirven para
  // orientarse y los marcadores. Asi no se calcula el suelo con texturas, luces y
  // sombras en cada pixel del minimapa.
  cameraTop.layers.set(1);

  cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
  cameraControls.target.set(0, 1, 0);
  cameraControls.enableKeys = false;

  // 3- movimiento y camara en tercera persona
  // La camara pasa a estar controlada por updateCamera().
  cameraControls.enabled = false;

  // Monitor de rendimiento (Stats.js, sesion 4). Lo colocamos a la derecha, bajo el HUD.
  stats = new Stats();
  stats.showPanel(0);   // 0: fps
  stats.domElement.style.left = 'auto';
  stats.domElement.style.right = '10px';
  stats.domElement.style.top = '110px';
  document.getElementById('container').appendChild(stats.domElement);

  window.addEventListener('resize', updateAspectRatio);
}

// SKYBOX- solucion sencilla copiada del Tron: una imagen normal sobre un objeto
// grande visto desde dentro (BackSide). El Tron usa un cilindro; como nuestra
// imagen es un panorama de 360 grados, una esfera la envuelve sin deformarla.
function crearSkybox()
{
  var texturaSkybox = new THREE.TextureLoader().load('images/cielo.jpg');
  texturaSkybox.encoding = THREE.sRGBEncoding;

  var geometriaSkybox = new THREE.SphereGeometry(400, 48, 24);
  var materialSkybox = new THREE.MeshBasicMaterial({
    map: texturaSkybox,
    side: THREE.BackSide,
    depthWrite: false
  });
  var skybox = new THREE.Mesh(geometriaSkybox, materialSkybox);
  scene.add(skybox);
}

function loadScene()
{
  // 1 - ESCENARIO

  crearSkybox();

  // Suelo circular de la plaza. CircleGeometry se crea en vertical, por eso lo giramos.
  var geometriaSuelo = new THREE.CircleGeometry(radio_plaza, 128);

  // TEXTURA SUELO- adoquines de Poly Haven. Repetimos la textura para no
  // estirar una sola copia sobre toda la plaza (s5-texturas.js). Una baldosa
  // cada 4 unidades: el diametro entre 4.
  var repeticiones = radio_plaza * 2 / 4;
  var texturaSuelo = new THREE.TextureLoader().load(
    'images/cobblestone_pavement_diff_1k.jpg'
  );
  texturaSuelo.wrapS = THREE.RepeatWrapping;
  texturaSuelo.wrapT = THREE.RepeatWrapping;
  texturaSuelo.repeat.set(repeticiones, repeticiones);
  texturaSuelo.encoding = THREE.sRGBEncoding;

  // El mapa de normales da relieve a los adoquines sin anadir poligonos (tema 5).
  var normalesSuelo = new THREE.TextureLoader().load(
    'images/cobblestone_pavement_nor_gl_1k.jpg'
  );
  normalesSuelo.wrapS = THREE.RepeatWrapping;
  normalesSuelo.wrapT = THREE.RepeatWrapping;
  normalesSuelo.repeat.set(repeticiones, repeticiones);

  var materialSuelo = new THREE.MeshPhongMaterial({
    map: texturaSuelo,
    normalMap: normalesSuelo,
    shininess: 10
  });
  // Suelo esquematico del minimapa (solo capa 1): material basico, sin luces ni sombras.
  var sueloMapa = new THREE.Mesh(
    new THREE.CircleGeometry(radio_plaza, 64),
    new THREE.MeshBasicMaterial({ color: 0x77716a })
  );
  sueloMapa.rotation.x = -Math.PI / 2;
  sueloMapa.layers.set(1);
  scene.add(sueloMapa);
  var aceraMapa = new THREE.Mesh(
    new THREE.RingGeometry(radio_plaza, radio_acera, 64, 1),
    new THREE.MeshBasicMaterial({ color: 0xb8b2a8 })
  );
  aceraMapa.rotation.x = -Math.PI / 2;
  aceraMapa.layers.set(1);
  scene.add(aceraMapa);

  var suelo = new THREE.Mesh(geometriaSuelo, materialSuelo);
  suelo.rotation.x = -Math.PI / 2;
  suelo.receiveShadow = true;
  scene.add(suelo);

  // Acera: una corona circular gris entre el bordillo y las fachadas.
  var geometriaAcera = new THREE.RingGeometry(radio_plaza, radio_acera, 128, 1);
  var materialAcera = new THREE.MeshPhongMaterial({ color: 0x8a8580 });
  var acera = new THREE.Mesh(geometriaAcera, materialAcera);
  acera.rotation.x = -Math.PI / 2;
  acera.position.y = -0.01;
  acera.receiveShadow = true;
  scene.add(acera);

  // Asfalto exterior para que no se vea el vacio detras de las fachadas.
  var asfalto = new THREE.Mesh(
    new THREE.PlaneGeometry(radio_fachadas * 6, radio_fachadas * 6),
    new THREE.MeshPhongMaterial({ color: 0x454545 })
  );
  asfalto.rotation.x = -Math.PI / 2;
  asfalto.position.y = -0.02;
  scene.add(asfalto);

  // Bordillo: un anillo (circulo con agujero) extruido, como las paredes del Tron.
  var perfilBordillo = new THREE.Shape();
  perfilBordillo.absarc(0, 0, radio_plaza + 0.5, 0, Math.PI * 2, false);
  var agujeroBordillo = new THREE.Path();
  agujeroBordillo.absarc(0, 0, radio_plaza, 0, Math.PI * 2, true);
  perfilBordillo.holes.push(agujeroBordillo);

  var geometriaBordillo = new THREE.ExtrudeGeometry(perfilBordillo, {
    depth: 0.3,
    bevelEnabled: false,
    curveSegments: 128
  });
  var bordillo = new THREE.Mesh(
    geometriaBordillo,
    new THREE.MeshPhongMaterial({ color: 0x9a9a9a })
  );
  bordillo.rotation.x = -Math.PI / 2;
  bordillo.castShadow = true;
  bordillo.receiveShadow = true;
  scene.add(bordillo);

  // Fachadas: 30 posiciones separadas por 2 PI / 30, como la pared del Tron.
  var fachadas = new THREE.Group();
  var cantidadTramos = 30;
  var pasoAngular = Math.PI * 2 / cantidadTramos;
  var anchoFachada = 2 * radio_fachadas * Math.tan(pasoAngular / 2);
  var coloresFachada = [0xc8b7a6, 0xb0a08f, 0xd9c7b0, 0xa89f91, 0xcbbfa3, 0x9c8f7f];

  for (var tramo = 0; tramo < cantidadTramos; tramo++) {
    var anguloFachada = tramo * pasoAngular;
    var altoFachada = 10 + (tramo * 7) % 11;     // alturas distintas pero siempre iguales
    var fondoFachada = 9;

    var fachada = new THREE.Mesh(
      new THREE.BoxGeometry(anchoFachada - 0.5, altoFachada, fondoFachada),
      new THREE.MeshLambertMaterial({ color: coloresFachada[tramo % coloresFachada.length] })
    );
    fachada.position.set(
      Math.cos(anguloFachada) * (radio_fachadas + fondoFachada / 2),
      altoFachada / 2,
      Math.sin(anguloFachada) * (radio_fachadas + fondoFachada / 2)
    );
    fachada.lookAt(0, altoFachada / 2, 0);
    fachada.castShadow = true;
    fachada.receiveShadow = true;
    fachadas.add(fachada);
  }
  scene.add(fachadas);

  // Limite invisible de la plaza. Copiado del Tron: conservamos un cilindro
  // completo para las colisiones; el bordillo es la representacion visible.
  var altoLimite = 10;
  var limitePlaza = new THREE.Mesh(
    new THREE.CylinderGeometry(radio_plaza - 0.3, radio_plaza - 0.3, altoLimite, 64, 1, true),
    material_invisible
  );
  limitePlaza.position.y = altoLimite / 2;
  scene.add(limitePlaza);

  // Texturas de los brillos (se usan en quesos y escondites).
  textura_halo = crearTexturaHalo();
  textura_haz = crearTexturaHaz();

  crearFuente();
  zonas_ocupadas.push({ x: 0, z: 0, radio: 7.2 });
  var farolas = crearFarolas();

  // 7- escondites: ocho alcantarillas en un anillo exterior y dos cerca del centro.
  for (var i = 0; i < 8; i++) {
    var anguloAlcantarilla = i * Math.PI / 4;
    crearEscondite(Math.cos(anguloAlcantarilla) * 30, Math.sin(anguloAlcantarilla) * 30);
  }
  crearEscondite(12, 0);
  crearEscondite(-12, 0);

  // 7b- arboles: seis en un anillo intermedio y dos en el eje Z.
  troncos = new THREE.Group();
  scene.add(troncos);
  for (var i = 0; i < 6; i++) {
    var anguloArbol = Math.PI / 6 + i * Math.PI / 3;
    crearArbol(Math.cos(anguloArbol) * 20, Math.sin(anguloArbol) * 20);
  }
  crearArbol(0, 36);
  crearArbol(0, -36);

  // RADAR- anillos fijos en el minimapa para cada escondite (los halos quedan debajo
  // de las copas de los arboles y desde arriba no se verian).
  for (var e = 0; e < escondites.length; e++)
    crearMarcadorEscondite(0x33ff88, escondites[e].pos.x, escondites[e].pos.z);
  for (var a = 0; a < arboles.length; a++)
    crearMarcadorEscondite(0xffb347, arboles[a].pos.x, arboles[a].pos.z);

  // 1b- mobiliario: terraza, papeleras, jardineras y bolardos.
  crearObstaculos();

  bloqueo_grandes = new THREE.Group();
  scene.add(bloqueo_grandes);

  // 7c- plataformas: el escalon de la fuente, cuatro parterres en las diagonales
  // y seis bancos en el anillo exterior, mirando a la fuente. Con rotation.y = -a - PI/2
  // el lado largo queda tangente al anillo y el frente (+Z local) apunta al centro.
  grupo_plataformas = new THREE.Group();
  scene.add(grupo_plataformas);
  crearEscalonFuente();
  for (var q = 0; q < 4; q++) {
    var anguloParterre = Math.PI / 4 + q * Math.PI / 2;
    crearParterre(Math.cos(anguloParterre) * 14, Math.sin(anguloParterre) * 14, -anguloParterre - Math.PI / 2);
  }
  for (var b = 0; b < 6; b++) {
    var anguloBanco = Math.PI / 6 + b * Math.PI / 3;
    crearBanco(Math.cos(anguloBanco) * 38, Math.sin(anguloBanco) * 38, -anguloBanco - Math.PI / 2);
  }
  // Todo lo solido es tambien suelo para la rata: si salta por encima del borde de la
  // fuente, una papelera o una mesa, cae ENCIMA y no dentro (antes solo lo eran las
  // plataformas, y la rata acababa metida en el agua de la fuente).
  objetosSuelo.push(grupo_plataformas, fuente, obstaculos);

  // Lo que ayuda a orientarse tambien se dibuja en el minimapa (capa 1 ademas de la 0).
  mostrarEnMapa(fuente);
  mostrarEnMapa(grupo_plataformas);
  mostrarEnMapa(obstaculos);

  // 4- colisiones de la rata, de las personas, de los gatos y de los perros.
  // La rata y los gatos pasan junto a los troncos (suben); personas y perros los rodean.
  // El mobiliario frena a todo el mundo. Las plataformas frenan a todos menos a los
  // gatos (trepan) y a la rata cuando va por el aire, que pasa por encima del borde.
  objectsToCheck.push(limitePlaza, fuente, farolas, obstaculos, grupo_plataformas);
  // Personas y animales no lanzan rayos contra el cilindro del limite: el borde es un
  // circulo y su distancia se calcula con una formula (ver distanciaAlBorde).
  objectsToCheckIA.push(fuente, farolas, troncos, obstaculos, grupo_plataformas, bloqueo_grandes);
  objectsToCheckGatos.push(fuente, farolas, obstaculos);
  objectsToCheckPerros.push(fuente, farolas, troncos, obstaculos, grupo_plataformas, bloqueo_grandes);

  // Marcador de la rata para la vista de planta: la esfera de 3 facetas con forma
  // de flecha de s3-colisiones.js. Solo se hace visible al dibujar el HUD.
  marcador_rata = crearMarcadorRata();

  // 6- quesos: material compartido por todos los quesos.
  material_queso = new THREE.MeshPhongMaterial({
    color: 0xffd400,
    emissive: 0xaa7700,     // brilla aunque no le de la luz
    shininess: 60
  });

  // RENDIMIENTO- compilar los shaders de todo lo que ya esta en la escena ahora, al
  // cargar, en vez de la primera vez que algo entra en pantalla en mitad de la partida
  // (cada programa nuevo congela el juego decimas de segundo). Para que el queso y su
  // halo tambien queden compilados, creamos uno de prueba y lo quitamos.
  var quesoPrueba = crearQueso(0, 0, -50);
  compilarShaders();
  scene.remove(quesoPrueba.modelo);
  quitarMarcador(quesoPrueba.marcador);
  scene.remove(quesoPrueba.charco);

  // 2- rata
  loadRata();

  // 5- personas: repartidas en ocho angulos, lejos del eje -Z donde empieza la rata.
  for (var i = 0; i < ficheros_personas.length; i++) {
    loadPersona(ficheros_personas[i], Math.PI / 8 + i * Math.PI / 4);
  }

  // 8- perseguidores: cuatro gatos y cuatro perros repartidos por el borde, alternando
  // tipos. El de cada tipo coge su fichero y su tinte por turno.
  var totalPerseguidores = tipos_perseguidor.gato.cantidad + tipos_perseguidor.perro.cantidad;
  for (var k = 0; k < totalPerseguidores; k++) {
    var nombreTipo = (k % 2 === 0) ? 'gato' : 'perro';
    var indice = Math.floor(k / 2);
    loadPerseguidor(nombreTipo, indice, Math.PI / 9 + k * Math.PI * 2 / totalPerseguidores);
  }
}

// RENDIMIENTO- pide a Three.js que compile los programas de todos los materiales de
// la escena (visibles o no) con las luces actuales. Se llama al montar el escenario y
// cada vez que termina de cargarse un modelo.
function compilarShaders()
{
  renderer.compile(scene, camera);
}

// Cilindro de colision invisible para personas y gatos (como el limite del Tron).
// Las mallas con esqueleto tienen miles de triangulos; lanzar rayos contra un
// cilindro de 8 lados es mucho mas barato.
function crearColisionador(radio, alto)
{
  var colisionador = new THREE.Mesh(
    new THREE.CylinderGeometry(radio, radio, alto, 8, 1, true),
    material_invisible
  );
  colisionador.position.y = alto / 2;
  scene.add(colisionador);
  return colisionador;
}

// Fuente central hecha con cilindros: pilon, pedestal, taza y agua.
function crearFuente()
{
  fuente = new THREE.Group();

  var materialPiedra = new THREE.MeshPhongMaterial({ color: 0xa39e93 });
  // Agua: brillo especular concentrado (shininess alto) y algo transparente.
  var materialAgua = new THREE.MeshPhongMaterial({
    color: 0x3a7ca5,
    specular: 0xffffff,
    shininess: 120,
    transparent: true,
    opacity: 0.85
  });

  var radioPilon = 4;
  var pilon = new THREE.Mesh(
    new THREE.CylinderGeometry(radioPilon, radioPilon + 0.2, 0.7, 48),
    materialPiedra
  );
  pilon.position.y = 0.35;
  fuente.add(pilon);

  agua_fuente = new THREE.Mesh(
    new THREE.CircleGeometry(radioPilon - 0.35, 48),
    materialAgua
  );
  agua_fuente.rotation.x = -Math.PI / 2;
  agua_fuente.position.y = 0.71;
  fuente.add(agua_fuente);

  var pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.6, 2, 24),
    materialPiedra
  );
  pedestal.position.y = 1.7;
  fuente.add(pedestal);

  var taza = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 0.7, 0.5, 48),
    materialPiedra
  );
  taza.position.y = 2.95;
  fuente.add(taza);

  var aguaTaza = new THREE.Mesh(
    new THREE.CircleGeometry(1.45, 48),
    materialAgua
  );
  aguaTaza.rotation.x = -Math.PI / 2;
  aguaTaza.position.y = 3.21;
  fuente.add(aguaTaza);

  fuente.traverse(function(objeto) {
    if (objeto.isMesh) {
      objeto.castShadow = true;
      objeto.receiveShadow = true;
    }
  });
  // La fuente descansa sobre el escalon circular (plataforma de 0.5).
  fuente.position.y = 0.5;
  scene.add(fuente);
}

// 7c- plataformas
// Escalon de piedra alrededor de la fuente: la rata y los gatos suben de un salto,
// personas y perros lo rodean.
function crearEscalonFuente()
{
  var escalon = new THREE.Mesh(
    new THREE.CylinderGeometry(6.6, 6.8, 0.5, 64),
    new THREE.MeshPhongMaterial({ color: 0xb5b0a6, specular: 0x222222, shininess: 10 })
  );
  escalon.position.y = 0.25;
  escalon.castShadow = true;
  escalon.receiveShadow = true;
  grupo_plataformas.add(escalon);
  plataformas.push({ tipo: 'anillo', x: 0, z: 0, radioInterior: 5.0, radioExterior: 6.2, altura: 0.5 });
}

// Parterre elevado: caja de piedra con cesped encima y un seto en cada extremo.
function crearParterre(x, z, anguloY)
{
  var parterre = new THREE.Group();
  var alto = 0.55;

  var piedra = new THREE.Mesh(
    new THREE.BoxGeometry(7, alto, 3),
    new THREE.MeshPhongMaterial({ color: 0xa8a39a, specular: 0x222222, shininess: 10 })
  );
  piedra.position.y = alto / 2;
  parterre.add(piedra);

  var cesped = new THREE.Mesh(
    new THREE.BoxGeometry(6.8, 0.04, 2.8),
    new THREE.MeshLambertMaterial({ color: 0x5aa84f })
  );
  cesped.position.y = alto + 0.02;
  parterre.add(cesped);

  var materialSeto = new THREE.MeshLambertMaterial({ color: 0x3f8a3a });
  for (var lado = -1; lado <= 1; lado += 2) {
    var seto = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), materialSeto);
    seto.position.set(lado * 2.9, alto + 0.45, 0);
    parterre.add(seto);
  }

  parterre.traverse(function(objeto) {
    if (objeto.isMesh) {
      objeto.castShadow = true;
      objeto.receiveShadow = true;
    }
  });
  parterre.position.set(x, 0, z);
  parterre.rotation.y = anguloY;
  grupo_plataformas.add(parterre);
  plataformas.push({ tipo: 'caja', x: x, z: z, ancho: 4.4, fondo: 2.2, angulo: anguloY, altura: alto });
  zonas_ocupadas.push({ x: x, z: z, radio: 4 });
}

// Banco de madera: la rata salta al asiento; por debajo, entre las patas, pasa andando.
function crearBanco(x, z, anguloY)
{
  var banco = new THREE.Group();
  var materialMadera = new THREE.MeshPhongMaterial({ color: 0x7a4a24 });

  var asiento = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.6), materialMadera);
  asiento.position.y = 0.46;
  banco.add(asiento);

  var respaldo = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.45, 0.06), materialMadera);
  respaldo.position.set(0, 0.75, -0.27);
  banco.add(respaldo);

  for (var lado = -1; lado <= 1; lado += 2) {
    var pata = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 0.5), materialMadera);
    pata.position.set(lado * 1.0, 0.21, 0);
    banco.add(pata);
  }

  banco.traverse(function(objeto) {
    if (objeto.isMesh) {
      objeto.castShadow = true;
      objeto.receiveShadow = true;
    }
  });
  banco.position.set(x, 0, z);
  banco.rotation.y = anguloY;
  grupo_plataformas.add(banco);

  // Caja invisible del tamano del banco, solo para personas y perros.
  var caja = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 0.6), material_invisible);
  caja.position.set(x, 0.45, z);
  caja.rotation.y = anguloY;
  bloqueo_grandes.add(caja);
  plataformas.push({ tipo: 'caja', x: x, z: z, ancho: 1.6, fondo: 0.2, angulo: anguloY, altura: 0.5 });
  zonas_ocupadas.push({ x: x, z: z, radio: 1.5 });
}

// Punto al azar encima de una plataforma, para los quesos. Devuelve {x, z, altura}.
function puntoSobrePlataforma(plataforma)
{
  if (plataforma.tipo === 'anillo') {
    var a = Math.random() * Math.PI * 2;
    var r = plataforma.radioInterior + Math.random() * (plataforma.radioExterior - plataforma.radioInterior);
    return { x: Math.cos(a) * r, z: Math.sin(a) * r, altura: plataforma.altura };
  }
  // Caja girada: punto en coordenadas locales y giro Ry (tema 3): x' = x cos a + z sin a, z' = -x sin a + z cos a
  var lx = (Math.random() - 0.5) * plataforma.ancho;
  var lz = (Math.random() - 0.5) * plataforma.fondo;
  var cosA = Math.cos(plataforma.angulo), sinA = Math.sin(plataforma.angulo);
  return {
    x: plataforma.x + lx * cosA + lz * sinA,
    z: plataforma.z - lx * sinA + lz * cosA,
    altura: plataforma.altura
  };
}

// Dieciseis farolas sobre una circunferencia, desfasadas respecto a las fachadas.
function crearFarolas()
{
  var farolas = new THREE.Group();
  var cantidad = 16;
  var radioFarolas = radio_plaza - 3;
  var materialPoste = new THREE.MeshPhongMaterial({ color: 0x2b2b2b });
  var materialGlobo = new THREE.MeshPhongMaterial({ color: 0xfff4d6, emissive: 0x6b5a30 });

  for (var i = 0; i < cantidad; i++) {
    var anguloFarola = Math.PI / cantidad + i * Math.PI * 2 / cantidad;
    var farola = new THREE.Group();

    var poste = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 4, 12), materialPoste);
    poste.position.y = 2;
    poste.castShadow = true;
    farola.add(poste);

    var globo = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), materialGlobo);
    globo.position.y = 4.2;
    farola.add(globo);

    farola.position.set(
      Math.cos(anguloFarola) * radioFarolas,
      0,
      Math.sin(anguloFarola) * radioFarolas
    );
    farolas.add(farola);
    zonas_ocupadas.push({ x: farola.position.x, z: farola.position.z, radio: 1 });
  }
  scene.add(farolas);
  return farolas;
}

// 1b- mobiliario con primitivas. Todo cuelga del grupo 'obstaculos', que esta en
// las listas de colision de la rata, las personas y los animales.
function crearObstaculos()
{
  obstaculos = new THREE.Group();
  scene.add(obstaculos);

  // Terraza de un bar: cinco mesas redondas con dos sillas cada una, en un sector
  // entre las alcantarillas (radio 30) y las papeleras (radio 41), de 195 a 255 grados.
  for (var i = 0; i < 5; i++) {
    var anguloMesa = THREE.MathUtils.degToRad(195 + i * 15);
    var xMesa = Math.cos(anguloMesa) * 34;
    var zMesa = Math.sin(anguloMesa) * 34;
    crearMesa(xMesa, zMesa);
    // Las sillas, una a cada lado de la mesa, mirando hacia ella.
    var lateral = anguloMesa + Math.PI / 2;
    crearSilla(xMesa + Math.cos(lateral) * 1.2, zMesa + Math.sin(lateral) * 1.2, lateral + Math.PI);
    crearSilla(xMesa - Math.cos(lateral) * 1.2, zMesa - Math.sin(lateral) * 1.2, lateral);
  }

  // Papeleras: junto a una de cada dos farolas, un poco hacia el centro.
  for (var j = 0; j < 16; j += 2) {
    var anguloPapelera = Math.PI / 16 + j * Math.PI * 2 / 16;
    crearPapelera(Math.cos(anguloPapelera) * (radio_plaza - 4.2), Math.sin(anguloPapelera) * (radio_plaza - 4.2));
  }

  // Jardineras: seis en el anillo de los arboles, entre arbol y arbol.
  for (var k = 0; k < 6; k++) {
    var anguloJardinera = k * Math.PI / 3;
    crearJardinera(Math.cos(anguloJardinera) * 24, Math.sin(anguloJardinera) * 24, anguloJardinera);
  }

  // Bolardos: un anillo de doce alrededor de la fuente, con hueco para pasar entre ellos.
  // A radio 9.5 dejan un pasillo de 2.7 con el escalon (antes, a 7.5, el pasillo era tan
  // estrecho que un perro podia quedar encajado sin poder girar).
  for (var m = 0; m < 12; m++) {
    var anguloBolardo = m * Math.PI / 6;
    crearBolardo(Math.cos(anguloBolardo) * 9.5, Math.sin(anguloBolardo) * 9.5);
  }
}

// Caja invisible para que los rayos choquen con sillas y mesas aunque pasen entre
// las patas (misma idea que el limite invisible del Tron).
function crearCajaInvisible(x, z, ancho, alto, fondo, anguloY)
{
  var caja = new THREE.Mesh(new THREE.BoxGeometry(ancho, alto, fondo), material_invisible);
  caja.position.set(x, alto / 2, z);
  caja.rotation.y = anguloY;
  obstaculos.add(caja);
}

function crearSilla(x, z, anguloY)
{
  var silla = new THREE.Group();
  var materialSilla = new THREE.MeshPhongMaterial({ color: 0x3b3b3b, specular: 0x666666, shininess: 30 });

  var asiento = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.5), materialSilla);
  asiento.position.y = 0.45;
  silla.add(asiento);

  var respaldo = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.05), materialSilla);
  respaldo.position.set(0, 0.7, -0.22);
  silla.add(respaldo);

  for (var i = -1; i <= 1; i += 2) {
    for (var j = -1; j <= 1; j += 2) {
      var pata = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 6), materialSilla);
      pata.position.set(i * 0.22, 0.225, j * 0.22);
      silla.add(pata);
    }
  }

  silla.traverse(function(objeto) { if (objeto.isMesh) objeto.castShadow = true; });
  silla.position.set(x, 0, z);
  silla.rotation.y = anguloY;
  obstaculos.add(silla);
  crearCajaInvisible(x, z, 0.55, 0.48, 0.55, anguloY);   // hasta el asiento
  zonas_ocupadas.push({ x: x, z: z, radio: 0.8 });
}

function crearMesa(x, z)
{
  var mesa = new THREE.Group();
  var materialMesa = new THREE.MeshPhongMaterial({ color: 0x5a5a5a, specular: 0x888888, shininess: 40 });

  var tablero = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.04, 24), materialMesa);
  tablero.position.y = 0.72;
  mesa.add(tablero);

  var pie = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 8), materialMesa);
  pie.position.y = 0.36;
  mesa.add(pie);

  var base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.04, 16), materialMesa);
  base.position.y = 0.02;
  mesa.add(base);

  mesa.traverse(function(objeto) { if (objeto.isMesh) objeto.castShadow = true; });
  mesa.position.set(x, 0, z);
  obstaculos.add(mesa);
  crearCajaInvisible(x, z, 1.2, 0.74, 1.2, 0);   // hasta el tablero
  zonas_ocupadas.push({ x: x, z: z, radio: 1.2 });
}

function crearPapelera(x, z)
{
  var materialPapelera = new THREE.MeshPhongMaterial({ color: 0x2f5d3a, specular: 0x444444, shininess: 20 });
  var cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.26, 0.9, 16), materialPapelera);
  cuerpo.position.set(x, 0.45, z);
  cuerpo.castShadow = true;
  obstaculos.add(cuerpo);

  var aro = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 8, 24), new THREE.MeshPhongMaterial({ color: 0x222222 }));
  aro.rotation.x = Math.PI / 2;
  aro.position.set(x, 0.9, z);
  obstaculos.add(aro);
  zonas_ocupadas.push({ x: x, z: z, radio: 0.8 });
}

function crearJardinera(x, z, anguloY)
{
  var jardinera = new THREE.Group();
  var caja = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 0.8), new THREE.MeshPhongMaterial({ color: 0x8a6a4a }));
  caja.position.y = 0.3;
  jardinera.add(caja);

  var materialArbusto = new THREE.MeshLambertMaterial({ color: 0x4f9a46 });
  for (var i = -1; i <= 1; i++) {
    var arbusto = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), materialArbusto);
    arbusto.position.set(i * 0.75, 0.85, 0);
    jardinera.add(arbusto);
  }

  jardinera.traverse(function(objeto) { if (objeto.isMesh) objeto.castShadow = true; });
  jardinera.position.set(x, 0, z);
  jardinera.rotation.y = -anguloY - Math.PI / 2;   // tangente al anillo (eje X local perpendicular al radio)
  obstaculos.add(jardinera);
  zonas_ocupadas.push({ x: x, z: z, radio: 1.8 });
}

function crearBolardo(x, z)
{
  var bolardo = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.14, 0.9, 10),
    new THREE.MeshPhongMaterial({ color: 0x333333, specular: 0x777777, shininess: 50 })
  );
  bolardo.position.set(x, 0.45, z);
  bolardo.castShadow = true;
  obstaculos.add(bolardo);
  zonas_ocupadas.push({ x: x, z: z, radio: 0.6 });
}

// 7- escondites
// Una alcantarilla: agujero negro en el suelo, rejilla de barras, aro metalico y
// un anillo brillante alrededor. La rata baja por la rejilla; los gatos no caben.
function crearEscondite(x, z)
{
  var alcantarilla = new THREE.Group();
  var materialMetal = new THREE.MeshPhongMaterial({ color: 0x4a4a4a, specular: 0x888888, shininess: 40 });

  // Agujero: un circulo negro que no refleja luz.
  var agujero = new THREE.Mesh(
    new THREE.CircleGeometry(0.9, 24),
    new THREE.MeshBasicMaterial({ color: 0x050505 })
  );
  agujero.rotation.x = -Math.PI / 2;
  agujero.position.y = 0.01;
  alcantarilla.add(agujero);

  // Aro: un toro tumbado.
  var aro = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.08, 8, 32), materialMetal);
  aro.rotation.x = Math.PI / 2;
  aro.position.y = 0.04;
  alcantarilla.add(aro);

  // Rejilla: cinco barras cuya longitud es la cuerda del circulo en esa posicion.
  for (var bx = -0.6; bx <= 0.61; bx += 0.3) {
    var cuerda = 2 * Math.sqrt(0.81 - bx * bx) - 0.1;
    var barra = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, cuerda), materialMetal);
    barra.position.set(bx, 0.04, 0);
    alcantarilla.add(barra);
  }

  // Anillo brillante: material basico (no le afecta la luz) con mezcla aditiva,
  // igual que los halos del Tron, y transparente para que se vea el suelo.
  var anillo = new THREE.Mesh(
    new THREE.RingGeometry(radio_escondite + 0.05, radio_escondite + 0.4, 48),
    new THREE.MeshBasicMaterial({
      color: 0x33ff88,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  anillo.rotation.x = -Math.PI / 2;
  anillo.position.y = 0.02;
  alcantarilla.add(anillo);

  // Brillo como el de los quesos: halo en el suelo y columna de luz verde.
  var halo = crearHaloSuelo(0x33ff88, 3.2);
  alcantarilla.add(halo);
  var haz = crearHaz(0x33ff88, 0.8, 4);
  alcantarilla.add(haz);

  alcantarilla.position.set(x, 0, z);
  scene.add(alcantarilla);

  escondites.push({ modelo: alcantarilla, pos: new THREE.Vector3(x, 0, z), anillo: anillo, halo: halo, haz: haz });
  zonas_ocupadas.push({ x: x, z: z, radio: 2.5 });
}

// 7b- arboles
// Un arbol: tronco (cilindro) y copa (tres esferas), con un anillo naranja alrededor.
// La rata y el gato trepan por el tronco; el perro se queda abajo y pierde el rastro.
function crearArbol(x, z)
{
  var arbol = new THREE.Group();
  var materialTronco = new THREE.MeshPhongMaterial({ color: 0x6b4a2b });
  var materialCopa = new THREE.MeshLambertMaterial({ color: 0x3f8a3a });

  var tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 2.6, 12), materialTronco);
  tronco.position.y = 1.3;
  tronco.castShadow = true;
  // El tronco va en su propio grupo porque es obstaculo para personas y perros.
  tronco.position.x = x;
  tronco.position.z = z;
  troncos.add(tronco);

  var copas = [[0, 3.6, 0, 1.6], [0.9, 3.0, 0.5, 1.1], [-0.8, 3.1, -0.6, 1.0]];
  for (var i = 0; i < copas.length; i++) {
    var copa = new THREE.Mesh(new THREE.SphereGeometry(copas[i][3], 16, 12), materialCopa);
    copa.position.set(copas[i][0], copas[i][1], copas[i][2]);
    copa.castShadow = true;
    arbol.add(copa);
  }

  // Anillo brillante naranja, para distinguirlo del verde de las alcantarillas.
  var anillo = new THREE.Mesh(
    new THREE.RingGeometry(radio_arbol + 0.05, radio_arbol + 0.4, 48),
    new THREE.MeshBasicMaterial({
      color: 0xffb347,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  anillo.rotation.x = -Math.PI / 2;
  anillo.position.y = 0.02;
  arbol.add(anillo);

  // Brillo naranja: halo en la base del tronco y columna de luz hasta la copa.
  var halo = crearHaloSuelo(0xffb347, 3.2);
  arbol.add(halo);
  var haz = crearHaz(0xffb347, 0.7, 2.4);
  arbol.add(haz);

  arbol.position.set(x, 0, z);
  scene.add(arbol);

  arboles.push({ modelo: arbol, pos: new THREE.Vector3(x, 0, z), anillo: anillo, halo: halo, haz: haz });
  zonas_ocupadas.push({ x: x, z: z, radio: 2.5 });
}

// 6- quesos
// Textura con un degradado radial para el halo. Es la misma idea que el circulo
// con gradiente que dibujamos con gl_PointCoord en la sesion 1, pero en un canvas.
function crearTexturaHalo()
{
  var canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  var ctx = canvas.getContext('2d');
  var degradado = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  degradado.addColorStop(0.0, 'rgba(255, 255, 255, 1)');
  degradado.addColorStop(0.35, 'rgba(255, 255, 255, 0.45)');
  degradado.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = degradado;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

// Degradado vertical para las columnas de luz: opaco abajo y transparente arriba.
function crearTexturaHaz()
{
  var canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 128;
  var ctx = canvas.getContext('2d');
  var degradado = ctx.createLinearGradient(0, 0, 0, 128);
  degradado.addColorStop(0.0, 'rgba(255, 255, 255, 0)');
  degradado.addColorStop(1.0, 'rgba(255, 255, 255, 0.8)');
  ctx.fillStyle = degradado;
  ctx.fillRect(0, 0, 16, 128);
  return new THREE.CanvasTexture(canvas);
}

// Halo en el suelo: el mismo sprite aditivo que llevan los quesos, mas grande.
function crearHaloSuelo(color, escala)
{
  var halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: textura_halo,
    color: color,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }));
  halo.scale.set(escala, escala, 1);
  halo.position.y = 0.3;
  return halo;
}

// Columna de luz: un cilindro abierto, aditivo, con el degradado que se apaga hacia arriba.
// Sirve para localizar los escondites desde lejos en una plaza tan grande.
function crearHaz(color, radio, alto)
{
  var haz = new THREE.Mesh(
    new THREE.CylinderGeometry(radio * 0.7, radio, alto, 16, 1, true),
    new THREE.MeshBasicMaterial({
      map: textura_haz,
      color: color,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  haz.position.y = alto / 2;
  return haz;
}

// RADAR- piezas de los marcadores de la vista de planta.
// Flecha plana: Shape en el plano XY con la punta en +Y y una muesca detras. Al girarla
// 90 grados sobre X la punta queda hacia +Z, que es "delante" para la rata y los demas.
function geometriaFlecha(radio)
{
  var forma = new THREE.Shape();
  forma.moveTo(0, radio);                       // punta
  forma.lineTo(radio * 0.75, -radio * 0.7);
  forma.lineTo(0, -radio * 0.3);                // muesca
  forma.lineTo(-radio * 0.75, -radio * 0.7);
  forma.closePath();
  var geometria = new THREE.ShapeGeometry(forma);
  geometria.rotateX(Math.PI / 2);
  return geometria;
}

function geometriaDisco(radio)
{
  var geometria = new THREE.CircleGeometry(radio, 20);
  geometria.rotateX(-Math.PI / 2);
  return geometria;
}

// Material de marcador: sin prueba de profundidad y dibujado al final (renderOrder alto),
// asi se ve siempre por encima de copas de arboles, farolas o halos.
function mallaMarcador(geometria, color, orden)
{
  var malla = new THREE.Mesh(geometria, new THREE.MeshBasicMaterial({
    color: color,
    side: THREE.DoubleSide,
    transparent: true,
    depthTest: false,
    depthWrite: false
  }));
  malla.renderOrder = orden;
  return malla;
}

// Las capas no se heredan: hay que activarlas en cada malla del grupo.
function mostrarEnMapa(objeto)
{
  objeto.traverse(function(hijo) { hijo.layers.enable(1); });
}

function anadirMarcador(marcador)
{
  marcador.position.y = 3;
  // Los marcadores solo estan en la capa 1: la camara principal no los ve nunca.
  marcador.traverse(function(hijo) { hijo.layers.set(1); });
  scene.add(marcador);
  marcadores.push(marcador);
  return marcador;
}

// Flecha de color con borde negro para lo que se mueve (rata, personas, animales).
function crearMarcador(color, radio)
{
  var marcador = new THREE.Group();
  marcador.add(mallaMarcador(geometriaFlecha(radio * 1.4), 0x000000, 20));
  marcador.add(mallaMarcador(geometriaFlecha(radio), color, 21));
  return anadirMarcador(marcador);
}

// La rata ademas lleva un abanico claro delante: hacia donde va y lo que ve la camara.
function crearMarcadorRata()
{
  var marcador = crearMarcador(color_marcador.rata, 2.1);
  // Sector circular de 60 grados centrado en +Y antes de girarlo (+Z despues).
  var abanico = new THREE.CircleGeometry(7, 16, Math.PI / 3, Math.PI / 3);
  abanico.rotateX(Math.PI / 2);
  var malla = mallaMarcador(abanico, 0xffffff, 15);
  malla.material.opacity = 0.18;
  malla.layers.set(1);
  marcador.add(malla);
  marcador.userData.abanico = malla;
  return marcador;
}

// Queso: disco amarillo con borde negro. Si esta fuera del radar se cambia por una
// flecha en el borde que apunta hacia el.
function crearMarcadorQueso()
{
  var marcador = new THREE.Group();
  var borde = mallaMarcador(geometriaDisco(1.7), 0x000000, 22);
  var disco = mallaMarcador(geometriaDisco(1.25), color_marcador.queso, 23);
  var flecha = new THREE.Group();
  flecha.add(mallaMarcador(geometriaFlecha(1.8), 0x000000, 22));
  flecha.add(mallaMarcador(geometriaFlecha(1.3), color_marcador.queso, 23));
  flecha.visible = false;
  marcador.add(borde);
  marcador.add(disco);
  marcador.add(flecha);
  marcador.userData = { borde: borde, disco: disco, flecha: flecha };
  return anadirMarcador(marcador);
}

// Escondite: anillo verde (alcantarilla) o naranja (arbol), fijo en su sitio.
function crearMarcadorEscondite(color, x, z)
{
  var anillo = new THREE.RingGeometry(1.0, 1.6, 24);
  anillo.rotateX(-Math.PI / 2);
  var marcador = new THREE.Group();
  marcador.add(mallaMarcador(anillo, color, 18));
  anadirMarcador(marcador);
  marcador.position.set(x, 3, z);
  return marcador;
}

function quitarMarcador(marcador)
{
  scene.remove(marcador);
  var indice = marcadores.indexOf(marcador);
  if (indice !== -1)
    marcadores.splice(indice, 1);
}

// Coloca cada marcador sobre su dueno, apuntando hacia donde mira. El tamano depende
// de cuanto abarca el mapa, para que se vean igual en el radar y en el mapa completo.
function actualizarMarcadores(radar)
{
  var escala = alcance_mapa_actual / alcance_radar;
  for (var m = 0; m < marcadores.length; m++)
    marcadores[m].scale.setScalar(escala);

  marcador_rata.position.set(pos_rata.x, 3, pos_rata.z);
  marcador_rata.rotation.y = angulo;            // la punta de la flecha va hacia +Z
  marcador_rata.userData.abanico.visible = radar;

  for (var i = 0; i < personas.length; i++) {
    personas[i].marcador.position.set(personas[i].pos.x, 3, personas[i].pos.z);
    personas[i].marcador.rotation.y = personas[i].angulo;
  }
  for (var j = 0; j < perseguidores.length; j++) {
    perseguidores[j].marcador.position.set(perseguidores[j].pos.x, 3, perseguidores[j].pos.z);
    perseguidores[j].marcador.rotation.y = perseguidores[j].angulo;
  }

  // Quesos: en el radar, los que quedan fuera se dibujan como flecha en el borde,
  // en la direccion del queso, para saber hacia donde ir a buscarlo.
  var limite = alcance_radar * 0.44;
  for (var k = 0; k < quesos.length; k++) {
    var marcador = quesos[k].marcador;
    var dx = quesos[k].modelo.position.x - pos_rata.x;
    var dz = quesos[k].modelo.position.z - pos_rata.z;
    var distancia = Math.sqrt(dx * dx + dz * dz);
    var fuera = radar && distancia > limite;

    if (fuera)
      marcador.position.set(pos_rata.x + dx / distancia * limite, 3, pos_rata.z + dz / distancia * limite);
    else
      marcador.position.set(quesos[k].modelo.position.x, 3, quesos[k].modelo.position.z);

    marcador.userData.borde.visible = !fuera;
    marcador.userData.disco.visible = !fuera;
    marcador.userData.flecha.visible = fuera;
    marcador.userData.flecha.rotation.y = Math.atan2(dx, dz);
  }
}

// Distancia de la rata al queso mas cercano (para el texto del radar).
function distanciaQuesoMasCercano()
{
  var minima = Infinity;
  for (var i = 0; i < quesos.length; i++) {
    minima = Math.min(minima, distanciaXZ(quesos[i].modelo.position, pos_rata.x, pos_rata.z));
  }
  return minima;
}

// Un queso es una cuna (prisma triangular: cilindro de 3 lados) con un halo
// (sprite aditivo que siempre mira a la camara) y un charco de luz en el suelo.
function crearQueso(x, z, alturaBase)
{
  var queso = new THREE.Group();

  var cuna = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.18, 3), material_queso);
  cuna.position.y = 0.09;
  cuna.castShadow = true;
  queso.add(cuna);

  var halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: textura_halo,
    color: 0xffdd33,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }));
  halo.scale.set(1.8, 1.8, 1);
  halo.position.y = 0.2;
  halo.visible = !modo_ligero;
  queso.add(halo);

  queso.position.set(x, alturaBase + 0.25, z);
  scene.add(queso);

  // Charco de luz: un plano tumbado en el suelo con la misma textura de degradado que
  // el halo y mezcla aditiva. Da el efecto de una luz puntual sin calcular ninguna luz.
  var charco = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 2.6),
    new THREE.MeshBasicMaterial({
      map: textura_halo,
      color: 0xffcc33,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  charco.rotation.x = -Math.PI / 2;
  charco.position.set(x, alturaBase + 0.03, z);
  charco.visible = !modo_ligero;
  scene.add(charco);

  return {
    modelo: queso,
    halo: halo,
    charco: charco,
    altura_base: alturaBase,
    fase: Math.random() * Math.PI * 2,
    marcador: crearMarcadorQueso()
  };
}

// Posicion aleatoria para un queso. Uno de cada tres aparece encima de una plataforma
// (asi el salto sirve para algo); el resto en el suelo, lejos de todo lo que ocupa sitio.
function posicionAleatoriaQueso()
{
  if (plataformas.length > 0 && Math.random() < 0.35) {
    var plataforma = plataformas[Math.floor(Math.random() * plataformas.length)];
    var punto = puntoSobrePlataforma(plataforma);
    return new THREE.Vector3(punto.x, punto.altura, punto.z);
  }

  var radioMinimo = 9, radioMaximo = radio_plaza - 4;
  for (var intento = 0; intento < 30; intento++) {
    var anguloQueso = Math.random() * Math.PI * 2;
    // Reparto uniforme en la corona: con sqrt no se amontonan en el centro.
    var radioQueso = Math.sqrt(
      Math.random() * (radioMaximo * radioMaximo - radioMinimo * radioMinimo) +
      radioMinimo * radioMinimo
    );
    var x = Math.cos(anguloQueso) * radioQueso;
    var z = Math.sin(anguloQueso) * radioQueso;

    // No vale encima de nada: fuente, farolas, alcantarillas, arboles ni mobiliario.
    var valido = true;
    for (var i = 0; i < zonas_ocupadas.length; i++) {
      var zona = zonas_ocupadas[i];
      if (distanciaXZ(zona, x, z) < zona.radio + 0.6)
        valido = false;
    }
    if (valido)
      return new THREE.Vector3(x, 0, z);
  }
  return new THREE.Vector3(8, 0, 8);
}

function actualizarQuesos(delta)
{
  // Van apareciendo cada pocos segundos hasta un maximo.
  tiempo_hasta_queso -= delta;
  if (tiempo_hasta_queso <= 0 && quesos.length < max_quesos) {
    var posicion = posicionAleatoriaQueso();
    quesos.push(crearQueso(posicion.x, posicion.z, posicion.y));
    tiempo_hasta_queso = segundos_entre_quesos;
  }

  for (var i = quesos.length - 1; i >= 0; i--) {
    var queso = quesos[i];

    // Giran y suben y bajan un poco para que se vea que son recogibles.
    queso.fase += delta * 3;
    queso.modelo.rotation.y += delta;
    queso.modelo.position.y = queso.altura_base + 0.25 + 0.08 * Math.sin(queso.fase);
    // El halo late: cambia de tamano con la misma fase.
    var latido = 1.6 + 0.4 * Math.sin(queso.fase * 2);
    queso.halo.scale.set(latido, latido, 1);
    var latidoCharco = 2.4 + 0.5 * Math.sin(queso.fase * 2);
    queso.charco.scale.set(latidoCharco / 2.6, latidoCharco / 2.6, 1);

    // Recogida: distancia en el plano XZ entre la rata y el queso y misma altura
    // (un queso encima de un parterre no se coge desde abajo). No vale desde un escondite.
    if (!rataOculta() &&
        distanciaXZ(queso.modelo.position, pos_rata.x, pos_rata.z) < distancia_recoger_queso &&
        Math.abs(pos_rata.y - queso.altura_base) < 0.5) {
      scene.remove(queso.modelo);
      scene.remove(queso.charco);
      quitarMarcador(queso.marcador);
      quesos.splice(i, 1);
      quesos_recogidos++;
      // 10- cada queso alarga el tiempo limite.
      tiempo_restante += tiempo_por_queso;
      aviso_bonus = 1.2;
    }
  }
}

// Distancia entre un punto y unas coordenadas (x, z) ignorando la altura.
function distanciaXZ(punto, x, z)
{
  var dx = punto.x - x;
  var dz = punto.z - z;
  return Math.sqrt(dx * dx + dz * dz);
}

// 8- perseguidores (gatos y perros)
// Animal de reserva hecho con primitivas, por si falta el modelo GLTF. Mira hacia +Z.
function crearPerseguidorPrimitivas(color)
{
  var modelo = new THREE.Group();
  var materialPelo = new THREE.MeshPhongMaterial({ color: color });
  var materialOjo = new THREE.MeshPhongMaterial({ color: 0x66ff66, emissive: 0x33aa33 });

  var cuerpo = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), materialPelo);
  cuerpo.scale.set(1, 0.85, 1.7);
  cuerpo.position.y = 0.38;
  modelo.add(cuerpo);

  var cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), materialPelo);
  cabeza.position.set(0, 0.55, 0.55);
  modelo.add(cabeza);

  for (var lado = -1; lado <= 1; lado += 2) {
    var oreja = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 4), materialPelo);
    oreja.position.set(lado * 0.11, 0.74, 0.5);
    modelo.add(oreja);

    var ojo = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), materialOjo);
    ojo.position.set(lado * 0.08, 0.58, 0.72);
    modelo.add(ojo);
  }

  var cola = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.7, 8), materialPelo);
  cola.position.set(0, 0.6, -0.75);
  cola.rotation.x = -0.6;
  modelo.add(cola);

  var patas = [];
  var posicionesPatas = [[-0.14, 0.3], [0.14, 0.3], [-0.14, -0.3], [0.14, -0.3]];
  for (var i = 0; i < 4; i++) {
    var pivote = new THREE.Group();
    pivote.position.set(posicionesPatas[i][0], 0.33, posicionesPatas[i][1]);
    var pata = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.35, 8), materialPelo);
    pata.position.y = -0.17;
    pivote.add(pata);
    modelo.add(pivote);
    patas.push(pivote);
  }

  modelo.traverse(function(objeto) {
    if (objeto.isMesh) objeto.castShadow = true;
  });
  modelo.scale.set(1.3, 1.3, 1.3);
  modelo.userData.patas = patas;
  return modelo;
}

// Tinta un modelo clonando sus materiales, como colorearMotoIA() del Tron: asi dos
// animales del mismo fichero no comparten material y cada uno tiene su color.
function tenirModelo(modelo, color)
{
  var tinte = new THREE.Color(color);
  modelo.traverse(function(objeto) {
    if (!objeto.isMesh)
      return;

    if (Array.isArray(objeto.material))
      objeto.material = objeto.material.map(function(material) { return material.clone(); });
    else
      objeto.material = objeto.material.clone();

    var materiales = Array.isArray(objeto.material) ? objeto.material : [objeto.material];
    materiales.forEach(function(material) {
      if (material.color)
        material.color.multiply(tinte);
    });
  });
}

// Busca un clip por su nombre. Los nombres vienen como "AnimalArmature|Walk" o solo
// "Walk", asi que comparamos el ultimo trozo despues de la barra.
function buscarClip(animaciones, nombre)
{
  for (var i = 0; i < animaciones.length; i++) {
    var partes = animaciones[i].name.split('|');
    if (partes[partes.length - 1] === nombre)
      return animaciones[i];
  }
  return null;
}

// Crea los datos del perseguidor y lo coloca en la escena.
function nuevoPerseguidor(tipo, modelo, anguloInicial, mixerAgente, acciones)
{
  var agente = {
    tipo: tipo,
    modelo: modelo,
    patas: modelo.userData.patas || null,
    mixer: mixerAgente,
    acciones: acciones,
    accion_actual: null,
    pos: new THREE.Vector3(
      Math.cos(anguloInicial) * (radio_plaza - 3),
      0,
      Math.sin(anguloInicial) * (radio_plaza - 3)
    ),
    angulo: Math.atan2(-Math.cos(anguloInicial), -Math.sin(anguloInicial)),  // mirando al centro
    angulo_inicial: Math.atan2(-Math.cos(anguloInicial), -Math.sin(anguloInicial)),
    velocity: new THREE.Vector3(0, 0, 1),
    estado: 'paseando',
    direccion_giro: 1,
    frames_giro: 0,
    frames_hasta_cambio: 60,
    fase: 0,
    colisionador: crearColisionador(0.5, 1),
    marcador: crearMarcador(color_marcador[tipo.nombre], 1.7),
    // Los gatos pasan junto a los troncos; los perros los rodean.
    lista_obstaculos: tipo.sube_arboles ? objectsToCheckGatos : objectsToCheckPerros,
    desfase: 0   // todos los modelos miran a +Z; aqui iria un PI/2 si alguno viniera girado
  };
  agente.pos_inicial = agente.pos.clone();
  modelo.position.copy(agente.pos);
  scene.add(modelo);
  compilarShaders();
  perseguidores.push(agente);
  cambiarAnimacionAgente(agente, acciones.andar);
  return agente;
}

// Carga el modelo GLTF del tipo pedido; si falla (por ejemplo, no esta descargado),
// usa el de primitivas. Misma estructura que loadLightCycle() del Tron.
function loadPerseguidor(nombreTipo, indice, anguloInicial)
{
  var tipo = tipos_perseguidor[nombreTipo];
  var fichero = tipo.ficheros[indice % tipo.ficheros.length];
  var tinte = tipo.tintes[indice % tipo.tintes.length];
  var loader = new THREE.GLTFLoader();

  loader.load(
    fichero,
    function(gltf) {
      var modelo = gltf.scene;
      if (tinte !== 0xffffff)
        tenirModelo(modelo, tinte);

      // Escala por caja envolvente, como con las personas.
      var box = new THREE.Box3().setFromObject(modelo);
      var size = new THREE.Vector3();
      box.getSize(size);
      var escala = tipo.altura / size.y;
      modelo.scale.set(escala, escala, escala);
      modelo.traverse(function(objeto) {
        if (objeto.isMesh) objeto.castShadow = true;
      });

      // Clips: andar, correr (el perro lo llama "Gallop") y atacar (el gato, "Headbutt").
      var mixerAgente = new THREE.AnimationMixer(modelo);
      var clipAndar = buscarClip(gltf.animations, 'Walk');
      if (clipAndar === null && gltf.animations.length > 0) {
        // Sin clip de andar el animal se deslizaria quieto: usamos el primero que haya.
        console.warn(fichero + ' no tiene clip Walk; se usa ' + gltf.animations[0].name);
        clipAndar = gltf.animations[0];
      }
      var clipCorrer = buscarClip(gltf.animations, 'Run') || buscarClip(gltf.animations, 'Gallop') || clipAndar;
      var clipAtacar = buscarClip(gltf.animations, 'Attack') || buscarClip(gltf.animations, 'Headbutt');
      var acciones = {
        andar: clipAndar !== null ? mixerAgente.clipAction(clipAndar) : null,
        correr: clipCorrer !== null ? mixerAgente.clipAction(clipCorrer) : null,
        atacar: clipAtacar !== null ? mixerAgente.clipAction(clipAtacar) : null
      };
      console.log(nombreTipo + ' cargado. Animaciones:', gltf.animations.map(function(a) { return a.name; }));

      nuevoPerseguidor(tipo, modelo, anguloInicial, mixerAgente, acciones);
    },
    undefined,
    function(error) {
      console.warn('No se pudo cargar el modelo del ' + nombreTipo + ' (' + fichero + '); se usa el de primitivas.');
      nuevoPerseguidor(tipo, crearPerseguidorPrimitivas(tipo.color_reserva), anguloInicial, null,
        { andar: null, correr: null, atacar: null });
    }
  );
}

// La rata esta fuera del alcance de este perseguidor: en una alcantarilla siempre;
// en un arbol o en una plataforma solo si el animal no sabe trepar.
function rataASalvoDe(agente)
{
  return rata_escondida || ((rata_en_arbol || rata_en_plataforma) && !agente.tipo.sube_arboles);
}

// Oculta de verdad (no se puede ni recoger queso): en cualquiera de los dos escondites.
function rataOculta()
{
  return rata_escondida || rata_en_arbol;
}

// Fuera del alcance de las personas: escondida o subida a una plataforma.
function rataInalcanzable()
{
  return rataOculta() || rata_en_plataforma;
}

function actualizarPerseguidor(agente, delta)
{
  var xAntes = agente.pos.x, zAntes = agente.pos.z;
  var haciaRata = hacia_rata_tmp.subVectors(pos_rata, agente.pos);
  haciaRata.y = 0;
  var distancia = haciaRata.length();
  var alturaModelo = 0;

  if (agente.estado === 'persiguiendo') {
    if (rataASalvoDe(agente)) {
      // Pierde el rastro y vuelve a pasear.
      agente.estado = 'paseando';
      agente.frames_giro = 0;
    } else {
      if (agente.frames_giro > 0) {
        // Esta rodeando un obstaculo: sigue girando hacia el lado elegido unos frames.
        agente.angulo += agente.direccion_giro * giro_perseguidor * 1.5;
        agente.frames_giro--;
      } else {
        // Angulo hacia la rata: atan2(x, z) porque velocity = (sin a, 0, cos a).
        var anguloObjetivo = Math.atan2(haciaRata.x, haciaRata.z);
        var diferencia = anguloObjetivo - agente.angulo;
        // Llevamos la diferencia a [-PI, PI] para girar por el lado corto.
        diferencia = Math.atan2(Math.sin(diferencia), Math.cos(diferencia));
        agente.angulo += THREE.MathUtils.clamp(diferencia, -giro_perseguidor, giro_perseguidor);
        agente.velocity.set(Math.sin(agente.angulo), 0, Math.cos(agente.angulo));

        // Si la fuente, el mobiliario o una persona se interponen, se rodean: los
        // sensores diagonales del Tron eligen el lado con mas espacio libre.
        if (distanciaLibre(agente, agente.velocity, agente.lista_obstaculos) < 1.5) {
          direccion_izquierda_ia.set(Math.sin(agente.angulo + Math.PI / 4), 0, Math.cos(agente.angulo + Math.PI / 4));
          direccion_derecha_ia.set(Math.sin(agente.angulo - Math.PI / 4), 0, Math.cos(agente.angulo - Math.PI / 4));
          agente.direccion_giro =
            distanciaLibre(agente, direccion_izquierda_ia, agente.lista_obstaculos) >=
            distanciaLibre(agente, direccion_derecha_ia, agente.lista_obstaculos) ? 1 : -1;
          agente.frames_giro = 20;
        }
      }
      agente.velocity.set(Math.sin(agente.angulo), 0, Math.cos(agente.angulo));

      // Solo avanza si cabe: asi nunca atraviesa nada solido, aunque persiga a la rata.
      if (distanciaLibreAncha(agente, agente.velocity, agente.lista_obstaculos) >
          agente.tipo.velocidad + agente.tipo.alcance)
        agente.pos.addScaledVector(agente.velocity, agente.tipo.velocidad);

      // El gato trepa: si la rata esta en un arbol y el gato llega al tronco, sube con ella.
      if (rata_en_arbol && agente.tipo.sube_arboles && arbol_actual !== null &&
          distanciaXZ(arbol_actual.pos, agente.pos.x, agente.pos.z) < radio_arbol + 0.5)
        alturaModelo = altura_subida_gato;

      if (distancia < distancia_atrapar)
        terminarJuego('Te ha atrapado un ' + agente.tipo.nombre, agente);
    }
  } else {
    if (!rataASalvoDe(agente) && distancia < agente.tipo.radio_vision && tiempo_partida > segundos_de_gracia)
      agente.estado = 'persiguiendo';
    else
      pasear(agente, agente.lista_obstaculos, agente.tipo.velocidad * 0.5, giro_perseguidor * 0.5);
  }

  // Los que trepan (gatos) siguen la altura de las plataformas que pisan; los perros
  // no las tienen debajo nunca porque las rodean.
  if (agente.tipo.sube_arboles)
    alturaModelo = Math.max(alturaModelo, alturaSuelo(agente.pos.x, agente.pos.z, agente.modelo.position.y, altura_escalon_gato));

  comprobarAtasco(agente, xAntes, zAntes);

  agente.modelo.position.set(agente.pos.x, alturaModelo, agente.pos.z);
  agente.modelo.rotation.set(0, agente.angulo + agente.desfase, 0);
  agente.colisionador.position.set(agente.pos.x, alturaModelo + 0.5, agente.pos.z);

  // Animacion: con modelo, clip de andar o correr; con primitivas, patas como pendulos.
  if (agente.mixer !== null) {
    if (!juego_terminado)
      cambiarAnimacionAgente(agente, agente.estado === 'persiguiendo' ? agente.acciones.correr : agente.acciones.andar);
    agente.mixer.update(delta);
  } else if (agente.patas !== null) {
    agente.fase += delta * (agente.estado === 'persiguiendo' ? 18 : 9);
    for (var i = 0; i < 4; i++) {
      var signo = (i === 0 || i === 3) ? 1 : -1;
      agente.patas[i].rotation.x = 0.5 * Math.sin(agente.fase) * signo;
    }
  }
}

// 2- rata
// Copiado de loadLightCycle() del Tron y de ej-mixamo.js para las animaciones.
function loadRata()
{
  var loader = new THREE.GLTFLoader();

  loader.load(
    'models/rata/Rat by Quaternius - iltq5bVNaV.glb',
    function(gltf) {
      rata = gltf.scene;
      rata.position.copy(pos_rata);
      rata.scale.set(escala_rata, escala_rata, escala_rata); // Ajusta la escala segun sea necesario

      rata.traverse(function(objeto) {
        if (objeto.isMesh) {
          objeto.castShadow = true;
        }
      });
      scene.add(rata);
      compilarShaders();

      // Animaciones: una accion por cada clip del fichero (ej-mixamo.js).
      mixer = new THREE.AnimationMixer(rata);
      gltf.animations.forEach(function(clip) {
        // Los nombres vienen como "RatArmature|Rat_Idle"; nos quedamos con "Idle".
        var nombre = clip.name.split('_').pop();
        acciones_rata[nombre] = mixer.clipAction(clip);
      });
      // La muerte se reproduce una sola vez y se queda en el ultimo fotograma.
      if (acciones_rata['Death'] !== undefined) {
        acciones_rata['Death'].setLoop(THREE.LoopOnce);
        acciones_rata['Death'].clampWhenFinished = true;
      }
      console.log('Animaciones de la rata:', Object.keys(acciones_rata));
      cambiarAnimacionRata('Idle');

      // 10- ya se puede empezar: activamos el boton del menu.
      var boton = document.getElementById('boton_empezar');
      boton.disabled = false;
      boton.textContent = 'Empezar partida';
    },
    undefined,
    function(error) {
      console.error('No se pudo cargar la rata', error);
    }
  );
}

// Detiene la animacion actual y reproduce la nueva (changeAnimation de ej-mixamo.js).
function cambiarAnimacionRata(nombre)
{
  if (accion_actual === acciones_rata[nombre] || acciones_rata[nombre] === undefined)
    return;

  if (accion_actual !== null)
    accion_actual.stop();

  accion_actual = acciones_rata[nombre];
  accion_actual.play();
}

// Lo mismo para personas y gatos, que guardan su accion actual en su propio objeto.
function cambiarAnimacionAgente(agente, accion)
{
  if (accion === null || accion === undefined || agente.accion_actual === accion)
    return;

  if (agente.accion_actual !== null)
    agente.accion_actual.stop();

  agente.accion_actual = accion;
  accion.play();
}

// 5- personas
// Cada persona es un modelo GLTF con su propio mixer, su angulo y su estado:
// 'paseando', 'acercando' o 'pateando'.
function loadPersona(fichero, anguloInicial)
{
  var loader = new THREE.GLTFLoader();

  loader.load(
    fichero,
    function(gltf) {
      var persona = {
        modelo: gltf.scene,
        pos: new THREE.Vector3(
          Math.cos(anguloInicial) * radio_plaza * 0.6,
          0,
          Math.sin(anguloInicial) * radio_plaza * 0.6
        ),
        angulo: anguloInicial + Math.PI / 2,
        angulo_inicial: anguloInicial + Math.PI / 2,
        velocity: new THREE.Vector3(0, 0, 1),
        mixer: new THREE.AnimationMixer(gltf.scene),
        accion_andar: null,
        accion_patada: null,     // solo los modelos que traen Kick_Right
        accion_golpe: null,      // Punch: se usa al atrapar a la rata por contacto
        accion_actual: null,
        estado: 'paseando',
        tiempo_patada: 0,
        impacto_comprobado: false,
        frames_acercando: 0,
        frames_descanso: 0,
        direccion_giro: 1,
        frames_giro: 0,
        frames_hasta_cambio: 90,
        colisionador: crearColisionador(0.5, altura_persona),
        marcador: crearMarcador(color_marcador.persona, 1.7)
      };

      // Ajustamos la escala al tamano del mesh que cargamos (como en ej-loader.js):
      // medimos el bounding box y escalamos para que mida altura_persona.
      var box = new THREE.Box3().setFromObject(persona.modelo);
      var size = new THREE.Vector3();
      box.getSize(size);
      var escala = altura_persona / size.y;
      persona.modelo.scale.set(escala, escala, escala);
      persona.modelo.position.copy(persona.pos);
      persona.modelo.traverse(function(objeto) {
        if (objeto.isMesh) objeto.castShadow = true;
      });
      scene.add(persona.modelo);
      compilarShaders();

      // Clips: andar, patada y punetazo. Los nombres cambian segun el modelo
      // ("Man_Walk", "Female_Walk", "Walk"; "Kick_Right"; "Man_Punch", "Punch_Right"...).
      for (var i = 0; i < gltf.animations.length; i++) {
        var nombre = gltf.animations[i].name;
        if (nombre.indexOf('Walk') !== -1 && persona.accion_andar === null)
          persona.accion_andar = persona.mixer.clipAction(gltf.animations[i]);
        if (nombre.indexOf('Kick_Right') !== -1)
          persona.accion_patada = persona.mixer.clipAction(gltf.animations[i]);
        if (nombre.indexOf('Punch') !== -1 && persona.accion_golpe === null)
          persona.accion_golpe = persona.mixer.clipAction(gltf.animations[i]);
      }
      cambiarAnimacionAgente(persona, persona.accion_andar);

      persona.pos_inicial = persona.pos.clone();
      personas.push(persona);
      // La rata choca con las personas y las personas (y los gatos) se esquivan entre si.
      objectsToCheck.push(persona.colisionador);
      objectsToCheckIA.push(persona.colisionador);
      objectsToCheckGatos.push(persona.colisionador);
      objectsToCheckPerros.push(persona.colisionador);
    },
    undefined,
    function(error) {
      console.error('No se pudo cargar la persona ' + fichero, error);
    }
  );
}

// Lanza un rayo desde un agente (persona o gato) en una direccion y devuelve la
// distancia al primer obstaculo, sin contarse a si mismo (IA del Tron).
function distanciaLibre(agente, direccion, lista)
{
  // El rayo sale a 0.35 de los pies: asi choca con el escalon de la fuente y los
  // parterres (0.5 de alto). Los gatos que han subido al escalon lo lanzan desde alli.
  origen_rayo_ia.copy(agente.pos);
  origen_rayo_ia.y = agente.modelo.position.y + 0.35;
  raycaster_ia.set(origen_rayo_ia, direccion);

  const impactos = raycaster_ia.intersectObjects(listaSinAgente(agente, lista), true);
  var distancia = impactos.length > 0 ? impactos[0].distance : Infinity;
  return Math.min(distancia, distanciaAlBorde(origen_rayo_ia, direccion));
}

// RENDIMIENTO- distancia desde un punto de la plaza hasta su borde (circunferencia de
// radio R) avanzando en la direccion d (unitaria). Es la interseccion rayo-circunferencia:
// |p + t d| = R  ->  t^2 + 2 (p.d) t + (|p|^2 - R^2) = 0, y nos quedamos con la raiz
// positiva. Con productos escalares (tema 1) en vez de lanzar un rayo contra los 128
// triangulos del cilindro invisible, que era lo mas caro de la IA.
function distanciaAlBorde(punto, direccion)
{
  var R = radio_plaza - 0.3;
  var b = punto.x * direccion.x + punto.z * direccion.z;            // p . d
  var c = punto.x * punto.x + punto.z * punto.z - R * R;           // |p|^2 - R^2
  var discriminante = b * b - c;
  if (discriminante < 0)
    return Infinity;
  return -b + Math.sqrt(discriminante);
}

// ATASCO- como nadie atraviesa nada, alguien puede quedar encajado entre obstaculos sin
// poder avanzar en ninguna direccion. Si lleva 40 frames sin moverse, da media vuelta
// (con algo de azar) para salir de ahi.
function comprobarAtasco(agente, xAntes, zAntes)
{
  if (Math.abs(agente.pos.x - xAntes) + Math.abs(agente.pos.z - zAntes) < 0.0001)
    agente.frames_quieto = (agente.frames_quieto || 0) + 1;
  else
    agente.frames_quieto = 0;

  if (agente.frames_quieto > 40) {
    agente.angulo += Math.PI * (0.7 + Math.random() * 0.6);
    agente.frames_giro = 0;
    agente.frames_quieto = 0;
  }
}

// Medidas del cuerpo: los animales las tienen en su tipo; las personas, fijas.
function anchoAgente(agente) { return agente.tipo ? agente.tipo.ancho : 0.3; }
function alcanceAgente(agente) { return agente.tipo ? agente.tipo.alcance : 0.5; }

// Como la de la rata: tres rayos (centro y los dos costados) y devuelve el mas corto.
// Se usa para decidir si el agente puede dar el paso sin meterse en nada solido.
const lateral_rayo_ia = new THREE.Vector3();
const centro_agente_tmp = new THREE.Vector3();
function distanciaLibreAncha(agente, direccion, lista)
{
  var minima = Infinity;
  centro_agente_tmp.copy(agente.pos);
  lateral_rayo_ia.set(direccion.z, 0, -direccion.x).multiplyScalar(anchoAgente(agente));
  for (var lado = -1; lado <= 1; lado++) {
    agente.pos.copy(centro_agente_tmp).addScaledVector(lateral_rayo_ia, lado);
    minima = Math.min(minima, distanciaLibre(agente, direccion, lista));
  }
  agente.pos.copy(centro_agente_tmp);
  return minima;
}

// RENDIMIENTO- la lista de obstaculos sin el propio agente se calcula una vez y se
// guarda en el agente; solo se rehace si la lista original ha crecido (al cargar
// mas personas). Antes se creaba una lista nueva en cada rayo, muchas veces por frame,
// y eso da trabajo al recolector de basura.
function listaSinAgente(agente, lista)
{
  if (agente.lista_cache === undefined || agente.lista_cache_origen !== lista ||
      agente.lista_cache_tamano !== lista.length) {
    agente.lista_cache = lista.filter(function(obj) {
      return obj !== agente.modelo && obj !== agente.colisionador;
    });
    agente.lista_cache_origen = lista;
    agente.lista_cache_tamano = lista.length;
  }
  return agente.lista_cache;
}

// Paseo erratico: cada cierto numero de frames el agente decide un giro al azar,
// y ademas usa los tres sensores del Tron (frente y diagonales) para esquivar.
function pasear(agente, lista, velocidad, giro)
{
  agente.velocity.set(Math.sin(agente.angulo), 0, Math.cos(agente.angulo));
  let distancia_frente = distanciaLibre(agente, agente.velocity, lista);

  if (agente.frames_giro === 0 && distancia_frente < distancia_deteccion_persona) {
    direccion_izquierda_ia.set(
      Math.sin(agente.angulo + Math.PI / 4),
      0,
      Math.cos(agente.angulo + Math.PI / 4)
    );
    direccion_derecha_ia.set(
      Math.sin(agente.angulo - Math.PI / 4),
      0,
      Math.cos(agente.angulo - Math.PI / 4)
    );

    agente.direccion_giro =
      distanciaLibre(agente, direccion_izquierda_ia, lista) >=
      distanciaLibre(agente, direccion_derecha_ia, lista) ? 1 : -1;
    agente.frames_giro = 30;
  }

  // Cambio de rumbo al azar de vez en cuando: asi el paseo parece erratico.
  agente.frames_hasta_cambio--;
  if (agente.frames_giro === 0 && agente.frames_hasta_cambio <= 0) {
    agente.direccion_giro = Math.random() < 0.5 ? 1 : -1;
    agente.frames_giro = 15 + Math.floor(Math.random() * 40);
    agente.frames_hasta_cambio = 90 + Math.floor(Math.random() * 150);
  }

  if (agente.frames_giro > 0) {
    agente.angulo += agente.direccion_giro * giro;
    agente.frames_giro--;
    agente.velocity.set(Math.sin(agente.angulo), 0, Math.cos(agente.angulo));
    distancia_frente = distanciaLibre(agente, agente.velocity, lista);
  }

  // Si de todos modos hay algo delante, se queda parado girando.
  if (distanciaLibreAncha(agente, agente.velocity, lista) > velocidad + alcanceAgente(agente))
    agente.pos.addScaledVector(agente.velocity, velocidad);
}

function actualizarPersona(persona, delta)
{
  var xAntes = persona.pos.x, zAntes = persona.pos.z;
  var haciaRata = hacia_rata_tmp.subVectors(pos_rata, persona.pos);
  haciaRata.y = 0;
  var distancia = haciaRata.length();

  // Chocar con una persona acaba la partida (vale para todas, sepan o no dar patadas).
  if (!rataInalcanzable() && !juego_terminado && distancia < distancia_atrapar_persona) {
    persona.angulo = Math.atan2(haciaRata.x, haciaRata.z);
    cambiarAnimacionAgente(persona, persona.accion_golpe);
    terminarJuego('Te ha pillado una persona', persona);
  }

  if (persona.estado === 'pateando') {
    persona.tiempo_patada += delta;

    // En el momento del impacto comprobamos si la rata sigue al alcance.
    if (!persona.impacto_comprobado && persona.tiempo_patada >= momento_impacto_patada) {
      persona.impacto_comprobado = true;
      if (!rataInalcanzable() && distancia < alcance_patada)
        terminarJuego('Te ha dado una patada', persona);
    }

    // Cuando acaba el clip vuelve a pasear y descansa un rato antes de volver a golpear.
    if (persona.tiempo_patada >= persona.accion_patada.getClip().duration) {
      persona.estado = 'paseando';
      persona.frames_descanso = 90;
      cambiarAnimacionAgente(persona, persona.accion_andar);
    }
  } else if (persona.estado === 'acercando') {
    // Va a por la rata: se encara hacia ella y avanza hasta tenerla al alcance.
    persona.frames_acercando++;

    if (rataInalcanzable() || juego_terminado || distancia > radio_vision_persona * 1.6 ||
        persona.frames_acercando > frames_maximos_acercando) {
      // La pierde de vista (o se cansa) y vuelve a pasear.
      persona.estado = 'paseando';
      persona.frames_descanso = 60;
    } else {
      persona.angulo = Math.atan2(haciaRata.x, haciaRata.z);
      persona.velocity.set(Math.sin(persona.angulo), 0, Math.cos(persona.angulo));

      if (distancia > alcance_patada * 0.8) {
        // Avanza algo mas rapido que paseando, si no hay nada en medio.
        var paso = velocidad_persona * 1.5;
        if (distanciaLibreAncha(persona, persona.velocity, objectsToCheckIA) > paso + alcanceAgente(persona))
          persona.pos.addScaledVector(persona.velocity, paso);
      } else {
        persona.estado = 'pateando';
        persona.tiempo_patada = 0;
        persona.impacto_comprobado = false;
        cambiarAnimacionAgente(persona, persona.accion_patada);
      }
    }
  } else {
    // Deteccion de la rata: cerca y dentro del campo de vision. Es el ejercicio
    // "nos ha visto el enemigo" del tema 1: el producto escalar entre la direccion
    // de la persona y el vector hacia la rata es el coseno del angulo entre ambos.
    // Solo las personas con clip de patada van a por la rata.
    if (persona.frames_descanso > 0)
      persona.frames_descanso--;

    persona.velocity.set(Math.sin(persona.angulo), 0, Math.cos(persona.angulo));

    if (persona.accion_patada !== null && persona.frames_descanso === 0 &&
        !rataInalcanzable() && !juego_terminado && distancia < radio_vision_persona) {
      haciaRata.normalize();
      if (haciaRata.dot(persona.velocity) > cos_medio_angulo_vision) {
        persona.estado = 'acercando';
        persona.frames_acercando = 0;
      }
    }

    if (persona.estado === 'paseando')
      pasear(persona, objectsToCheckIA, velocidad_persona, giro_persona);
  }

  if (persona.estado !== 'pateando')
    comprobarAtasco(persona, xAntes, zAntes);

  persona.modelo.position.copy(persona.pos);
  persona.modelo.rotation.set(0, persona.angulo, 0);
  persona.colisionador.position.set(persona.pos.x, altura_persona / 2, persona.pos.z);
}

// 7- escondites
function actualizarEscondites(delta)
{
  rata_escondida = false;
  for (var i = 0; i < escondites.length; i++) {
    var escondite = escondites[i];
    var dentro = en_suelo && pos_rata.y < 0.1 && distanciaXZ(escondite.pos, pos_rata.x, pos_rata.z) < radio_escondite;
    if (dentro)
      rata_escondida = true;

    // Anillo, halo y columna laten; si la rata esta dentro se ponen blancos.
    var latido = 0.35 + 0.2 * Math.sin(clock.elapsedTime * 3 + i);
    escondite.anillo.material.opacity = dentro ? 0.9 : latido;
    escondite.anillo.material.color.set(dentro ? 0xffffff : 0x33ff88);
    var tamanoHalo = 3.0 + 0.6 * Math.sin(clock.elapsedTime * 3 + i);
    escondite.halo.scale.set(tamanoHalo, tamanoHalo, 1);
    escondite.halo.material.color.set(dentro ? 0xffffff : 0x33ff88);
    escondite.haz.material.opacity = dentro ? 0.6 : 0.25 + 0.12 * Math.sin(clock.elapsedTime * 3 + i);
    escondite.haz.material.color.set(dentro ? 0xffffff : 0x33ff88);
  }

  // 7b- arboles: la rata sube si esta junto al tronco (y no esta ya en una alcantarilla).
  rata_en_arbol = false;
  arbol_actual = null;
  for (var j = 0; j < arboles.length; j++) {
    var arbol = arboles[j];
    var subida = en_suelo && pos_rata.y < 0.1 && !rata_escondida && distanciaXZ(arbol.pos, pos_rata.x, pos_rata.z) < radio_arbol;
    if (subida) {
      rata_en_arbol = true;
      arbol_actual = arbol;
    }
    var latidoArbol = 0.35 + 0.2 * Math.sin(clock.elapsedTime * 3 + j);
    arbol.anillo.material.opacity = subida ? 0.9 : latidoArbol;
    arbol.anillo.material.color.set(subida ? 0xffffff : 0xffb347);
    var tamanoHaloArbol = 3.0 + 0.6 * Math.sin(clock.elapsedTime * 3 + j);
    arbol.halo.scale.set(tamanoHaloArbol, tamanoHaloArbol, 1);
    arbol.halo.material.color.set(subida ? 0xffffff : 0xffb347);
    arbol.haz.material.opacity = subida ? 0.6 : 0.25 + 0.12 * Math.sin(clock.elapsedTime * 3 + j);
    arbol.haz.material.color.set(subida ? 0xffffff : 0xffb347);
  }
}

// 9- estado del juego
function terminarJuego(motivo, atacante)
{
  if (juego_terminado)
    return;

  juego_terminado = true;
  cambiarAnimacionRata('Death');
  // El que atrapa a la rata hace su gesto de ataque (si su modelo lo tiene).
  if (atacante !== undefined && atacante.acciones !== undefined && atacante.acciones.atacar !== null)
    cambiarAnimacionAgente(atacante, atacante.acciones.atacar);
  // 10- guardamos la partida en la tabla de records y decimos en que puesto ha quedado.
  // Siempre se guarda en el navegador; si hay records online, ademas se envia al servidor.
  var segundos = Math.floor(tiempo_partida);
  var puestoLocal = guardarRecord(nombre_partida, quesos_recogidos, segundos);

  document.getElementById('motivo').textContent = motivo + '.';
  document.getElementById('resumen').textContent =
    nombre_partida + ': ' + quesos_recogidos + ' quesos en ' + formatearTiempo(segundos);
  document.getElementById('fin').style.display = 'block';
  console.log('Fin de la partida:', motivo);

  if (!recordsOnline()) {
    mostrarPuesto(puestoLocal, 'de este navegador');
    return;
  }

  document.getElementById('puesto').textContent = 'Guardando en la tabla online...';
  enviarRecordOnline(nombre_partida, quesos_recogidos, segundos)
    .then(function(fila) {
      // Pedimos el top 10 y buscamos nuestra partida por su id para saber el puesto.
      return pedirRecordsOnline().then(function(records) {
        var puesto = 0;
        for (var i = 0; i < records.length; i++) {
          if (records[i].id === fila.id)
            puesto = i + 1;
        }
        mostrarPuesto(puesto, 'mundial');
      });
    })
    .catch(function(error) {
      console.warn('No se pudo guardar el record online', error);
      mostrarPuesto(puestoLocal, 'de este navegador (sin conexion con la tabla online)');
    });
}

function mostrarPuesto(puesto, tabla)
{
  document.getElementById('puesto').textContent = puesto > 0
    ? '¡Puesto ' + puesto + ' en la tabla ' + tabla + '!'
    : 'No entras en el top ' + max_records + ' ' + tabla + '. ¡Otra vez!';
}

// 10- records
// Se guardan en el localStorage del navegador como texto JSON. Leer y guardar estan
// en dos funciones aparte para poder cambiarlas luego por un servidor (records online).
function leerRecords()
{
  try {
    var texto = localStorage.getItem(clave_records);
    return texto ? JSON.parse(texto) : [];
  } catch (error) {
    // En modo incognito o con el almacenamiento bloqueado no hay records.
    return [];
  }
}

// Orden: mas quesos primero; con los mismos quesos, el que haya aguantado mas tiempo.
function compararRecords(a, b)
{
  if (b.quesos !== a.quesos)
    return b.quesos - a.quesos;
  return b.segundos - a.segundos;
}

// Anade la partida, ordena, se queda con las diez mejores y devuelve el puesto
// conseguido (0 si no entra en la tabla).
function guardarRecord(nombre, quesos, segundos)
{
  var records = leerRecords();
  var nuevo = { nombre: nombre, quesos: quesos, segundos: segundos, fecha: Date.now() };
  records.push(nuevo);
  records.sort(compararRecords);
  records = records.slice(0, max_records);

  try {
    localStorage.setItem(clave_records, JSON.stringify(records));
  } catch (error) {
    console.warn('No se pudo guardar el record', error);
  }
  return records.indexOf(nuevo) + 1;
}

function formatearTiempo(segundos)
{
  var minutos = Math.floor(segundos / 60);
  var resto = segundos % 60;
  return minutos + ':' + (resto < 10 ? '0' : '') + resto;
}

// 10b- RECORDS ONLINE con Supabase: una base de datos gratuita con una API REST.
// Se habla con ella con fetch (peticiones HTTP), sin librerias. La URL y la clave
// publica estan en js/config_online.js; si estan vacias se usan los records locales.
// La clave publica se puede ver en el codigo sin problema: la base de datos solo deja
// leer la tabla y anadir filas que cumplan las reglas (ver supabase_records.sql).
function recordsOnline()
{
  return typeof SUPABASE_URL === 'string' && SUPABASE_URL !== '' &&
         typeof SUPABASE_CLAVE === 'string' && SUPABASE_CLAVE !== '';
}

function cabecerasSupabase()
{
  var cabeceras = { 'apikey': SUPABASE_CLAVE, 'Content-Type': 'application/json' };
  // Las claves antiguas de Supabase (anon) son un token JWT ("eyJ...") y tambien van
  // en la cabecera Authorization; las nuevas (sb_publishable_...) solo en apikey.
  if (SUPABASE_CLAVE.indexOf('eyJ') === 0)
    cabeceras['Authorization'] = 'Bearer ' + SUPABASE_CLAVE;
  return cabeceras;
}

// Devuelve una promesa con las diez mejores partidas, ya ordenadas por el servidor.
function pedirRecordsOnline()
{
  var url = SUPABASE_URL + '/rest/v1/records' +
    '?select=id,nombre,quesos,segundos' +
    '&order=quesos.desc,segundos.desc,id.asc' +
    '&limit=' + max_records;

  return fetch(url, { headers: cabecerasSupabase() })
    .then(function(respuesta) {
      if (!respuesta.ok)
        throw new Error('Supabase respondio ' + respuesta.status);
      return respuesta.json();
    });
}

// Anade una partida y devuelve una promesa con la fila creada (incluye su id).
function enviarRecordOnline(nombre, quesos, segundos)
{
  var cabeceras = cabecerasSupabase();
  cabeceras['Prefer'] = 'return=representation';   // que devuelva la fila insertada

  return fetch(SUPABASE_URL + '/rest/v1/records', {
    method: 'POST',
    headers: cabeceras,
    body: JSON.stringify({ nombre: nombre, quesos: quesos, segundos: segundos })
  })
    .then(function(respuesta) {
      if (!respuesta.ok)
        throw new Error('Supabase respondio ' + respuesta.status);
      return respuesta.json();
    })
    .then(function(filas) {
      return filas[0];
    });
}

// Tabla del menu: online si esta configurado; si no, o si falla, la del navegador.
function mostrarRecords()
{
  if (!recordsOnline()) {
    pintarRecords(leerRecords(), 'Mejores partidas (este navegador)');
    return;
  }

  document.getElementById('titulo_records').textContent = 'Mejores partidas (cargando...)';
  pedirRecordsOnline()
    .then(function(records) {
      pintarRecords(records, 'Mejores partidas de todo el mundo');
    })
    .catch(function(error) {
      console.warn('No se pudieron leer los records online', error);
      pintarRecords(leerRecords(), 'Sin conexion: mejores partidas de este navegador');
    });
}

// Rellena la tabla del menu. Los nombres se ponen con textContent (nunca innerHTML)
// para que un nombre con etiquetas HTML no se interprete como codigo. Con records
// online esto es imprescindible: los nombres los escribe cualquiera.
function pintarRecords(records, titulo)
{
  document.getElementById('titulo_records').textContent = titulo;
  var cuerpo = document.querySelector('#tabla_records tbody');
  cuerpo.innerHTML = '';

  for (var i = 0; i < records.length; i++) {
    var fila = document.createElement('tr');
    var celdas = [i + 1, records[i].nombre, records[i].quesos, formatearTiempo(records[i].segundos)];
    for (var j = 0; j < celdas.length; j++) {
      var celda = document.createElement('td');
      celda.textContent = celdas[j];
      fila.appendChild(celda);
    }
    cuerpo.appendChild(fila);
  }

  document.getElementById('tabla_records').style.display = records.length > 0 ? 'table' : 'none';
  document.getElementById('sin_records').style.display = records.length > 0 ? 'none' : 'block';
}

// 10- menu
function prepararMenu()
{
  try {
    document.getElementById('nombre').value = localStorage.getItem(clave_nombre) || '';
  } catch (error) { }
  mostrarRecords();

  document.getElementById('form_menu').addEventListener('submit', function(event) {
    event.preventDefault();   // el formulario no debe recargar la pagina
    empezarPartida();
  });
  document.getElementById('volver_menu').addEventListener('click', function() {
    location.reload();
  });
}

function empezarPartida()
{
  // Hay que esperar a que esten cargados la rata y los animales.
  if (rata === null)
    return;

  // Como mucho 16 caracteres (la base de datos online tampoco acepta mas).
  nombre_partida = document.getElementById('nombre').value.trim().slice(0, 16) || 'Rata anonima';
  try {
    localStorage.setItem(clave_nombre, nombre_partida);
  } catch (error) { }

  // En el menu personas y animales han estado paseando: vuelven a sus sitios.
  for (var i = 0; i < personas.length; i++) {
    personas[i].pos.copy(personas[i].pos_inicial);
    personas[i].angulo = personas[i].angulo_inicial;
    personas[i].estado = 'paseando';
  }
  for (var j = 0; j < perseguidores.length; j++) {
    perseguidores[j].pos.copy(perseguidores[j].pos_inicial);
    perseguidores[j].angulo = perseguidores[j].angulo_inicial;
    perseguidores[j].estado = 'paseando';
  }

  tiempo_partida = 0;
  tiempo_restante = tiempo_inicial;
  camara_spring_iniciada = false;   // la camara se coloca de golpe detras de la rata
  document.activeElement.blur();    // que el boton no se quede con el foco (Espacio lo pulsaria)
  document.getElementById('menu').style.display = 'none';
  partida_iniciada = true;
}

// Fondo del menu: la camara da vueltas a la plaza y la gente pasea sin ver a la rata.
function animarMenu(delta)
{
  angulo_menu += 0.08 * delta;
  camera.position.set(Math.cos(angulo_menu) * 62, 30, Math.sin(angulo_menu) * 62);
  camera.lookAt(0, 0, 0);

  if (agua_fuente !== null)
    agua_fuente.rotation.z += 0.2 * delta;
  actualizarEscondites(delta);

  for (var i = 0; i < personas.length; i++) {
    var persona = personas[i];
    pasear(persona, objectsToCheckIA, velocidad_persona, giro_persona);
    persona.modelo.position.copy(persona.pos);
    persona.modelo.rotation.set(0, persona.angulo, 0);
    persona.colisionador.position.set(persona.pos.x, altura_persona / 2, persona.pos.z);
    persona.mixer.update(delta);
  }
  for (var j = 0; j < perseguidores.length; j++) {
    var agente = perseguidores[j];
    pasear(agente, agente.lista_obstaculos, agente.tipo.velocidad * 0.5, giro_perseguidor * 0.5);
    var y = agente.tipo.sube_arboles
      ? alturaSuelo(agente.pos.x, agente.pos.z, agente.modelo.position.y, altura_escalon_gato) : 0;
    agente.modelo.position.set(agente.pos.x, y, agente.pos.z);
    agente.modelo.rotation.set(0, agente.angulo + agente.desfase, 0);
    agente.colisionador.position.set(agente.pos.x, y + 0.5, agente.pos.z);
    if (agente.mixer !== null) agente.mixer.update(delta);
  }

  if (mixer !== null) mixer.update(delta);
}

function actualizarHUD()
{
  var perseguidorCerca = null;
  for (var i = 0; i < perseguidores.length; i++) {
    if (perseguidores[i].estado === 'persiguiendo')
      perseguidorCerca = perseguidores[i].tipo.nombre;
  }

  var estado;
  if (juego_terminado)
    estado = 'Partida terminada';
  else if (tiempo_partida < segundos_de_gracia)
    estado = 'Gatos y perros despiertan en ' + Math.ceil(segundos_de_gracia - tiempo_partida) + ' s';
  else if (rata_escondida)
    estado = 'En la alcantarilla: nadie puede seguirte. Gira con A/D y elige por donde salir';
  else if (rata_en_arbol)
    estado = 'En el arbol: el perro no llega... ¡pero el gato trepa! Gira con A/D para mirar';
  else if (rata_en_plataforma)
    estado = 'En alto: personas y perros no suben... ¡los gatos si!';
  else if (perseguidorCerca === 'perro')
    estado = '¡Un perro te persigue! Salta a algo alto, sube a un arbol o baja a una alcantarilla';
  else if (perseguidorCerca === 'gato')
    estado = '¡Un gato te persigue! Solo la alcantarilla (verde) te salva';
  else
    estado = 'Recoge los quesos. Verde: alcantarilla. Naranja: arbol.';

  document.getElementById('marcador_quesos').textContent = 'Quesos: ' + quesos_recogidos;
  document.getElementById('estado').textContent = estado;

  // 10- reloj: rojo y parpadeando en los ultimos 5 segundos; "+5 s" al coger un queso.
  var reloj = document.getElementById('reloj');
  reloj.textContent = 'Tiempo: ' + tiempo_restante.toFixed(1) + ' s' + (aviso_bonus > 0 ? '  +' + tiempo_por_queso + ' s' : '');
  if (aviso_bonus > 0)
    reloj.style.color = '#4cff7a';
  else if (tiempo_restante < 5)
    reloj.style.color = (Math.floor(tiempo_restante * 4) % 2 === 0) ? '#ff4444' : '#ffffff';
  else
    reloj.style.color = '#ffffff';

  // Barra de energia del dash: verde si se puede correr, naranja mientras se recarga.
  var barra = document.getElementById('energia_barra');
  barra.style.width = (energia_dash * 100) + '%';
  barra.style.background = (dash_activo || energia_dash >= energia_minima_dash) ? '#4cff7a' : '#ff9f3c';
}

function updateAspectRatio()
{
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

// FINAL- integra un resorte amortiguado para cualquier posicion Vector3.
function actualizarResorte(actual, velocidadActual, objetivo, delta)
{
  aceleracion_camara
    .copy(objetivo)
    .sub(actual)
    .multiplyScalar(rigidez_camara)
    .addScaledVector(velocidadActual, -amortiguacion_camara);

  velocidadActual.addScaledVector(aceleracion_camara, delta);
  actual.addScaledVector(velocidadActual, delta);
}

// FINAL- camara en tercera persona con posicion y punto de mirada elasticos.
// En los escondites cambia a la camara vigia; el muelle hace la transicion sola.
function updateCamera(delta)
{
  var vigia = rataOculta();
  var distancia = vigia ? distancia_camara_escondite : distancia_camara;
  var altura = vigia ? altura_camara_escondite : altura_camara;

  posicion_objetivo_camara
    .copy(rata.position)
    .addScaledVector(velocity, -distancia);
  posicion_objetivo_camara.y += altura;

  mirada_objetivo_camara.copy(rata.position);
  if (vigia)
    mirada_objetivo_camara.addScaledVector(velocity, adelanto_mirada_escondite);
  else
    mirada_objetivo_camara.y += desfase_lookat_y;

  // Angulo de vision: se abre al esconderse y se cierra al salir, poco a poco.
  // Cambiar el fovy obliga a recalcular la matriz de proyeccion (tema 3).
  var fovObjetivo = vigia ? fov_escondite : fov_normal;
  if (Math.abs(camera.fov - fovObjetivo) > 0.05) {
    camera.fov += (fovObjetivo - camera.fov) * (1 - Math.exp(-4 * delta));
    camera.updateProjectionMatrix();
  }

  // La primera posicion se inicializa sin recorrer toda la plaza desde la
  // camara usada mientras se cargaba el modelo.
  if (!camara_spring_iniciada) {
    camera.position.copy(posicion_objetivo_camara);
    mirada_actual_camara.copy(mirada_objetivo_camara);
    velocidad_camara.set(0, 0, 0);
    velocidad_mirada_camara.set(0, 0, 0);
    camara_spring_iniciada = true;
  } else {
    actualizarResorte(
      camera.position,
      velocidad_camara,
      posicion_objetivo_camara,
      delta
    );
    actualizarResorte(
      mirada_actual_camara,
      velocidad_mirada_camara,
      mirada_objetivo_camara,
      delta
    );
  }

  camera.lookAt(mirada_actual_camara);
}

// DEBUG- alterna entre la camara orbital y la camara en tercera persona.
function cambiarCamara()
{
  camara_orbital = !camara_orbital;
  cameraControls.enabled = camara_orbital;

  if (camara_orbital && rata !== null) {
    cameraControls.target.copy(rata.position);
    cameraControls.update();
  } else if (rata !== null) {
    // Volvemos suavemente desde la posicion orbital, pero descartamos la
    // velocidad anterior del resorte para evitar un tiron.
    velocidad_camara.set(0, 0, 0);
    velocidad_mirada_camara.set(0, 0, 0);
    mirada_actual_camara.copy(cameraControls.target);
    camara_spring_iniciada = true;
  }

  console.log(camara_orbital ? 'Camara orbital' : 'Camara en tercera persona');
}

// PAUSA- al pausar habilitamos OrbitControls; al continuar recuperamos la
// camara en tercera persona. El render sigue activo para poder mover la vista.
function cambiarPausa()
{
  juego_pausado = !juego_pausado;

  if (juego_pausado !== camara_orbital)
    cambiarCamara();

  // Evita conservar una tecla de movimiento pulsada al cambiar de estado.
  controls.moveForward = false;
  controls.moveBackward = false;
  controls.moveLeft = false;
  controls.moveRight = false;
  controls.run = false;

  console.log(juego_pausado ? 'Juego pausado' : 'Juego reanudado');
}

// 3- movimiento y camara en tercera persona
// En este modo las mismas teclas ajustan los parametros de la camara.
function tunearCamara()
{
  var cambio = false;

  if (controls.moveForward) {
    distancia_camara -= 0.05;
    cambio = true;
  }
  if (controls.moveBackward) {
    distancia_camara += 0.05;
    cambio = true;
  }
  if (controls.moveLeft) {
    altura_camara -= 0.05;
    cambio = true;
  }
  if (controls.moveRight) {
    altura_camara += 0.05;
    cambio = true;
  }
  if (controls.lookAtDown) {
    desfase_lookat_y -= 0.05;
    cambio = true;
  }
  if (controls.lookAtUp) {
    desfase_lookat_y += 0.05;
    cambio = true;
  }

  distancia_camara = Math.max(1, distancia_camara);

  if (cambio) {
    console.log(
      'Camara - distancia:', distancia_camara.toFixed(2),
      'altura:', altura_camara.toFixed(2),
      'lookAt Y:', desfase_lookat_y.toFixed(2)
    );
  }
}

function update()
{
  // Limitamos el delta para evitar saltos bruscos al volver a la pestana.
  var delta = Math.min(clock.getDelta(), 0.05);

  // PAUSA- solo se actualiza la camara orbital; rata, personas y animaciones
  // permanecen congeladas hasta volver a pulsar P.
  if (juego_pausado) {
    cameraControls.update();
    return;
  }

  // 3- movimiento y camara en tercera persona
  // Copiado y pegado del movimiento de update() en s3-cam2.js.
  if (rata === null)
    return;

  // 10- MENU- todavia no ha empezado la partida: solo el fondo animado.
  if (!partida_iniciada) {
    animarMenu(delta);
    return;
  }

  // FIN- la rata cae y todo lo demas se queda quieto; solo siguen la camara y los
  // gestos de ataque.
  if (juego_terminado) {
    if (mixer !== null) mixer.update(delta);
    for (var i = 0; i < personas.length; i++)
      personas[i].mixer.update(delta);
    for (var j = 0; j < perseguidores.length; j++)
      if (perseguidores[j].mixer !== null) perseguidores[j].mixer.update(delta);
    if (camara_orbital)
      cameraControls.update();
    else
      updateCamera(delta);
    return;
  }

  // El agua de la fuente gira despacio para que parezca que se mueve.
  if (agua_fuente !== null)
    agua_fuente.rotation.z += 0.2 * delta;

  // 10- TIEMPO LIMITE- empieza a correr cuando despiertan gatos y perros.
  tiempo_partida += delta;
  if (aviso_bonus > 0)
    aviso_bonus -= delta;
  if (tiempo_partida > segundos_de_gracia) {
    tiempo_restante -= delta;
    if (tiempo_restante <= 0) {
      tiempo_restante = 0;
      terminarJuego('Se ha acabado el tiempo');
      actualizarHUD();
      return;
    }
  }

  // 7- escondites: hay que saber si la rata esta a salvo antes de mover a los demas.
  actualizarEscondites(delta);

  // 5- personas y 8- perseguidores
  for (var i = 0; i < personas.length; i++) {
    actualizarPersona(personas[i], delta);
    personas[i].mixer.update(delta);
  }
  for (var i = 0; i < perseguidores.length; i++) {
    actualizarPerseguidor(perseguidores[i], delta);
  }

  // Si una persona o un gato acaban de terminar la partida, no seguimos con este
  // frame: si no, la animacion de muerte quedaria pisada por la de Idle.
  if (juego_terminado) {
    actualizarHUD();
    return;
  }

  // 6- quesos
  actualizarQuesos(delta);

  // Durante el ajuste, las teclas tunean la camara en vez de mover la rata.
  if (modo_tunear_camara) {
    tunearCamara();
  } else {
    if (controls.moveLeft) angulo += 0.05;
    if (controls.moveRight) angulo -= 0.05;
  }

  // Calcular el vector de direccion de vista
  velocity.set(Math.sin(angulo), 0, Math.cos(angulo));

  // DASH- la velocidad depende de la energia que quede.
  var speed = actualizarDash(delta);
  var moviendo = false;

  if (!modo_tunear_camara && (controls.moveForward || controls.moveBackward)) {
    // 4- colisiones
    // Copiado y pegado de update() en s3-colisiones.js. Para ir hacia atras
    // lanzamos el rayo en sentido contrario.
    var direccion = velocity.clone();
    if (controls.moveBackward && !controls.moveForward) {
      direccion.negate();
      speed = controls.speed;   // hacia atras siempre despacio
    }

    // Hacia delante se para cuando el hocico toca; hacia atras hay que dejar sitio a la cola.
    var margen = (controls.moveBackward && !controls.moveForward) ? 1.0 : 0.6;

    // Si no hay nada delante, permitir el movimiento
    if (caminoLibreRata(direccion, speed + margen)) {
      pos_rata.add(direccion.multiplyScalar(speed));
      moviendo = true;
    }
  }

  // FINAL- salto y plataformas: altura de la rata (gravedad, aterrizaje, bordes).
  actualizarAlturaRata(delta);
  rata_en_plataforma = en_suelo && pos_rata.y > 0.25;

  // Animacion segun lo que hace la rata (ej-mixamo.js cambia de clip con teclas,
  // aqui cambia sola segun el estado).
  if (!en_suelo)
    cambiarAnimacionRata('Jump');
  else if (moviendo && dash_activo)
    cambiarAnimacionRata('Run');
  else if (moviendo)
    cambiarAnimacionRata('Walk');
  else
    cambiarAnimacionRata('Idle');

  // En la alcantarilla la rata baja por la rejilla y en el arbol sube por el tronco
  // (solo el dibujo; pos_rata no cambia).
  rata.position.copy(pos_rata);
  if (rata_escondida)
    rata.position.y -= profundidad_escondite;
  if (rata_en_arbol)
    rata.position.y += altura_subida_rata;
  actualizarInclinacion(delta);

  actualizarHUD();

  // DEBUG- actualizamos solamente la camara que esta activa.
  if (camara_orbital) {
    cameraControls.update();
  } else {
    updateCamera(delta);
  }

  if (mixer !== null) mixer.update(delta);
}

function updateCameraTop()
{
  // En el menu se ve siempre la plaza entera.
  var radar = modo_radar && partida_iniciada;

  // El tamano del volumen ortografico decide cuanto abarca el mapa (tema 3, matriz
  // ortografica). Solo se recalcula la proyeccion cuando cambia el modo.
  var alcance = radar ? alcance_radar : alcance_hud;
  if (alcance !== alcance_mapa_actual) {
    cameraTop.left = -alcance / 2;
    cameraTop.right = alcance / 2;
    cameraTop.top = alcance / 2;
    cameraTop.bottom = -alcance / 2;
    cameraTop.updateProjectionMatrix();
    alcance_mapa_actual = alcance;
  }

  if (radar) {
    // Encima de la rata y con el vector up igual a su direccion: lo que tiene delante
    // sale arriba en el mapa. Como la camara mira en vertical, up tiene que estar en
    // el plano horizontal (pres_s3, ejercicio de la vista superior).
    cameraTop.position.set(pos_rata.x, 60, pos_rata.z);
    cameraTop.up.set(Math.sin(angulo), 0, Math.cos(angulo));
    objetivo_camera_top.set(pos_rata.x, 0, pos_rata.z);
    cameraTop.lookAt(objetivo_camera_top);
    return radar;
  }

  cameraTop.position.set(0, 60, 0);
  cameraTop.up.set(0, 0, -1);
  objetivo_camera_top.set(0, 0, 0);
  cameraTop.lookAt(objetivo_camera_top);
  return radar;
}

function render()
{
  requestAnimationFrame(render);
  update();
  var radar = updateCameraTop();
  stats.update();

  // vista 3d perspectiva (el mapa de sombras se calcula aqui, una vez por frame)
  renderer.shadowMap.needsUpdate = true;
  renderer.autoClear = false;
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
  renderer.setClearColor(new THREE.Color(0x000000));
  renderer.clear();
  renderer.render(scene, camera);

  // vista de arriba (HUD) en la esquina inferior derecha, copiada de s3-cam2.js.
  // Algo mas grande que antes para poder orientarse.
  var ds = Math.floor(Math.min(window.innerHeight, window.innerWidth) / 3.2);
  var x = window.innerWidth - ds - 10;
  var y = 10;
  renderer.setViewport(x, y, ds, ds);
  renderer.setScissor(x, y, ds, ds);
  renderer.setScissorTest(true);
  renderer.setClearColor(new THREE.Color(0x202020));
  renderer.clear();
  // Los marcadores estan en la capa 1, que solo ve esta camara.
  actualizarMarcadores(radar);
  renderer.render(scene, cameraTop);
  renderer.setScissorTest(false);

  // Marco y leyenda del minimapa: solo se recolocan si cambia el tamano de la ventana.
  if (ds !== lado_mapa_actual) {
    var marco = document.getElementById('marco_mapa');
    marco.style.width = ds + 'px';
    marco.style.height = ds + 'px';
    document.getElementById('leyenda').style.bottom = (ds + 16) + 'px';
    lado_mapa_actual = ds;
  }
  var cercano = distanciaQuesoMasCercano();
  document.getElementById('texto_mapa').textContent =
    (radar ? 'RADAR' : 'MAPA') + ' (M cambia)' +
    (cercano < Infinity ? ' · queso a ' + Math.round(cercano) + ' m' : '');
}
