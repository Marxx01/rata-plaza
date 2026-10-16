// La rata de la plaza - proyecto personal de GPC - Marc Hurtado

// Variables globales que van siempre
var renderer, scene, camera;
var cameraControls;
var cameraTop;
var stats;
const objetivo_camera_top = new THREE.Vector3();

var clock = new THREE.Clock();

// 1- escenario
const radio_plaza = 45;
const radio_acera = 52;
const radio_fachadas = 58;
var obstaculos = null;
var zonas_ocupadas = [];   // sitios donde no se ponen quesos
const alcance_hud = radio_acera * 2 + 4;
var fuente = null;
var agua_fuente = null;

// 2- rata
var pos_rata = new THREE.Vector3(0, 0, -14);
var rata = null;
var mixer = null;
var acciones_rata = {};
var accion_actual = null;
const escala_rata = 0.26;   // la rata mide unos 0.6

// 3- movimiento y camara en tercera persona
var angulo = 0;
var velocity = new THREE.Vector3(0, 0, 1);

// dash (Shift)
const duracion_dash = 2.0;   // segundos corriendo
const recarga_dash = 5.0;   // segundos para recargar
const energia_minima_dash = 0.25;
var energia_dash = 1;   // de 0 a 1
var dash_activo = false;

// inclinacion al girar (Tron)
const inclinacion_maxima = THREE.MathUtils.degToRad(12);
const rapidez_inclinacion = 10;
let inclinacion_actual = 0;

// salto (Tron)
const gravedad = -18;
const impulso_salto = 6.3;   // sube hasta 1.1
let velocidad_vertical = 0;
let en_suelo = true;

// 7c- plataformas
const objetosSuelo = [];
const raycaster_suelo = new THREE.Raycaster();
const origen_rayo_suelo = new THREE.Vector3();
const direccion_rayo_suelo = new THREE.Vector3(0, -1, 0);
const altura_escalon_rata = 0.35;   // sube sin saltar
const altura_escalon_gato = 0.8;   // los gatos trepan
var plataformas = [];
var grupo_plataformas = null;
var bloqueo_grandes = null;   // solo para personas y perros
var rata_en_plataforma = false;

// ajuste de la camara (Tron)
var modo_tunear_camara = false;
var distancia_camara = 3.5;
var altura_camara = 1.5;
var desfase_lookat_y = 0.4;

// camara en los escondites
const distancia_camara_escondite = 10;
const altura_camara_escondite = 13;
const adelanto_mirada_escondite = 3;
const fov_normal = 50;
const fov_escondite = 72;

// camara con muelle (Tron)
const rigidez_camara = 50;
const amortiguacion_camara = 14;
const velocidad_camara = new THREE.Vector3();
const velocidad_mirada_camara = new THREE.Vector3();
const posicion_objetivo_camara = new THREE.Vector3();
const mirada_objetivo_camara = new THREE.Vector3();
const mirada_actual_camara = new THREE.Vector3();
const aceleracion_camara = new THREE.Vector3();
let camara_spring_iniciada = false;

var camara_orbital = false;   // C: camara orbital

var juego_pausado = false;   // P: pausa

// 4- colisiones
const raycaster = new THREE.Raycaster();
var objectsToCheck = [];   // rata
var objectsToCheckIA = [];   // personas
var objectsToCheckGatos = [];   // gatos
var marcador_rata = null;
// minimapa: radar o mapa completo (M)
var modo_radar = true;
const alcance_radar = 48;
var alcance_mapa_actual = 0;
var lado_mapa_actual = 0;
var marcadores = [];   // marcadores del minimapa
const color_marcador = { rata: 0xff0000, persona: 0x3399ff, gato: 0xcc44ff, perro: 0xff7a00, queso: 0xffee00 };
// material de los colisionadores
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
const distancia_deteccion_persona = 3;
const giro_persona = 0.04;
const altura_persona = 2.6;
// ven a la rata si esta cerca y delante (120 grados)
const radio_vision_persona = 4;
const cos_medio_angulo_vision = Math.cos(THREE.MathUtils.degToRad(60));
const alcance_patada = 1.9;
const momento_impacto_patada = 0.45;   // segundos
const frames_maximos_acercando = 240;
const distancia_atrapar_persona = 1.2;
var personas = [];

// rayos de la IA (Tron)
const raycaster_ia = new THREE.Raycaster();
const hacia_rata_tmp = new THREE.Vector3();
const origen_rayo_ia = new THREE.Vector3();
const direccion_izquierda_ia = new THREE.Vector3();
const direccion_derecha_ia = new THREE.Vector3();

// los tres primeros saben dar patadas
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
var textura_haz = null;
var material_queso = null;

// 7- escondites
const radio_escondite = 1.1;
const profundidad_escondite = 0.5;   // lo que baja la rata
var escondites = [];
var rata_escondida = false;

// 7b- arboles
const radio_arbol = 1.3;
const altura_subida_rata = 1.9;
const altura_subida_gato = 1.3;
var arboles = [];
var troncos = null;
var rata_en_arbol = false;
var arbol_actual = null;

// 8- perseguidores: gatos y perros
const tipos_perseguidor = {
  gato: {
    nombre: 'gato',
    ficheros: ['models/gato/Cat by Quaternius - qKICY6xla2.glb'],
    tintes: [0xffffff, 0xffb070, 0x9aa0b4, 0x806050],   // colores para distinguirlos
    altura: 1.0,
    velocidad: 0.09,
    radio_vision: 9,
    ancho: 0.2,   // media anchura
    alcance: 0.6,   // distancia a la que se para
    altura_lomo: 0.5,   // para saltarle por encima
    sube_arboles: true,
    cantidad: 4
  },
  perro: {
    nombre: 'perro',
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
    altura_lomo: 0.75,
    sube_arboles: false,
    cantidad: 4
  }
};
const giro_perseguidor = 0.08;
// se aburren de perseguir
const segundos_max_persecucion = 10;
const segundos_aburrido = 5;
const segundos_parado_aburrido = 1.5;
var aviso_aburrido = 0;
var texto_aburrido = '';
var aviso_salto = 0;
var texto_salto = '';
const distancia_atrapar = 0.9;
const segundos_de_gracia = 6;   // al empezar no persiguen
var perseguidores = [];
var objectsToCheckPerros = [];

// 9- estado del juego
var juego_terminado = false;

// 10- menu, tiempo limite y records
var partida_iniciada = false;
var nombre_partida = '';
var tiempo_partida = 0;
const tiempo_inicial = 20;
const tiempo_por_queso = 5;
var tiempo_restante = tiempo_inicial;
var aviso_bonus = 0;
var angulo_menu = 0;
const clave_records = 'rata_plaza_records';
const clave_nombre = 'rata_plaza_nombre';
const max_records = 10;
var modo_ligero = false;   // L: sin sombras ni brillos

// Event listeners para controles (s3-cam2.js)
document.addEventListener('keydown', (event) => {
  // en el menu se escribe el nombre
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
    // Q y E: ajuste de la camara
    case 'KeyQ':
      controls.lookAtDown = true;
      break;
    case 'KeyE':
      controls.lookAtUp = true;
      break;
    // salto
    case 'Space':
      event.preventDefault();
      saltar();
      break;
    // pausa
    case 'KeyP':
      if (!event.repeat && !juego_terminado)
        cambiarPausa();
      break;
    // reiniciar
    case 'KeyR':
      if (juego_terminado)
        location.reload();
      break;
    // radar / mapa
    case 'KeyM':
      if (!event.repeat)
        modo_radar = !modo_radar;
      break;
    // modo ligero
    case 'KeyL':
      if (!event.repeat)
        alternarModoLigero();
      break;
  }
});

// L: apaga las sombras y los brillos
function alternarModoLigero()
{
  modo_ligero = !modo_ligero;

  renderer.shadowMap.enabled = !modo_ligero;
  scene.traverse(function(objeto) {
    if (objeto.material) objeto.material.needsUpdate = true;
  });

  for (var i = 0; i < escondites.length; i++) {
    escondites[i].halo.visible = !modo_ligero;
    escondites[i].haz.visible = !modo_ligero;
  }
  for (var j = 0; j < arboles.length; j++) {
    arboles[j].halo.visible = !modo_ligero;
    arboles[j].haz.visible = !modo_ligero;
  }
  for (var k = 0; k < quesos.length; k++) {
    quesos[k].halo.visible = !modo_ligero;
    quesos[k].charco.visible = !modo_ligero;
  }

  console.log('Modo ligero:', modo_ligero);
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
    // camara orbital
    case 'KeyC':
      if (!juego_pausado)
        cambiarCamara();
      break;
  }
});

