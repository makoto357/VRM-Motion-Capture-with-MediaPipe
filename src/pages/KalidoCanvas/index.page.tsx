import {useEffect} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {VRMExpressionPresetName, VRMLoaderPlugin, VRMUtils} from '@pixiv/three-vrm';
import type * as V1VRMSchema from '@pixiv/types-vrmc-vrm-1.0';
import * as Kalidokit from 'kalidokit';
import {FACEMESH_TESSELATION, Holistic, POSE_CONNECTIONS} from '@mediapipe/holistic';
import {Camera} from '@mediapipe/camera_utils';
import {drawConnectors, drawLandmarks, NormalizedLandmarkList} from '@mediapipe/drawing_utils';
//Import Helper Functions from Kalidokit
const remap = Kalidokit.Utils.remap;
const clamp = Kalidokit.Utils.clamp;
const lerp = Kalidokit.Vector.lerp;

export default function KalidoCanvas() {
  // set up three.js once the canvas is loaded
  useEffect(() => {
    /* THREEJS WORLD SETUP */
    let currentVrm: any;
    // scene
    const scene = new THREE.Scene();
    // camera
    const orbitCamera = new THREE.PerspectiveCamera(
      35,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    orbitCamera.position.set(0.0, 0.0, 5);
    // controls
    const canvas = document.getElementById('myAvatar');
    const orbitControls = new OrbitControls(orbitCamera, canvas as any);
    orbitControls.screenSpacePanning = true;
    orbitControls.target.set(0.0, 1.4, 0.0);
    // call update method everytime we change the position of the camera
    orbitControls.update();

    // renderer
    // An alpha value of 0.0 would result in the object having complete transparency.
    // When set to true, the value is 0. Otherwise it's 1. Default is false.
    // {alpha: true}?
    const renderer = new THREE.WebGLRenderer({canvas: canvas as any});
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    // light
    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(1.0, 1.0, 1.0).normalize();
    scene.add(light);
    // renderer.setClearColor(0xffea00);

    // Main Render Loop
    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);

      if (currentVrm) {
        // Update model to render physics
        currentVrm.update(clock.getDelta());
      }
      renderer.render(scene, orbitCamera);
    }
    animate();
    /* VRM CHARACTER SETUP */
    // Import Character VRM
    const loader = new GLTFLoader();
    loader.crossOrigin = 'anonymous';
    // install plugin
    loader.register(parser => {
      return new VRMLoaderPlugin(parser);
    });
    // Import model from URL, add your own model here
    loader.load(
      'https://cdn.glitch.com/29e07830-2317-4b15-a044-135e73c7f840%2FAshtra.vrm?v=1630342336981',

      gltf => {
        VRMUtils.removeUnnecessaryJoints(gltf.scene);
        const vrm = gltf.userData.vrm;
        // THREE.VRM.from(gltf).then(vrm => {
        scene.add(vrm.scene);
        console.log(vrm);
        currentVrm = vrm;
        currentVrm.scene.rotation.y = Math.PI; // Rotate model 180deg to face camera
        // });
      },

      progress => console.log('Loading model...', 100.0 * (progress.loaded / progress.total), '%'),
      // undefined,
      error => console.error(error),
    );
    /* SETUP MEDIAPIPE HOLISTIC INSTANCE */
    let videoElement = document.querySelector('.input_video') as HTMLVideoElement,
      guideCanvas = document.querySelector('canvas.guides') as HTMLCanvasElement;

    const onResults = (results: any) => {
      // Draw landmark guides
      // drawResults(results);
      // Animate model
      // animateVRM(currentVrm, results);
    };
    const holistic = new Holistic({
      locateFile: file => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1635989137/${file}`;
      },
    });

    holistic.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
      refineFaceLandmarks: true,
    });
    // Pass holistic a callback function
    holistic.onResults(onResults);

    // Use `Mediapipe` utils to get camera - lower resolution = higher fps
    const camera = new Camera(videoElement as HTMLVideoElement, {
      onFrame: async () => {
        await holistic.send({image: videoElement as HTMLVideoElement});
      },
      width: 640,
      height: 480,
    });
    camera.start();
  }, []);
  return (
    <div>
      <video
        className="input_video"
        width="1280px"
        height="720px"
        autoPlay
        muted
        playsInline
      ></video>
      <canvas id="myAvatar" className="guides" />
    </div>
  );
}
