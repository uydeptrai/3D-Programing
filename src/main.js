import * as THREE from "three";
import { OrbitControls} from '../threejs/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from '../threejs/examples/jsm/loaders/GLTFLoader.js';
import GUI from '../threejs/examples/jsm/libs/lil-gui.module.min.js';

import * as CANNON from "../cannonjs/cannon-es.js";
import CannonDebugger from "../cannonjs/cannon-es-debugger.js";

let elThreejs = document.getElementById("threejs");
let camera,scene,renderer;

// helpers to debug
let axesHelper;
let controls;
let gui;
let audio = {};
// show and move cube
let cubeThree;
let keyboard = {};

// camera follow player
let enableFollow = true;

// cannon variables
let world;
let cannonDebugger;
let timeStep = 1 / 60;
let cubeBody, planeBody, wallBody;
let slipperyMaterial, groundMaterial;
let obstacleBody;
let obstaclesBodies = [];
let obstaclesMeshes = [];
let obstacles;
init();
 
async function init() {
  
  // Scene
	scene = new THREE.Scene();

  // Camera
	camera = new THREE.PerspectiveCamera(
		75,
		window.innerWidth / window.innerHeight,
		0.1,
		1000
	);
  camera.position.z = 10;
  camera.position.y = 5;


  // render
	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.shadowMap.enabled = true;
	renderer.outputEncoding = THREE.sRGBEncoding;

  const ambient = new THREE.HemisphereLight(0xffffbb, 0x080820);
  scene.add(ambient);

  const light = new THREE.DirectionalLight(0xFFFFFF, 1);
  light.position.set( 1, 10, 6);
  scene.add(light);


  // axesHelper
	// axesHelper = new THREE.AxesHelper( 100 );
	// scene.add( axesHelper );

  // orbitControls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.rotateSpeed = 2.0
  controls.zoomSpeed = 1.2
  controls.enablePan = false
  controls.dampingFactor = 0.2
  controls.minDistance = 100
  controls.maxDistance = 500
  controls.enabled = false

	elThreejs.appendChild(renderer.domElement);

  initCannon();

  addBackground();

  addPlaneBody();
  addPlane();

  addCubeBody();
  await addCube();
  addWall();
  addWallMesh();
  addObstacleBody();
  addObstacle();
  addSphereObstacleBody();
  addSphereObstacle();
  addContactMaterials();

  addKeysListener();
	addGUI();

  animate();

}

document.getElementById("closeButton").addEventListener("click", function() {
  document.getElementById("popup").style.display = "none";
});
document.getElementById("popup").innerHTML += `
    <button id="restartButton">Restart Game</button>
`;
document.addEventListener("DOMContentLoaded", function() {
  const backgroundMusic = document.getElementById("backgroundMusic");
  const musicButton = document.getElementById("musicButton");

  musicButton.addEventListener("click", function() {
      if (backgroundMusic.paused) {
          backgroundMusic.play(); // Phát nhạc nền
          musicButton.textContent = "Tắt nhạc";
      } else {
          backgroundMusic.pause(); // Tạm dừng nhạc nền
          musicButton.textContent = "Mở nhạc";
      }
  });
});
document.addEventListener("DOMContentLoaded", function() {
  const musicButton = document.getElementById("musicButton");

  let audioContext = null;
  let source = null;
  let isPlaying = false;

  function initAudioContext() {
      if (audioContext === null) {
          audioContext = new AudioContext();
      }
  }

  function playAudio() {
      initAudioContext();
      fetch("src/assets/audio.mp3")
          .then(response => response.arrayBuffer())
          .then(buffer => audioContext.decodeAudioData(buffer))
          .then(audioBuffer => {
              source = audioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(audioContext.destination);
              source.loop = true;
              source.start(0);
              isPlaying = true;
              musicButton.textContent = "Tắt nhạc";
          });
  }

  function stopAudio() {
      if (source) {
          source.stop();
          isPlaying = false;
          musicButton.textContent = "Mở nhạc";
      }
  }

  musicButton.addEventListener("click", function() {
      if (!isPlaying) {
          playAudio();
      } else {
          stopAudio();
      }
  });
});




const roadWidth = 10; // Đặt giá trị mong muốn của roadWidth
const offset = 10; // Đặt giá trị mong muốn của offset