// salto (Tron)
function saltar()
{
  if (rata === null || !en_suelo || juego_pausado || juego_terminado || rata_escondida || rata_en_arbol)
    return;

  velocidad_vertical = impulso_salto;
  en_suelo = false;
  cambiarAnimacionRata('Jump');
}

// colisiones de la rata: tres rayos (centro y lados)
const ancho_rata = 0.2;
const lateral_rayo = new THREE.Vector3();
const origen_rayo_rata = new THREE.Vector3();
function caminoLibreRata(direccion, distancia)
{
  // vector perpendicular a la direccion
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

// altura del suelo con un rayo hacia abajo (detectarSuelo del Tron)
function alturaSuelo(x, z, alturaActual, margen)
{
  origen_rayo_suelo.set(x, alturaActual + margen, z);
  raycaster_suelo.set(origen_rayo_suelo, direccion_rayo_suelo);
  raycaster_suelo.far = alturaActual + margen + 1;

  var impactos = raycaster_suelo.intersectObjects(objetosSuelo, true);
  if (impactos.length === 0)
    return 0;
  return impactos[0].point.y;
}

// gravedad y aterrizaje (Tron)
function actualizarAlturaRata(delta)
{
  var alturaDebajo = alturaSuelo(pos_rata.x, pos_rata.z, pos_rata.y, altura_escalon_rata);

  if (en_suelo) {
    if (pos_rata.y > alturaDebajo + 0.05) {
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

// dash: gasta energia y se recarga
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

  if (dash_activo)
    return controls.speedRun;
  return controls.speed;
}

// la rata se inclina al girar (Tron)
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
  // sombras (s5-luces.js)
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // el mapa de sombras se actualiza en render()
  renderer.shadowMap.autoUpdate = false;
  document.getElementById('container').appendChild(renderer.domElement);

  scene = new THREE.Scene();

  // Iluminacion basica
  var luzAmbiente = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(luzAmbiente);

  var luzDireccional = new THREE.DirectionalLight(0xffffff, 0.8);
  luzDireccional.position.set(60, 90, -40);
  // camara de sombras que cubra toda la plaza
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

  // las luces tambien en el minimapa (capa 1)
  luzAmbiente.layers.enable(1);
  luzDireccional.layers.enable(1);

  var aspectRatio = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(50, aspectRatio, 0.1, 1000);
  camera.position.set(radio_plaza, 25, radio_plaza);

  // camara cenital del minimapa (s3-cam2.js)
  cameraTop = new THREE.OrthographicCamera(
    -alcance_hud / 2,
    alcance_hud / 2,
    alcance_hud / 2,
    -alcance_hud / 2,
    1,
    200
  );
  cameraTop.up.set(0, 0, -1);
  cameraTop.layers.set(1);   // solo ve la capa 1

  cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
  cameraControls.target.set(0, 1, 0);
  cameraControls.enableKeys = false;

  // la camara la mueve updateCamera()
  cameraControls.enabled = false;

  // fps (Stats.js)
  stats = new Stats();
  stats.showPanel(0);   // 0: fps
  stats.domElement.style.left = 'auto';
  stats.domElement.style.right = '10px';
  stats.domElement.style.top = '110px';
  document.getElementById('container').appendChild(stats.domElement);

  window.addEventListener('resize', updateAspectRatio);
}

// skybox: esfera con el cielo por dentro (Tron)
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

// textura de las fachadas (s5-texturas.js)
function ponerTexturaFachadas(fachadas)
{
  var cargador = new THREE.TextureLoader();
  // tintes para que no sean todas iguales
  var tintes = [0xffffff, 0xffc8b0, 0xd6dae2, 0xfff0c0, 0xe6c2b4, 0xd0d8c8];

  cargador.load('images/fachada_diff_1k.jpg', function (texturaFachada) {
    cargador.load('images/fachada_nor_gl_1k.jpg', function (normalesFachada) {
      texturaFachada.encoding = THREE.sRGBEncoding;
      texturaFachada.wrapS = THREE.RepeatWrapping;
      texturaFachada.wrapT = THREE.RepeatWrapping;
      normalesFachada.wrapS = THREE.RepeatWrapping;
      normalesFachada.wrapT = THREE.RepeatWrapping;
      // filtrado anisotropico (tema 5)
      texturaFachada.anisotropy = renderer.capabilities.getMaxAnisotropy();
      normalesFachada.anisotropy = renderer.capabilities.getMaxAnisotropy();

      for (var i = 0; i < fachadas.children.length; i++) {
        var fachada = fachadas.children[i];
        var ancho = fachada.geometry.parameters.width;
        var alto = fachada.geometry.parameters.height;

        // una copia a lo ancho y las que quepan a lo alto
        var repeticionesAlto = alto / ancho;
        // la cornisa arriba del todo
        var desplazamiento = Math.ceil(repeticionesAlto) - repeticionesAlto;

        var mapa = texturaFachada.clone();
        mapa.repeat.set(1, repeticionesAlto);
        mapa.offset.set(0, desplazamiento);
        var relieve = normalesFachada.clone();
        relieve.repeat.set(1, repeticionesAlto);
        relieve.offset.set(0, desplazamiento);

        var frente = fachada.material[4];
        frente.map = mapa;
        frente.normalMap = relieve;
        frente.color.set(tintes[i % tintes.length]);
        frente.needsUpdate = true;   // hay que recompilar el shader
      }
    });
  });
}

function loadScene()
{

  // 1- escenario
  crearSkybox();

  // suelo
  var geometriaSuelo = new THREE.CircleGeometry(radio_plaza, 128);

  // textura del suelo: una baldosa cada 4 (s5-texturas.js)
  var repeticiones = radio_plaza * 2 / 4;
  var texturaSuelo = new THREE.TextureLoader().load(
    'images/cobblestone_pavement_diff_1k.jpg'
  );
  texturaSuelo.wrapS = THREE.RepeatWrapping;
  texturaSuelo.wrapT = THREE.RepeatWrapping;
  texturaSuelo.repeat.set(repeticiones, repeticiones);
  texturaSuelo.encoding = THREE.sRGBEncoding;

  // mapa de normales (tema 5)
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
  // suelo del minimapa (capa 1)
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

  // acera
  var geometriaAcera = new THREE.RingGeometry(radio_plaza, radio_acera, 128, 1);
  var materialAcera = new THREE.MeshPhongMaterial({ color: 0x8a8580 });
  var acera = new THREE.Mesh(geometriaAcera, materialAcera);
  acera.rotation.x = -Math.PI / 2;
  acera.position.y = -0.01;
  acera.receiveShadow = true;
  scene.add(acera);

  // asfalto de fuera
  var asfalto = new THREE.Mesh(
    new THREE.PlaneGeometry(radio_fachadas * 6, radio_fachadas * 6),
    new THREE.MeshPhongMaterial({ color: 0x454545 })
  );
  asfalto.rotation.x = -Math.PI / 2;
  asfalto.position.y = -0.02;
  scene.add(asfalto);

  // bordillo: anillo extruido
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

  // fachadas: 30 edificios en circulo (como la pared del Tron)
  var fachadas = new THREE.Group();
  var cantidadTramos = 30;
  var pasoAngular = Math.PI * 2 / cantidadTramos;
  var anchoFachada = 2 * radio_fachadas * Math.tan(pasoAngular / 2);
  var coloresFachada = [0xc8b7a6, 0xb0a08f, 0xd9c7b0, 0xa89f91, 0xcbbfa3, 0x9c8f7f];

  for (var tramo = 0; tramo < cantidadTramos; tramo++) {
    var anguloFachada = tramo * pasoAngular;
    var altoFachada = 10 + (tramo * 7) % 11;   // alturas distintas
    var fondoFachada = 9;

    // un material por cara, la foto solo mirando a la plaza (s5-texturas.js)
    var colorPared = coloresFachada[tramo % coloresFachada.length];
    var materialPared = new THREE.MeshLambertMaterial({ color: colorPared });
    var materialFrente = new THREE.MeshPhongMaterial({ color: colorPared, shininess: 5 });
    var fachada = new THREE.Mesh(
      new THREE.BoxGeometry(anchoFachada - 0.5, altoFachada, fondoFachada),
      [materialPared, materialPared, materialPared, materialPared, materialFrente, materialPared]
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
  ponerTexturaFachadas(fachadas);

  // limite invisible de la plaza (Tron)
  var altoLimite = 10;
  var limitePlaza = new THREE.Mesh(
    new THREE.CylinderGeometry(radio_plaza - 0.3, radio_plaza - 0.3, altoLimite, 64, 1, true),
    material_invisible
  );
  limitePlaza.position.y = altoLimite / 2;
  scene.add(limitePlaza);

  // texturas de los brillos
  textura_halo = crearTexturaHalo();
  textura_haz = crearTexturaHaz();

  crearFuente();
  zonas_ocupadas.push({ x: 0, z: 0, radio: 7.2 });
  var farolas = crearFarolas();

  // 7- alcantarillas
  for (var i = 0; i < 8; i++) {
    var anguloAlcantarilla = i * Math.PI / 4;
    crearEscondite(Math.cos(anguloAlcantarilla) * 30, Math.sin(anguloAlcantarilla) * 30);
  }
  crearEscondite(12, 0);
  crearEscondite(-12, 0);

  // 7b- arboles
  troncos = new THREE.Group();
  scene.add(troncos);
  for (var i = 0; i < 6; i++) {
    var anguloArbol = Math.PI / 6 + i * Math.PI / 3;
    crearArbol(Math.cos(anguloArbol) * 20, Math.sin(anguloArbol) * 20);
  }
  crearArbol(0, 36);
  crearArbol(0, -36);

  // escondites en el minimapa
  for (var e = 0; e < escondites.length; e++)
    crearMarcadorEscondite(0x33ff88, escondites[e].pos.x, escondites[e].pos.z);
  for (var a = 0; a < arboles.length; a++)
    crearMarcadorEscondite(0xffb347, arboles[a].pos.x, arboles[a].pos.z);

  // mobiliario
  crearObstaculos();

  bloqueo_grandes = new THREE.Group();
  scene.add(bloqueo_grandes);

  // 7c- plataformas: escalon, parterres y bancos
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
  // la rata puede caer encima de todo esto
  objetosSuelo.push(grupo_plataformas, fuente, obstaculos);

  // tambien en el minimapa
  mostrarEnMapa(fuente);
  mostrarEnMapa(grupo_plataformas);
  mostrarEnMapa(obstaculos);

  // 4- listas de colisiones
  objectsToCheck.push(limitePlaza, fuente, farolas, obstaculos, grupo_plataformas);
  objectsToCheckIA.push(fuente, farolas, troncos, obstaculos, grupo_plataformas, bloqueo_grandes);
  objectsToCheckGatos.push(fuente, farolas, obstaculos);
  objectsToCheckPerros.push(fuente, farolas, troncos, obstaculos, grupo_plataformas, bloqueo_grandes);

  marcador_rata = crearMarcadorRata();

  // 6- material de los quesos
  material_queso = new THREE.MeshPhongMaterial({
    color: 0xffd400,
    emissive: 0xaa7700,   // brilla sin luz
    shininess: 60
  });

  // queso de prueba para compilar sus shaders al cargar
  var quesoPrueba = crearQueso(0, 0, -50);
  compilarShaders();
  scene.remove(quesoPrueba.modelo);
  quitarMarcador(quesoPrueba.marcador);
  scene.remove(quesoPrueba.charco);

  // 2- rata
  loadRata();

  // 5- personas
  for (var i = 0; i < ficheros_personas.length; i++) {
    loadPersona(ficheros_personas[i], Math.PI / 8 + i * Math.PI / 4);
  }

  // 8- gatos y perros, alternados
  var totalPerseguidores = tipos_perseguidor.gato.cantidad + tipos_perseguidor.perro.cantidad;
  for (var k = 0; k < totalPerseguidores; k++) {
    var nombreTipo = 'perro';
    if (k % 2 === 0)
      nombreTipo = 'gato';
    var indice = Math.floor(k / 2);
    loadPerseguidor(nombreTipo, indice, Math.PI / 9 + k * Math.PI * 2 / totalPerseguidores);
  }
}

// compila los shaders al cargar (si no, tirones al jugar)
function compilarShaders()
{
  renderer.compile(scene, camera);
}

// cilindro invisible para las colisiones (Tron)
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

// fuente con cilindros
function crearFuente()
{
  fuente = new THREE.Group();

  var materialPiedra = new THREE.MeshPhongMaterial({ color: 0xa39e93 });
  // agua brillante
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
  fuente.position.y = 0.5;   // encima del escalon
  scene.add(fuente);
}

// 7c- plataformas
// escalon de la fuente
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

// parterre con cesped
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

// banco: la rata salta encima o pasa por debajo
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

  // caja invisible solo para personas y perros
  var caja = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 0.6), material_invisible);
  caja.position.set(x, 0.45, z);
  caja.rotation.y = anguloY;
  bloqueo_grandes.add(caja);
  plataformas.push({ tipo: 'caja', x: x, z: z, ancho: 1.6, fondo: 0.2, angulo: anguloY, altura: 0.5 });
  zonas_ocupadas.push({ x: x, z: z, radio: 1.5 });
}

// punto al azar encima de una plataforma
function puntoSobrePlataforma(plataforma)
{
  if (plataforma.tipo === 'anillo') {
    var a = Math.random() * Math.PI * 2;
    var r = plataforma.radioInterior + Math.random() * (plataforma.radioExterior - plataforma.radioInterior);
    return { x: Math.cos(a) * r, z: Math.sin(a) * r, altura: plataforma.altura };
  }
  // giro en Y (tema 3)
  var lx = (Math.random() - 0.5) * plataforma.ancho;
  var lz = (Math.random() - 0.5) * plataforma.fondo;
  var cosA = Math.cos(plataforma.angulo), sinA = Math.sin(plataforma.angulo);
  return {
    x: plataforma.x + lx * cosA + lz * sinA,
    z: plataforma.z - lx * sinA + lz * cosA,
    altura: plataforma.altura
  };
}

// farolas
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

// 1b- mobiliario
function crearObstaculos()
{
  obstaculos = new THREE.Group();
  scene.add(obstaculos);

  // terraza: mesas con dos sillas
  for (var i = 0; i < 5; i++) {
    var anguloMesa = THREE.MathUtils.degToRad(195 + i * 15);
    var xMesa = Math.cos(anguloMesa) * 34;
    var zMesa = Math.sin(anguloMesa) * 34;
    crearMesa(xMesa, zMesa);
    var lateral = anguloMesa + Math.PI / 2;
    crearSilla(xMesa + Math.cos(lateral) * 1.2, zMesa + Math.sin(lateral) * 1.2, lateral + Math.PI);
    crearSilla(xMesa - Math.cos(lateral) * 1.2, zMesa - Math.sin(lateral) * 1.2, lateral);
  }

  // papeleras
  for (var j = 0; j < 16; j += 2) {
    var anguloPapelera = Math.PI / 16 + j * Math.PI * 2 / 16;
    crearPapelera(Math.cos(anguloPapelera) * (radio_plaza - 4.2), Math.sin(anguloPapelera) * (radio_plaza - 4.2));
  }

  // jardineras
  for (var k = 0; k < 6; k++) {
    var anguloJardinera = k * Math.PI / 3;
    crearJardinera(Math.cos(anguloJardinera) * 24, Math.sin(anguloJardinera) * 24, anguloJardinera);
  }

  // bolardos alrededor de la fuente
  for (var m = 0; m < 12; m++) {
    var anguloBolardo = m * Math.PI / 6;
    crearBolardo(Math.cos(anguloBolardo) * 9.5, Math.sin(anguloBolardo) * 9.5);
  }
}

// caja invisible para que los rayos no pasen entre las patas
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
  jardinera.rotation.y = -anguloY - Math.PI / 2;   // tangente al anillo
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

// 7- escondites: alcantarilla
function crearEscondite(x, z)
{
  var alcantarilla = new THREE.Group();
  var materialMetal = new THREE.MeshPhongMaterial({ color: 0x4a4a4a, specular: 0x888888, shininess: 40 });

  // agujero
  var agujero = new THREE.Mesh(
    new THREE.CircleGeometry(0.9, 24),
    new THREE.MeshBasicMaterial({ color: 0x050505 })
  );
  agujero.rotation.x = -Math.PI / 2;
  agujero.position.y = 0.01;
  alcantarilla.add(agujero);

  // aro
  var aro = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.08, 8, 32), materialMetal);
  aro.rotation.x = Math.PI / 2;
  aro.position.y = 0.04;
  alcantarilla.add(aro);

  // rejilla
  for (var bx = -0.6; bx <= 0.61; bx += 0.3) {
    var cuerda = 2 * Math.sqrt(0.81 - bx * bx) - 0.1;
    var barra = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, cuerda), materialMetal);
    barra.position.set(bx, 0.04, 0);
    alcantarilla.add(barra);
  }

  // anillo brillante (aditivo, como los halos del Tron)
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

  // halo y columna de luz
  var halo = crearHaloSuelo(0x33ff88, 3.2);
  alcantarilla.add(halo);
  var haz = crearHaz(0x33ff88, 0.8, 4);
  alcantarilla.add(haz);

  alcantarilla.position.set(x, 0, z);
  scene.add(alcantarilla);

  escondites.push({ modelo: alcantarilla, pos: new THREE.Vector3(x, 0, z), anillo: anillo, halo: halo, haz: haz });
  zonas_ocupadas.push({ x: x, z: z, radio: 2.5 });
}

// 7b- arboles: tronco y copa
function crearArbol(x, z)
{
  var arbol = new THREE.Group();
  var materialTronco = new THREE.MeshPhongMaterial({ color: 0x6b4a2b });
  var materialCopa = new THREE.MeshLambertMaterial({ color: 0x3f8a3a });

  var tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 2.6, 12), materialTronco);
  tronco.position.y = 1.3;
  tronco.castShadow = true;
  // el tronco va aparte: es un obstaculo
  tronco.position.x = x;
  tronco.position.z = z;
  troncos.add(tronco);

  // copa: tres esferas
  var copas = [[0, 3.6, 0, 1.6], [0.9, 3.0, 0.5, 1.1], [-0.8, 3.1, -0.6, 1.0]];
  for (var i = 0; i < copas.length; i++) {
    var copa = new THREE.Mesh(new THREE.SphereGeometry(copas[i][3], 16, 12), materialCopa);
    copa.position.set(copas[i][0], copas[i][1], copas[i][2]);
    copa.castShadow = true;
    arbol.add(copa);
  }

  // anillo naranja
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

  // halo y columna de luz
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
// textura con un degradado para los halos
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

// degradado vertical para las columnas de luz
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

// halo en el suelo
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

// columna de luz
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

// minimapa: flecha
function geometriaFlecha(radio)
{
  var forma = new THREE.Shape();
  forma.moveTo(0, radio);   // punta
  forma.lineTo(radio * 0.75, -radio * 0.7);
  forma.lineTo(0, -radio * 0.3);
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

// siempre por encima de todo en el minimapa
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

// lo pone tambien en la capa 1 (minimapa)
function mostrarEnMapa(objeto)
{
  objeto.traverse(function(hijo) { hijo.layers.enable(1); });
}

function anadirMarcador(marcador)
{
  marcador.position.y = 3;
  // solo en la capa 1
  marcador.traverse(function(hijo) { hijo.layers.set(1); });
  scene.add(marcador);
  marcadores.push(marcador);
  return marcador;
}

// flecha con borde negro
function crearMarcador(color, radio)
{
  var marcador = new THREE.Group();
  marcador.add(mallaMarcador(geometriaFlecha(radio * 1.4), 0x000000, 20));
  marcador.add(mallaMarcador(geometriaFlecha(radio), color, 21));
  return anadirMarcador(marcador);
}

// la rata lleva un abanico delante
function crearMarcadorRata()
{
  var marcador = crearMarcador(color_marcador.rata, 2.1);
  var abanico = new THREE.CircleGeometry(7, 16, Math.PI / 3, Math.PI / 3);
  abanico.rotateX(Math.PI / 2);
  var malla = mallaMarcador(abanico, 0xffffff, 15);
  malla.material.opacity = 0.18;
  malla.layers.set(1);
  marcador.add(malla);
  marcador.userData.abanico = malla;
  return marcador;
}

// queso: disco, o flecha si esta lejos
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

// coloca los marcadores del minimapa
function actualizarMarcadores(radar)
{
  var escala = alcance_mapa_actual / alcance_radar;
  for (var m = 0; m < marcadores.length; m++)
    marcadores[m].scale.setScalar(escala);

  marcador_rata.position.set(pos_rata.x, 3, pos_rata.z);
  marcador_rata.rotation.y = angulo;
  marcador_rata.userData.abanico.visible = radar;

  for (var i = 0; i < personas.length; i++) {
    personas[i].marcador.position.set(personas[i].pos.x, 3, personas[i].pos.z);
    personas[i].marcador.rotation.y = personas[i].angulo;
  }
  for (var j = 0; j < perseguidores.length; j++) {
    perseguidores[j].marcador.position.set(perseguidores[j].pos.x, 3, perseguidores[j].pos.z);
    perseguidores[j].marcador.rotation.y = perseguidores[j].angulo;
  }

  // quesos fuera del radar: flecha en el borde
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

function distanciaQuesoMasCercano()
{
  var minima = Infinity;
  for (var i = 0; i < quesos.length; i++) {
    minima = Math.min(minima, distanciaXZ(quesos[i].modelo.position, pos_rata.x, pos_rata.z));
  }
  return minima;
}

// queso: cuna, halo y charco de luz
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

  // charco de luz en el suelo (sin luz de verdad)
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

// sitio al azar (a veces encima de una plataforma)
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
    // con sqrt no se juntan en el centro
    var radioQueso = Math.sqrt(
      Math.random() * (radioMaximo * radioMaximo - radioMinimo * radioMinimo) +
      radioMinimo * radioMinimo
    );
    var x = Math.cos(anguloQueso) * radioQueso;
    var z = Math.sin(anguloQueso) * radioQueso;

    // que no caiga encima de nada
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
  // sale uno nuevo cada poco
  tiempo_hasta_queso -= delta;
  if (tiempo_hasta_queso <= 0 && quesos.length < max_quesos) {
    var posicion = posicionAleatoriaQueso();
    quesos.push(crearQueso(posicion.x, posicion.z, posicion.y));
    tiempo_hasta_queso = segundos_entre_quesos;
  }

  for (var i = quesos.length - 1; i >= 0; i--) {
    var queso = quesos[i];

    // gira, sube y baja
    queso.fase += delta * 3;
    queso.modelo.rotation.y += delta;
    queso.modelo.position.y = queso.altura_base + 0.25 + 0.08 * Math.sin(queso.fase);
    var latido = 1.6 + 0.4 * Math.sin(queso.fase * 2);
    queso.halo.scale.set(latido, latido, 1);
    var latidoCharco = 2.4 + 0.5 * Math.sin(queso.fase * 2);
    queso.charco.scale.set(latidoCharco / 2.6, latidoCharco / 2.6, 1);

    // recoger el queso (a su misma altura)
    if (!rataOculta() &&
        distanciaXZ(queso.modelo.position, pos_rata.x, pos_rata.z) < distancia_recoger_queso &&
        Math.abs(pos_rata.y - queso.altura_base) < 0.5) {
      scene.remove(queso.modelo);
      scene.remove(queso.charco);
      quitarMarcador(queso.marcador);
      quesos.splice(i, 1);
      quesos_recogidos++;
      // +5 s
      tiempo_restante += tiempo_por_queso;
      aviso_bonus = 1.2;
    }
  }
}

// distancia en el suelo
function distanciaXZ(punto, x, z)
{
  var dx = punto.x - x;
  var dz = punto.z - z;
  return Math.sqrt(dx * dx + dz * dz);
}

// 8- perseguidores (gatos y perros)
// tinte (colorearMotoIA del Tron)
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

// busca un clip por el final del nombre ("AnimalArmature|Walk")
function buscarClip(animaciones, nombre)
{
  for (var i = 0; i < animaciones.length; i++) {
    var partes = animaciones[i].name.split('|');
    if (partes[partes.length - 1] === nombre)
      return animaciones[i];
  }
  return null;
}

// crea un gato o un perro
function nuevoPerseguidor(tipo, modelo, anguloInicial, mixerAgente, acciones)
{
  var agente = {
    tipo: tipo,
    modelo: modelo,
    mixer: mixerAgente,
    acciones: acciones,
    accion_actual: null,
    pos: new THREE.Vector3(
      Math.cos(anguloInicial) * (radio_plaza - 3),
      0,
      Math.sin(anguloInicial) * (radio_plaza - 3)
    ),
    angulo: Math.atan2(-Math.cos(anguloInicial), -Math.sin(anguloInicial)),   // mirando al centro
    angulo_inicial: Math.atan2(-Math.cos(anguloInicial), -Math.sin(anguloInicial)),
    velocity: new THREE.Vector3(0, 0, 1),
    estado: 'paseando',   // paseando, persiguiendo o aburrido
    tiempo_persiguiendo: 0,
    tiempo_aburrido: 0,
    direccion_giro: 1,
    frames_giro: 0,
    frames_hasta_cambio: 60,
    frames_quieto: 0,
    ancho: tipo.ancho,
    alcance: tipo.alcance,
    marcador: crearMarcador(color_marcador[tipo.nombre], 1.7),
    lista_obstaculos: objectsToCheckPerros
  };
  // los gatos pasan junto a los troncos
  if (tipo.sube_arboles)
    agente.lista_obstaculos = objectsToCheckGatos;
  agente.pos_inicial = agente.pos.clone();
  modelo.position.copy(agente.pos);
  scene.add(modelo);
  compilarShaders();
  perseguidores.push(agente);
  cambiarAnimacionAgente(agente, acciones.andar);
  return agente;
}

// carga un gato o un perro (como loadLightCycle del Tron)
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

      // escala segun la altura que queremos
      var box = new THREE.Box3().setFromObject(modelo);
      var size = new THREE.Vector3();
      box.getSize(size);
      var escala = tipo.altura / size.y;
      modelo.scale.set(escala, escala, escala);
      modelo.traverse(function(objeto) {
        if (objeto.isMesh) objeto.castShadow = true;
      });

      // clips (el perro corre con Gallop y el gato ataca con Headbutt)
      var mixerAgente = new THREE.AnimationMixer(modelo);
      var clipAndar = buscarClip(gltf.animations, 'Walk');
      var clipCorrer = buscarClip(gltf.animations, 'Run');
      if (clipCorrer === null)
        clipCorrer = buscarClip(gltf.animations, 'Gallop');
      var clipAtacar = buscarClip(gltf.animations, 'Attack');
      if (clipAtacar === null)
        clipAtacar = buscarClip(gltf.animations, 'Headbutt');
      var clipQuieto = buscarClip(gltf.animations, 'Idle_Eating');
      if (clipQuieto === null)
        clipQuieto = buscarClip(gltf.animations, 'Eating');

      var acciones = {
        andar: mixerAgente.clipAction(clipAndar),
        correr: mixerAgente.clipAction(clipCorrer),
        atacar: mixerAgente.clipAction(clipAtacar),
        quieto: mixerAgente.clipAction(clipQuieto)
      };
      console.log(nombreTipo + ' cargado');

      nuevoPerseguidor(tipo, modelo, anguloInicial, mixerAgente, acciones);
    },
    undefined,
    function(error) {
      console.error('No se pudo cargar el ' + nombreTipo, error);
    }
  );
}