document.getElementById("restartButton").addEventListener("click", function() {
  // Đặt lại vị trí của cube
  cubeBody.position.set(0, 2, 0);

  // Đặt lại vị trí của các vật cản
  for (let i = 0; i < obstaclesBodies.length; i++) {
      const obstacleBody = obstaclesBodies[i];
      const posX = Math.random() * roadWidth - roadWidth / 2;
      const posY = Math.random() * 5 + 5;
      const posZ = -i * 15 - offset;
      obstacleBody.position.set(posX, posY, posZ);
  }



  // Tải lại trang
  window.location.reload();
});
document.addEventListener("DOMContentLoaded", function() {
  const menu = document.getElementById("menu");
  const startButton = document.getElementById("startButton");
  const restartButton = document.getElementById("restartButton");

  startButton.addEventListener("click", function() {
      menu.style.display = "none"; // Ẩn menu khi bắt đầu game
      // Thêm mã để bắt đầu game ở đây
  });

  restartButton.addEventListener("click", function() {
      // Thêm mã để reset lại trang hoặc game ở đây
  });
});
// document.getElementById("popup").innerHTML += `
//     <button id="restartButton">Restart</button>
// `;

// document.getElementById("popup").innerHTML = `
//     <p>Bạn đã thất bại!</p>
//     <button id="restartButton">Restart</button>
// `;

// Thêm sự kiện cho nút "Restart" để reload lại trang
// document.getElementById("restartButton").addEventListener("click", function() {
//     window.location.reload();
// });



function animate() {
  renderer.render(scene, camera);

  movePlayer();

  if (enableFollow) followPlayer();

  world.step(timeStep);
  cannonDebugger.update();

  cubeThree.position.copy(cubeBody.position);
  cubeThree.position.y = cubeBody.position.y - 1.3;
  cubeThree.quaternion.copy(cubeBody.quaternion);

  for (let i = 0; i < obstaclesBodies.length; i++) {
      obstaclesMeshes[i].position.copy(obstaclesBodies[i].position);
      obstaclesMeshes[i].quaternion.copy(obstaclesBodies[i].quaternion);
  }

  // Check for collision between cubeBody and wallBody
  const contacts = world.contacts;
  for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      const bodyA = contact.bi;
      const bodyB = contact.bj;
  
      if ((bodyA === cubeBody && bodyB === wallBody) || (bodyB === cubeBody && bodyA === wallBody)) {
          // Player collided with the wall, show popup
          document.getElementById("popup").style.display = "block";
      }
  }
  if (cubeBody.position.y < -5) { // Điều kiện rơi khỏi đường
    // Hiển thị popup
    // document.getElementById("popup2").style.display = "block";
    window.location.reload();
}

  requestAnimationFrame(animate);
}
function addWall() {
  const wallShape = new CANNON.Box(new CANNON.Vec3(10, 10, 0.1)); // Adjust dimensions as needed
  wallBody = new CANNON.Body({ mass: 0 });
  wallBody.addShape(wallShape);
  wallBody.position.set(0, 5, -150); // Adjust position as needed
  world.addBody(wallBody);


}
function addWallMesh() {
  // Tải ảnh vào Texture
  const texture = new THREE.TextureLoader().load( "./src/assets/finish.jpg" );

  // Tạo Material sử dụng Texture
  const material = new THREE.MeshBasicMaterial({ map: texture });

  // Tạo Geometry của tường
  const geometry = new THREE.BoxGeometry(10, 10, 0.1); // Thay đổi kích thước tùy ý

  // Áp dụng Material vào Geometry để tạo Mesh
  const wallMesh = new THREE.Mesh(geometry, material);

  // Đặt vị trí của tường
  wallMesh.position.set(0, 5, -150); // Thay đổi vị trí tùy ý

  // Thêm tường vào scene
  scene.add(wallMesh);
}




function addCubeBody(){
  let cubeShape = new CANNON.Box(new CANNON.Vec3(1,1.3,2));
  slipperyMaterial = new CANNON.Material('slippery');
  cubeBody = new CANNON.Body({ mass: 50,material: slipperyMaterial });
  cubeBody.addShape(cubeShape, new CANNON.Vec3(0,0,-1));

  const polyhedronShape = createCustomShape()
  cubeBody.addShape(polyhedronShape, new CANNON.Vec3(-1, -1.3, 1));

  // change rotation
  cubeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 180 * 180);
  
  cubeBody.position.set(0, 2, 0);

  cubeBody.linearDamping = 0.5;

  world.addBody(cubeBody);
  
}