// a salvo de este animal
function rataASalvoDe(agente)
{
  return rata_escondida || ((rata_en_arbol || rata_en_plataforma) && !agente.tipo.sube_arboles);
}

// en una alcantarilla o en un arbol
function rataOculta()
{
  return rata_escondida || rata_en_arbol;
}

// a salvo de las personas
function rataInalcanzable()
{
  return rataOculta() || rata_en_plataforma;
}

// saltando por encima del animal
function rataPorEncima(agente)
{
  return !en_suelo && pos_rata.y - agente.modelo.position.y > agente.tipo.altura_lomo;
}

// mueve un gato o un perro
function actualizarPerseguidor(agente, delta)
{
  var xAntes = agente.pos.x, zAntes = agente.pos.z;
  var haciaRata = hacia_rata_tmp.subVectors(pos_rata, agente.pos);
  haciaRata.y = 0;
  var distancia = haciaRata.length();
  var alturaModelo = 0;

  if (agente.estado === 'persiguiendo') {
    // pierde el rastro
    if (rataASalvoDe(agente)) {
      agente.estado = 'paseando';
      agente.frames_giro = 0;
      agente.tiempo_persiguiendo = 0;
    } else if (agente.tiempo_persiguiendo > segundos_max_persecucion) {
      // se aburre y se da la vuelta
      agente.estado = 'aburrido';
      agente.tiempo_aburrido = segundos_aburrido;
      agente.tiempo_persiguiendo = 0;
      agente.angulo += Math.PI * (0.7 + Math.random() * 0.6);
      agente.frames_giro = 0;
      aviso_aburrido = 2.5;
      texto_aburrido = 'Un ' + agente.tipo.nombre + ' se ha aburrido de perseguirte';
    } else {
      agente.tiempo_persiguiendo += delta;
      // esta rodeando un obstaculo
      if (agente.frames_giro > 0) {
        agente.angulo += agente.direccion_giro * giro_perseguidor * 1.5;
        agente.frames_giro--;
      } else {
        // gira hacia la rata
        var anguloObjetivo = Math.atan2(haciaRata.x, haciaRata.z);
        var diferencia = anguloObjetivo - agente.angulo;
        // entre -PI y PI para girar por el lado corto
        while (diferencia > Math.PI)
          diferencia -= 2 * Math.PI;
        while (diferencia < -Math.PI)
          diferencia += 2 * Math.PI;
        if (diferencia > giro_perseguidor)
          diferencia = giro_perseguidor;
        if (diferencia < -giro_perseguidor)
          diferencia = -giro_perseguidor;
        agente.angulo += diferencia;
        agente.velocity.set(Math.sin(agente.angulo), 0, Math.cos(agente.angulo));

        // si hay algo delante, lo rodea (sensores del Tron)
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

      // solo avanza si cabe
      if (distanciaLibreAncha(agente, agente.velocity, agente.lista_obstaculos) >
          agente.tipo.velocidad + agente.tipo.alcance)
        agente.pos.addScaledVector(agente.velocity, agente.tipo.velocidad);

      // el gato sube al arbol
      if (rata_en_arbol && agente.tipo.sube_arboles && arbol_actual !== null &&
          distanciaXZ(arbol_actual.pos, agente.pos.x, agente.pos.z) < radio_arbol + 0.5)
        alturaModelo = altura_subida_gato;

      // la atrapa, salvo que salte por encima
      if (distancia < distancia_atrapar) {
        if (rataPorEncima(agente)) {
          aviso_salto = 1.5;
          texto_salto = '¡Has saltado por encima de un ' + agente.tipo.nombre + '!';
        } else {
          terminarJuego('Te ha atrapado un ' + agente.tipo.nombre, agente);
        }
      }
    }
  } else if (agente.estado === 'aburrido') {
    // aburrido: quieto un rato y luego pasea
    agente.tiempo_aburrido -= delta;
    if (agente.tiempo_aburrido < segundos_aburrido - segundos_parado_aburrido)
      pasear(agente, agente.lista_obstaculos, agente.tipo.velocidad * 0.5, giro_perseguidor * 0.5);
    if (agente.tiempo_aburrido <= 0)
      agente.estado = 'paseando';
  } else {
    // ve a la rata
    if (!rataASalvoDe(agente) && distancia < agente.tipo.radio_vision && tiempo_partida > segundos_de_gracia) {
      agente.estado = 'persiguiendo';
      agente.tiempo_persiguiendo = 0;
    } else {
      pasear(agente, agente.lista_obstaculos, agente.tipo.velocidad * 0.5, giro_perseguidor * 0.5);
    }
  }

  // los gatos suben a las plataformas
  if (agente.tipo.sube_arboles)
    alturaModelo = Math.max(alturaModelo, alturaSuelo(agente.pos.x, agente.pos.z, agente.modelo.position.y, altura_escalon_gato));

  // parado a proposito no es un atasco
  var paradoAburrido = agente.estado === 'aburrido' &&
    agente.tiempo_aburrido >= segundos_aburrido - segundos_parado_aburrido;
  if (!paradoAburrido)
    comprobarAtasco(agente, xAntes, zAntes);

  agente.modelo.position.set(agente.pos.x, alturaModelo, agente.pos.z);
  agente.modelo.rotation.set(0, agente.angulo, 0);

  // animacion: correr, comer o andar
  if (!juego_terminado) {
    if (agente.estado === 'persiguiendo')
      cambiarAnimacionAgente(agente, agente.acciones.correr);
    else if (paradoAburrido)
      cambiarAnimacionAgente(agente, agente.acciones.quieto);
    else
      cambiarAnimacionAgente(agente, agente.acciones.andar);
  }
  agente.mixer.update(delta);
}

// 2- rata (loadLightCycle del Tron)
function loadRata()
{
  var loader = new THREE.GLTFLoader();

  loader.load(
    'models/rata/Rat by Quaternius - iltq5bVNaV.glb',
    function(gltf) {
      rata = gltf.scene;
      rata.position.copy(pos_rata);
      rata.scale.set(escala_rata, escala_rata, escala_rata);

      rata.traverse(function(objeto) {
        if (objeto.isMesh) {
          objeto.castShadow = true;
        }
      });
      scene.add(rata);
      compilarShaders();

      // animaciones (ej-mixamo.js)
      mixer = new THREE.AnimationMixer(rata);
      gltf.animations.forEach(function(clip) {
        var nombre = clip.name.split('_').pop();   // "Rat_Idle" -> "Idle"
        acciones_rata[nombre] = mixer.clipAction(clip);
      });
      // la muerte solo una vez
      if (acciones_rata['Death'] !== undefined) {
        acciones_rata['Death'].setLoop(THREE.LoopOnce);
        acciones_rata['Death'].clampWhenFinished = true;
      }
      console.log('Animaciones de la rata:', Object.keys(acciones_rata));
      cambiarAnimacionRata('Idle');

      // ya se puede empezar
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

// cambia de animacion (ej-mixamo.js)
function cambiarAnimacionRata(nombre)
{
  if (accion_actual === acciones_rata[nombre] || acciones_rata[nombre] === undefined)
    return;

  if (accion_actual !== null)
    accion_actual.stop();

  accion_actual = acciones_rata[nombre];
  accion_actual.play();
}

// lo mismo para personas y animales
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
        accion_patada: null,
        accion_golpe: null,
        accion_actual: null,
        estado: 'paseando',
        tiempo_patada: 0,
        impacto_comprobado: false,
        frames_acercando: 0,
        frames_descanso: 0,
        direccion_giro: 1,
        frames_giro: 0,
        frames_hasta_cambio: 90,
        frames_quieto: 0,
        ancho: 0.3,
        alcance: 0.5,
        colisionador: crearColisionador(0.5, altura_persona),
        marcador: crearMarcador(color_marcador.persona, 1.7)
      };

      // escala segun su altura (ej-loader.js)
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

      // clips: andar, patada y punetazo
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
      // todos chocan con las personas
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

// distancia al primer obstaculo (distanciaLibreIA del Tron)
function distanciaLibre(agente, direccion, lista)
{
  origen_rayo_ia.copy(agente.pos);
  origen_rayo_ia.y = agente.modelo.position.y + 0.35;
  raycaster_ia.set(origen_rayo_ia, direccion);

  const impactos = raycaster_ia.intersectObjects(lista, true);
  var distancia = Infinity;
  for (var i = 0; i < impactos.length; i++) {
    // sin contar su propio cilindro
    if (impactos[i].object !== agente.colisionador) {
      distancia = impactos[i].distance;
      break;
    }
  }
  return Math.min(distancia, distanciaAlBorde(origen_rayo_ia, direccion));
}

// distancia hasta el borde de la plaza (rayo y circunferencia)
function distanciaAlBorde(punto, direccion)
{
  var R = radio_plaza - 0.3;
  var b = punto.x * direccion.x + punto.z * direccion.z;
  var c = punto.x * punto.x + punto.z * punto.z - R * R;
  var discriminante = b * b - c;
  if (discriminante < 0)
    return Infinity;
  return -b + Math.sqrt(discriminante);
}

// si lleva un rato sin moverse, da media vuelta
function comprobarAtasco(agente, xAntes, zAntes)
{
  if (Math.abs(agente.pos.x - xAntes) + Math.abs(agente.pos.z - zAntes) < 0.0001)
    agente.frames_quieto++;
  else
    agente.frames_quieto = 0;

  if (agente.frames_quieto > 40) {
    agente.angulo += Math.PI * (0.7 + Math.random() * 0.6);
    agente.frames_giro = 0;
    agente.frames_quieto = 0;
  }
}

// tres rayos (centro y lados), el mas corto
const lateral_rayo_ia = new THREE.Vector3();
const centro_agente_tmp = new THREE.Vector3();
function distanciaLibreAncha(agente, direccion, lista)
{
  var minima = Infinity;
  centro_agente_tmp.copy(agente.pos);
  lateral_rayo_ia.set(direccion.z, 0, -direccion.x).multiplyScalar(agente.ancho);
  for (var lado = -1; lado <= 1; lado++) {
    agente.pos.copy(centro_agente_tmp).addScaledVector(lateral_rayo_ia, lado);
    minima = Math.min(minima, distanciaLibre(agente, direccion, lista));
  }
  agente.pos.copy(centro_agente_tmp);
  return minima;
}

// paseo al azar esquivando cosas (IA del Tron)
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

  // cambio de rumbo al azar
  agente.frames_hasta_cambio--;
  if (agente.frames_giro === 0 && agente.frames_hasta_cambio <= 0) {
    agente.direccion_giro = 1;
    if (Math.random() < 0.5)
      agente.direccion_giro = -1;
    agente.frames_giro = 15 + Math.floor(Math.random() * 40);
    agente.frames_hasta_cambio = 90 + Math.floor(Math.random() * 150);
  }

  if (agente.frames_giro > 0) {
    agente.angulo += agente.direccion_giro * giro;
    agente.frames_giro--;
    agente.velocity.set(Math.sin(agente.angulo), 0, Math.cos(agente.angulo));
    distancia_frente = distanciaLibre(agente, agente.velocity, lista);
  }

  // solo avanza si cabe
  if (distanciaLibreAncha(agente, agente.velocity, lista) > velocidad + agente.alcance)
    agente.pos.addScaledVector(agente.velocity, velocidad);
}

function actualizarPersona(persona, delta)
{
  var xAntes = persona.pos.x, zAntes = persona.pos.z;
  var haciaRata = hacia_rata_tmp.subVectors(pos_rata, persona.pos);
  haciaRata.y = 0;
  var distancia = haciaRata.length();

  // chocar con una persona
  if (!rataInalcanzable() && !juego_terminado && distancia < distancia_atrapar_persona) {
    persona.angulo = Math.atan2(haciaRata.x, haciaRata.z);
    cambiarAnimacionAgente(persona, persona.accion_golpe);
    terminarJuego('Te ha pillado una persona', persona);
  }

  // patada
  if (persona.estado === 'pateando') {
    persona.tiempo_patada += delta;

    // momento del golpe
    if (!persona.impacto_comprobado && persona.tiempo_patada >= momento_impacto_patada) {
      persona.impacto_comprobado = true;
      if (!rataInalcanzable() && distancia < alcance_patada)
        terminarJuego('Te ha dado una patada', persona);
    }

    if (persona.tiempo_patada >= persona.accion_patada.getClip().duration) {
      persona.estado = 'paseando';
      persona.frames_descanso = 90;
      cambiarAnimacionAgente(persona, persona.accion_andar);
    }
  } else if (persona.estado === 'acercando') {
    // va hacia la rata
    persona.frames_acercando++;

    if (rataInalcanzable() || juego_terminado || distancia > radio_vision_persona * 1.6 ||
        persona.frames_acercando > frames_maximos_acercando) {
      persona.estado = 'paseando';
      persona.frames_descanso = 60;
    } else {
      persona.angulo = Math.atan2(haciaRata.x, haciaRata.z);
      persona.velocity.set(Math.sin(persona.angulo), 0, Math.cos(persona.angulo));

      if (distancia > alcance_patada * 0.8) {
        var paso = velocidad_persona * 1.5;
        if (distanciaLibreAncha(persona, persona.velocity, objectsToCheckIA) > paso + persona.alcance)
          persona.pos.addScaledVector(persona.velocity, paso);
      } else {
        persona.estado = 'pateando';
        persona.tiempo_patada = 0;
        persona.impacto_comprobado = false;
        cambiarAnimacionAgente(persona, persona.accion_patada);
      }
    }
  } else {
    // ve a la rata si esta cerca y delante (producto escalar, tema 1)
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
    brilloEscondite(escondite, dentro, 0x33ff88, Math.sin(clock.elapsedTime * 3 + i));
  }

  // 7b- arboles
  rata_en_arbol = false;
  arbol_actual = null;
  for (var j = 0; j < arboles.length; j++) {
    var arbol = arboles[j];
    var subida = en_suelo && pos_rata.y < 0.1 && !rata_escondida && distanciaXZ(arbol.pos, pos_rata.x, pos_rata.z) < radio_arbol;
    if (subida) {
      rata_en_arbol = true;
      arbol_actual = arbol;
    }
    brilloEscondite(arbol, subida, 0xffb347, Math.sin(clock.elapsedTime * 3 + j));
  }
}

// brillo que late (blanco si la rata esta dentro)
function brilloEscondite(escondite, rataDentro, color, onda)
{
  var tamanoHalo = 3.0 + 0.6 * onda;
  escondite.halo.scale.set(tamanoHalo, tamanoHalo, 1);

  if (rataDentro) {
    color = 0xffffff;
    escondite.anillo.material.opacity = 0.9;
    escondite.haz.material.opacity = 0.6;
  } else {
    escondite.anillo.material.opacity = 0.35 + 0.2 * onda;
    escondite.haz.material.opacity = 0.25 + 0.12 * onda;
  }
  escondite.anillo.material.color.set(color);
  escondite.halo.material.color.set(color);
  escondite.haz.material.color.set(color);
}

// 9- fin de la partida
function terminarJuego(motivo, atacante)
{
  if (juego_terminado)
    return;

  juego_terminado = true;
  cambiarAnimacionRata('Death');
  // gesto de ataque
  if (atacante !== undefined && atacante.acciones !== undefined)
    cambiarAnimacionAgente(atacante, atacante.acciones.atacar);
  // 10- guardar el record
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

  // online
  document.getElementById('puesto').textContent = 'Guardando en la tabla online...';
  enviarRecordOnline(nombre_partida, quesos_recogidos, segundos)
    .then(function(fila) {
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
  var texto = 'No entras en el top ' + max_records + ' ' + tabla + '. ¡Otra vez!';
  if (puesto > 0)
    texto = '¡Puesto ' + puesto + ' en la tabla ' + tabla + '!';
  document.getElementById('puesto').textContent = texto;
}

// 10- records en el navegador (localStorage)
function leerRecords()
{
  try {
    var texto = localStorage.getItem(clave_records);
    if (texto === null)
      return [];
    return JSON.parse(texto);
  } catch (error) {
    return [];
  }
}

// mas quesos primero; si empatan, mas tiempo
function compararRecords(a, b)
{
  if (b.quesos !== a.quesos)
    return b.quesos - a.quesos;
  return b.segundos - a.segundos;
}

// guarda la partida y devuelve el puesto (0 si no entra)
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
  if (resto < 10)
    return minutos + ':0' + resto;
  return minutos + ':' + resto;
}

// 10b- records online (Supabase, con fetch)
function recordsOnline()
{
  return SUPABASE_URL !== '' && SUPABASE_CLAVE !== '';
}

function cabecerasSupabase()
{
  return { 'apikey': SUPABASE_CLAVE, 'Content-Type': 'application/json' };
}

// las diez mejores
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

// guarda una partida
function enviarRecordOnline(nombre, quesos, segundos)
{
  var cabeceras = cabecerasSupabase();
  cabeceras['Prefer'] = 'return=representation';   // devuelve la fila

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

// tabla del menu (online o del navegador)
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

// rellena la tabla (textContent, nunca innerHTML)
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

  if (records.length > 0) {
    document.getElementById('tabla_records').style.display = 'table';
    document.getElementById('sin_records').style.display = 'none';
  } else {
    document.getElementById('tabla_records').style.display = 'none';
    document.getElementById('sin_records').style.display = 'block';
  }
}

// 10- menu
function prepararMenu()
{
  try {
    var nombreGuardado = localStorage.getItem(clave_nombre);
    if (nombreGuardado !== null)
      document.getElementById('nombre').value = nombreGuardado;
  } catch (error) { }
  mostrarRecords();

  document.getElementById('form_menu').addEventListener('submit', function(event) {
    event.preventDefault();   // que no recargue la pagina
    empezarPartida();
  });
  document.getElementById('volver_menu').addEventListener('click', function() {
    location.reload();
  });
}

function empezarPartida()
{
  if (rata === null)
    return;

  // nombre de la partida (16 letras como mucho)
  nombre_partida = document.getElementById('nombre').value.trim().slice(0, 16);
  if (nombre_partida === '')
    nombre_partida = 'Rata anonima';
  try {
    localStorage.setItem(clave_nombre, nombre_partida);
  } catch (error) { }

  // todos vuelven a su sitio
  for (var i = 0; i < personas.length; i++) {
    personas[i].pos.copy(personas[i].pos_inicial);
    personas[i].angulo = personas[i].angulo_inicial;
    personas[i].estado = 'paseando';
  }
  for (var j = 0; j < perseguidores.length; j++) {
    perseguidores[j].pos.copy(perseguidores[j].pos_inicial);
    perseguidores[j].angulo = perseguidores[j].angulo_inicial;
    perseguidores[j].estado = 'paseando';
    perseguidores[j].tiempo_persiguiendo = 0;
    perseguidores[j].tiempo_aburrido = 0;
  }

  tiempo_partida = 0;
  tiempo_restante = tiempo_inicial;
  camara_spring_iniciada = false;   // la camara se coloca de golpe
  document.activeElement.blur();   // que Espacio no pulse el boton
  document.getElementById('menu').style.display = 'none';
  partida_iniciada = true;
}

// fondo del menu: la camara da vueltas a la plaza
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
    var y = 0;
    if (agente.tipo.sube_arboles)
      y = alturaSuelo(agente.pos.x, agente.pos.z, agente.modelo.position.y, altura_escalon_gato);
    agente.modelo.position.set(agente.pos.x, y, agente.pos.z);
    agente.modelo.rotation.set(0, agente.angulo, 0);
    agente.mixer.update(delta);
  }

  if (mixer !== null) mixer.update(delta);
}

// 9- HUD
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
  else if (aviso_salto > 0)
    estado = texto_salto;
  else if (aviso_aburrido > 0 && perseguidorCerca === null)
    estado = texto_aburrido + '. ¡Aprovecha!';
  else if (perseguidorCerca === 'perro')
    estado = '¡Un perro te persigue! Saltale por encima, sube a algo alto o a un arbol, o baja a una alcantarilla';
  else if (perseguidorCerca === 'gato')
    estado = '¡Un gato te persigue! Saltale por encima o baja a una alcantarilla (verde)';
  else
    estado = 'Recoge los quesos. Verde: alcantarilla. Naranja: arbol.';

  document.getElementById('marcador_quesos').textContent = 'Quesos: ' + quesos_recogidos;
  document.getElementById('estado').textContent = estado;

  // reloj: verde con +5 s y rojo al final
  var reloj = document.getElementById('reloj');
  reloj.textContent = 'Tiempo: ' + tiempo_restante.toFixed(1) + ' s';
  reloj.style.color = '#ffffff';
  if (aviso_bonus > 0) {
    reloj.textContent += '  +' + tiempo_por_queso + ' s';
    reloj.style.color = '#4cff7a';
  } else if (tiempo_restante < 5 && Math.floor(tiempo_restante * 4) % 2 === 0) {
    reloj.style.color = '#ff4444';
  }

  var barra = document.getElementById('energia_barra');
  barra.style.width = (energia_dash * 100) + '%';
  if (dash_activo || energia_dash >= energia_minima_dash)
    barra.style.background = '#4cff7a';
  else
    barra.style.background = '#ff9f3c';
}