async function addCube(){
  // let geometry = new THREE.BoxGeometry(2,2,2);
  // let material = new THREE.MeshBasicMaterial({color: 'pink'});
  // cubeThree = new THREE.Mesh(geometry, material);
  // cubeThree.position.set(0, 1, 0);
  // console.log(cubeThree, "cube");
  // scene.add(cubeThree);

  const gltfLoader = new GLTFLoader().setPath( 'src/assets/' );
	const carLoaddedd = await gltfLoader.loadAsync( 'scene.glb' );

	cubeThree = carLoaddedd.scene.children[0];
  scene.add(cubeThree);
  

}


function addPlaneBody(){
  groundMaterial = new CANNON.Material('ground')
  const planeShape = new CANNON.Box(new CANNON.Vec3(10, 0.01, 100));
	planeBody = new CANNON.Body({ mass: 0, material: groundMaterial });
	planeBody.addShape(planeShape);
	planeBody.position.set(0, 0, -90);
	world.addBody(planeBody);
  const wallShape = new CANNON.Box(new CANNON.Vec3(10, 10, 0.1));
// const wallBody = new CANNON.Body({ mass: 0, material: groundMaterial });
// wallBody.addShape(wallShape);
// wallBody.position.set(0, 5, -190); // Position at the end of the plane
// world.addBody(wallBody);

}



function addPlane(){
  const texture = new THREE.TextureLoader().load( "src/assets/plane2.png" );

  let geometry =  new THREE.BoxGeometry(25, 0, 200);
  let material = new THREE.MeshBasicMaterial({map: texture});
  let planeThree = new THREE.Mesh(geometry, material);
  planeThree.position.set(0, 0, -90);
  scene.add(planeThree);
  const wallGeometry = new THREE.BoxGeometry(10, 10, 0.1);
// const wallMaterial = new THREE.MeshBasicMaterial({ map: texture });
// const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
// wallMesh.position.set(0, 5, -190);
// scene.add(wallMesh);

}



function addSphereObstacleBody() {
  for (let i = 0; i < 10; i++) {
      let obstacleShape = new CANNON.Sphere(1);
      
      obstacleBody = new CANNON.Body({ mass: 1 });
      obstacleBody.addShape(obstacleShape);

      // Set positions along a road-like path
      const roadWidth = 10;
      const offset = 5;
      const posX = Math.random() * roadWidth - roadWidth / 2;
      const posY = Math.random() * 5 + 5;
      const posZ = -i * 15 - offset;

      obstacleBody.position.set(posX, posY, posZ);
      world.addBody(obstacleBody);
      obstaclesBodies.push(obstacleBody);
  }
}

function addSphereObstacle() {
  let geometry = new THREE.SphereGeometry(1, 16, 16);

  // Specify the color you want
  const color = new THREE.Color(0xff0000); // Red color, replace with your desired color

  let material = new THREE.MeshBasicMaterial({ color: color });

  for (let i = 0; i < 10; i++) {
      let obstacleMesh = new THREE.Mesh(geometry, material);

      // Set positions along a road-like path
      const roadWidth = 10;
      const offset = 5;
      const posX = Math.random() * roadWidth - roadWidth / 2;
      const posY = Math.random() * 5 + 5;
      const posZ = -i * 15 - offset;

      obstacleMesh.position.set(posX, posY, posZ);
      scene.add(obstacleMesh);
      obstaclesMeshes.push(obstacleMesh);
  }
}




function addObstacleBody() {
  for (let i = 0; i < 10; i++) {
      let obstacleShape = new CANNON.Box(new CANNON.Vec3(1, 1, 1));
      obstacleBody = new CANNON.Body({ mass: 1 });
      obstacleBody.addShape(obstacleShape);

      // Set positions along a road-like path
      const roadWidth = 10;
      const offset = 5;
      const posX = Math.random() * roadWidth - roadWidth / 2;
      const posY = Math.random() * 5 + 5;
      const posZ = -i * 15 - offset;

      obstacleBody.position.set(posX, posY, posZ);
      world.addBody(obstacleBody);
      obstaclesBodies.push(obstacleBody);
  }
}

function addObstacle() {
  let geometry = new THREE.BoxGeometry(2, 2, 2);
  const texture = new THREE.TextureLoader().load("src/assets/obstacle.png");

  let material = new THREE.MeshBasicMaterial({ map: texture });

  for (let i = 0; i < 10; i++) {
      let obstacleMesh = new THREE.Mesh(geometry, material);

      // Set positions along a road-like path
      const roadWidth = 10;
      const offset = 5;
      const posX = Math.random() * roadWidth - roadWidth / 2;
      const posY = Math.random() * 5 + 5;
      const posZ = -i * 15 - offset;

      obstacleMesh.position.set(posX, posY, posZ);
      scene.add(obstacleMesh);
      obstaclesMeshes.push(obstacleMesh);
  }
}



function addContactMaterials(){
  const slippery_ground = new CANNON.ContactMaterial(groundMaterial, slipperyMaterial, {
    friction: 0.00,
    restitution: 0.1, //bounciness
    contactEquationStiffness: 1e8,
    contactEquationRelaxation: 3,
  })

  // We must add the contact materials to the world
  world.addContactMaterial(slippery_ground)

}


function addKeysListener(){
  window.addEventListener('keydown', function(event){
    keyboard[event.keyCode] = true;
  } , false);
  window.addEventListener('keyup', function(event){
    keyboard[event.keyCode] = false;
  } , false);
}

function movePlayer(){

  // up letter W
  // if(keyboard[87]) cubeThree.position.z -= 0.1
  // if(keyboard[87]) cubeThree.translateZ(-0.1);

  const strengthWS = 500;
  const forceForward = new CANNON.Vec3(0, 0, strengthWS)
  if(keyboard[87]) cubeBody.applyLocalForce(forceForward);

  // down letter S
  const forceBack = new CANNON.Vec3(0, 0, -strengthWS)
  if(keyboard[83]) cubeBody.applyLocalForce(forceBack);

  // left letter A
  // if(keyboard[65]) cube.rotation.y += 0.01;
  // if(keyboard[65]) cube.rotateY(0.01);

  const strengthAD = 200;
  const forceLeft= new CANNON.Vec3(0, strengthAD, 0)
  if(keyboard[65]) cubeBody.applyTorque(forceLeft);

  // right letter D
  const forceRigth= new CANNON.Vec3(0, -strengthAD, 0)
  if(keyboard[68]) cubeBody.applyTorque(forceRigth);

}


function followPlayer(){
  camera.position.x = cubeThree.position.x;
  camera.position.y = cubeThree.position.y + 5;
  camera.position.z = cubeThree.position.z + 10;
}


function addGUI(){
  gui = new GUI();
  const options = {
		orbitsControls: false
	}

  gui.add(options, 'orbitsControls').onChange( value => {
		if (value){
			controls.enabled = true;
			enableFollow = false;
		}else{
			controls.enabled = false;
			enableFollow = true;
		}
	});
  gui.hide();


  // show and hide GUI if user press g
  window.addEventListener('keydown', function(event){
    if(event.keyCode == 71){
      if(gui._hidden){
        gui.show();
      }else{
        gui.hide();
      }
    }
  })


}

function initCannon() {
	// Setup world
	world = new CANNON.World();
	world.gravity.set(0, -9.8, 0);

	initCannonDebugger();
}

function initCannonDebugger(){
  cannonDebugger = new CannonDebugger(scene, world, {
		onInit(body, mesh) {
      mesh.visible = false;
			// Toggle visibiliy on "d" press
			document.addEventListener("keydown", (event) => {
				if (event.key === "f") {
					mesh.visible = !mesh.visible;
				}
			});
		},
	});
}

function createCustomShape(){
  const vertices = [
		new CANNON.Vec3(2, 0, 0),
		new CANNON.Vec3(2, 0, 2),
		new CANNON.Vec3(2, 2, 0),
		new CANNON.Vec3(0, 0, 0),
		new CANNON.Vec3(0, 0, 2),
		new CANNON.Vec3(0, 2, 0),
	]

	return new CANNON.ConvexPolyhedron({
		vertices,
		faces: [
      [3, 4, 5],
			[2, 1, 0],
			[1,2,5,4],
			[0,3,4,1],
			[0,2,5,3],
		]
	})
}


async function addBackground() {
  const gltfLoader = new GLTFLoader().setPath( 'src/assets/' );

  // Mountain
  const mountainLoaded = await gltfLoader.loadAsync( 'moutain.glb' );
  const mountainMesh = mountainLoaded.scene.children[0]; // Corrected here
  mountainMesh.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -Math.PI / 180 *90);
  mountainMesh.position.set(0, 60, -90);
  mountainMesh.scale.set(0.008,0.008,0.008);
  scene.add(mountainMesh);

  // Skydome
  const domeLoaded = await gltfLoader.loadAsync( 'skydome.glb' );
  const domeMesh = domeLoaded.scene.children[0];
  domeMesh.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -Math.PI / 180 *90);
  domeMesh.position.set(0, -40, 0);
  domeMesh.scale.set(0.1, 0.1, 0.1);
  scene.add(domeMesh);
}