function updateAspectRatio()
{
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

// muelle amortiguado (Tron)
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

// camara en tercera persona (Tron); en un escondite sube y se aleja
function updateCamera(delta)
{
  var vigia = rataOculta();
  var distancia = distancia_camara;
  var altura = altura_camara;
  var fovObjetivo = fov_normal;
  if (vigia) {
    distancia = distancia_camara_escondite;
    altura = altura_camara_escondite;
    fovObjetivo = fov_escondite;
  }

  posicion_objetivo_camara
    .copy(rata.position)
    .addScaledVector(velocity, -distancia);
  posicion_objetivo_camara.y += altura;

  mirada_objetivo_camara.copy(rata.position);
  if (vigia)
    mirada_objetivo_camara.addScaledVector(velocity, adelanto_mirada_escondite);
  else
    mirada_objetivo_camara.y += desfase_lookat_y;

  // cambia el fovy poco a poco (tema 3)
  if (Math.abs(camera.fov - fovObjetivo) > 0.05) {
    camera.fov += (fovObjetivo - camera.fov) * (1 - Math.exp(-4 * delta));
    camera.updateProjectionMatrix();
  }

  // la primera vez se coloca directamente
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

// C: camara orbital (Tron)
function cambiarCamara()
{
  camara_orbital = !camara_orbital;
  cameraControls.enabled = camara_orbital;

  if (camara_orbital && rata !== null) {
    cameraControls.target.copy(rata.position);
    cameraControls.update();
  } else if (rata !== null) {
    velocidad_camara.set(0, 0, 0);
    velocidad_mirada_camara.set(0, 0, 0);
    mirada_actual_camara.copy(cameraControls.target);
    camara_spring_iniciada = true;
  }

  console.log(camara_orbital ? 'Camara orbital' : 'Camara en tercera persona');
}

// P: pausa (Tron)
function cambiarPausa()
{
  juego_pausado = !juego_pausado;

  if (juego_pausado !== camara_orbital)
    cambiarCamara();

  controls.moveForward = false;
  controls.moveBackward = false;
  controls.moveLeft = false;
  controls.moveRight = false;
  controls.run = false;

  console.log(juego_pausado ? 'Juego pausado' : 'Juego reanudado');
}

// ajuste de la camara con las teclas (Tron)
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
  // Limitamos el delta para evitar saltos bruscos
  var delta = Math.min(clock.getDelta(), 0.05);

  // pausa
  if (juego_pausado) {
    cameraControls.update();
    return;
  }

  if (rata === null)
    return;

  // menu
  if (!partida_iniciada) {
    animarMenu(delta);
    return;
  }

  // fin de la partida: solo se mueven la camara y los gestos
  if (juego_terminado) {
    if (mixer !== null) mixer.update(delta);
    for (var i = 0; i < personas.length; i++)
      personas[i].mixer.update(delta);
    for (var j = 0; j < perseguidores.length; j++)
      perseguidores[j].mixer.update(delta);
    if (camara_orbital)
      cameraControls.update();
    else
      updateCamera(delta);
    return;
  }

  if (agua_fuente !== null)
    agua_fuente.rotation.z += 0.2 * delta;

  // tiempo limite
  tiempo_partida += delta;
  if (aviso_bonus > 0)
    aviso_bonus -= delta;
  if (aviso_aburrido > 0)
    aviso_aburrido -= delta;
  if (aviso_salto > 0)
    aviso_salto -= delta;
  if (tiempo_partida > segundos_de_gracia) {
    tiempo_restante -= delta;
    if (tiempo_restante <= 0) {
      tiempo_restante = 0;
      terminarJuego('Se ha acabado el tiempo');
      actualizarHUD();
      return;
    }
  }

  // 7- escondites
  actualizarEscondites(delta);

  // 5- personas y 8- perseguidores
  for (var i = 0; i < personas.length; i++) {
    actualizarPersona(personas[i], delta);
    personas[i].mixer.update(delta);
  }
  for (var i = 0; i < perseguidores.length; i++) {
    actualizarPerseguidor(perseguidores[i], delta);
  }

  if (juego_terminado) {
    actualizarHUD();
    return;
  }

  // 6- quesos
  actualizarQuesos(delta);

  // 3- movimiento
  if (modo_tunear_camara) {
    tunearCamara();
  } else {
    if (controls.moveLeft) angulo += 0.05;
    if (controls.moveRight) angulo -= 0.05;
  }

  // Calcular el vector de direccion de vista
  velocity.set(Math.sin(angulo), 0, Math.cos(angulo));

  // dash
  var speed = actualizarDash(delta);
  var moviendo = false;

  if (!modo_tunear_camara && (controls.moveForward || controls.moveBackward)) {
    // 4- colisiones (s3-colisiones.js)
    var direccion = velocity.clone();
    var margen = 0.6;
    if (controls.moveBackward && !controls.moveForward) {
      direccion.negate();
      speed = controls.speed;   // hacia atras siempre despacio
      margen = 1.0;
    }

    // Si no hay nada delante, permitir el movimiento
    if (caminoLibreRata(direccion, speed + margen)) {
      pos_rata.add(direccion.multiplyScalar(speed));
      moviendo = true;
    }
  }

  // salto y plataformas
  actualizarAlturaRata(delta);
  rata_en_plataforma = en_suelo && pos_rata.y > 0.25;

  // animacion de la rata
  if (!en_suelo)
    cambiarAnimacionRata('Jump');
  else if (moviendo && dash_activo)
    cambiarAnimacionRata('Run');
  else if (moviendo)
    cambiarAnimacionRata('Walk');
  else
    cambiarAnimacionRata('Idle');

  // en la alcantarilla baja y en el arbol sube
  rata.position.copy(pos_rata);
  if (rata_escondida)
    rata.position.y -= profundidad_escondite;
  if (rata_en_arbol)
    rata.position.y += altura_subida_rata;
  actualizarInclinacion(delta);

  actualizarHUD();

  // camara activa
  if (camara_orbital) {
    cameraControls.update();
  } else {
    updateCamera(delta);
  }

  if (mixer !== null) mixer.update(delta);
}

// minimapa: radar o mapa completo
function updateCameraTop()
{
  var radar = modo_radar && partida_iniciada;   // en el menu, mapa completo

  var alcance = alcance_hud;
  if (radar)
    alcance = alcance_radar;
  // tamano de la camara ortografica (tema 3)
  if (alcance !== alcance_mapa_actual) {
    cameraTop.left = -alcance / 2;
    cameraTop.right = alcance / 2;
    cameraTop.top = alcance / 2;
    cameraTop.bottom = -alcance / 2;
    cameraTop.updateProjectionMatrix();
    alcance_mapa_actual = alcance;
  }

  // el radar gira con la rata (up = su direccion)
  if (radar) {
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

  // vista 3d perspectiva
  renderer.shadowMap.needsUpdate = true;
  renderer.autoClear = false;
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
  renderer.setClearColor(new THREE.Color(0x000000));
  renderer.clear();
  renderer.render(scene, camera);

  // vista de arriba (HUD) (s3-cam2.js)
  var ds = Math.floor(Math.min(window.innerHeight, window.innerWidth) / 3.2);
  var x = window.innerWidth - ds - 10;
  var y = 10;
  renderer.setViewport(x, y, ds, ds);
  renderer.setScissor(x, y, ds, ds);
  renderer.setScissorTest(true);
  renderer.setClearColor(new THREE.Color(0x202020));
  renderer.clear();
  actualizarMarcadores(radar);
  renderer.render(scene, cameraTop);
  renderer.setScissorTest(false);

  // marco del minimapa
  if (ds !== lado_mapa_actual) {
    var marco = document.getElementById('marco_mapa');
    marco.style.width = ds + 'px';
    marco.style.height = ds + 'px';
    document.getElementById('leyenda').style.bottom = (ds + 16) + 'px';
    lado_mapa_actual = ds;
  }
  // texto del minimapa
  var texto = 'MAPA (M cambia)';
  if (radar)
    texto = 'RADAR (M cambia)';
  var cercano = distanciaQuesoMasCercano();
  if (cercano < Infinity)
    texto += ' · queso a ' + Math.round(cercano) + ' m';
  document.getElementById('texto_mapa').textContent = texto;
}
