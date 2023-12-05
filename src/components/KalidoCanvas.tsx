import styles from './KalidoCanvas.module.css';
import {useDisclosure} from '@chakra-ui/react';
import {useState, useEffect} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {VRM, VRMExpressionPresetName, VRMHumanBoneName, VRMUtils} from '@pixiv/three-vrm';
import * as Kalidokit from 'kalidokit';
import {
  FACEMESH_TESSELATION,
  HAND_CONNECTIONS,
  Holistic,
  POSE_CONNECTIONS,
  ResultsListener,
} from '@mediapipe/holistic';
import {Camera} from '@mediapipe/camera_utils';
import {drawConnectors, drawLandmarks, NormalizedLandmarkList} from '@mediapipe/drawing_utils';
import {useDrag} from '@use-gesture/react';
import {useSpring, animated} from '@react-spring/web';
import ToggleButton from './ToggleButton';
import InfoModal from './InfoModal';

interface HolisticResults {
  poseLandmarks?: NormalizedLandmarkList;
  faceLandmarks?: NormalizedLandmarkList;
  leftHandLandmarks?: NormalizedLandmarkList;
  rightHandLandmarks?: NormalizedLandmarkList;
  ea?: NormalizedLandmarkList;
}

//Import Helper Functions from Kalidokit
const clamp = Kalidokit.Utils.clamp;
const lerp = Kalidokit.Vector.lerp;

export default function KalidoCanvas({currentVrm}: any) {
  const [cameraIsOn, setCameraIsOn] = useState(false);
  const [isDayTheme, setisDayTheme] = useState(true);
  const infoModal = useDisclosure();
  const avatarBgImage = isDayTheme ? '/green-grass-field.jpg' : '/galaxy.jpg';
  const avatarBgImageButton = isDayTheme ? '/galaxy.jpg' : '/green-grass-field.jpg';
  const cameraBgImageButton = cameraIsOn ? '/camera-off.svg' : '/camera-on.svg';

  // make video draggable
  const [{x, y}, api] = useSpring(() => ({
    x: 0,
    y: 0,
    config: {mass: 1, tension: 350, friction: 40},
  }));
  const bindDrag = useDrag(({offset}) => {
    api({
      x: offset[0],
      y: offset[1],
    });
  });

  // set up three.js once the canvas is loaded
  useEffect(() => {
    /* THREEJS WORLD SETUP */
    if (!currentVrm) return;
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
    const canvas = document.getElementById('myAvatar') as HTMLElement;
    const orbitControls = new OrbitControls(orbitCamera, canvas);
    orbitControls.screenSpacePanning = true;
    orbitControls.target.set(0.0, 1.4, 0.0);
    // call update method everytime we change the position of the camera
    orbitControls.update();

    // renderer
    // An alpha value of 0.0 would result in the object having complete transparency.
    // When set to true, the value is 0. Otherwise it's 1. Default is false.
    // {alpha: true}?
    const renderer = new THREE.WebGLRenderer({canvas});
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    // light
    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(1.0, 1.0, 1.0).normalize();
    scene.add(light);
    // renderer.setClearColor(0xffea00);
    const textureLoader = new THREE.TextureLoader();
    scene.background = textureLoader.load(avatarBgImage);
    scene.add(currentVrm.scene);
    VRMUtils.rotateVRM0(currentVrm); // Rotate model 180deg to face camera

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

    // Animate Rotation Helper function
    const rigRotation = (
      name: VRMHumanBoneName,
      rotation = {x: 0, y: 0, z: 0},
      dampener = 1,
      lerpAmount = 0.3,
    ) => {
      const Part = currentVrm.humanoid.getNormalizedBoneNode(name);
      if (!Part) {
        return;
      }
      let euler = new THREE.Euler(
        rotation.x * dampener,
        rotation.y * dampener,
        rotation.z * dampener,
      );
      let quaternion = new THREE.Quaternion().setFromEuler(euler);
      Part.quaternion.slerp(quaternion, lerpAmount); // interpolate
    };

    // Animate Position Helper Function
    const rigPosition = (
      name: VRMHumanBoneName,
      position = {x: 0, y: 0, z: 0},
      dampener = 1,
      lerpAmount = 0.3,
    ) => {
      const Part = currentVrm.humanoid.getNormalizedBoneNode(name);
      if (!Part) {
        return;
      }
      let vector = new THREE.Vector3(
        position.x * dampener,
        position.y * dampener,
        position.z * dampener,
      );
      Part.position.lerp(vector, lerpAmount); // interpolate
    };

    let oldLookTarget = new THREE.Euler();
    const rigFace = (riggedFace: Kalidokit.TFace) => {
      rigRotation('neck', riggedFace.head, 0.7);

      // Blendshapes and Preset Name Schema
      const Blendshape = currentVrm.expressionManager;
      const PresetName = VRMExpressionPresetName;
      // Simple example without winking. Interpolate based on old blendshape, then stabilize blink with `Kalidokit` helper function.
      // for VRM, 1 is closed, 0 is open.
      riggedFace.eye.l = lerp(
        clamp(1 - riggedFace.eye.l, 0, 1),
        Blendshape.getValue(PresetName.Blink),
        0.5,
      );
      riggedFace.eye.r = lerp(
        clamp(1 - riggedFace.eye.r, 0, 1),
        Blendshape.getValue(PresetName.Blink),
        0.5,
      );
      riggedFace.eye = Kalidokit.Face.stabilizeBlink(riggedFace.eye, riggedFace.head.y);
      Blendshape.setValue(PresetName.Blink, riggedFace.eye.l);

      // Interpolate and set mouth blendshapes
      Blendshape.setValue(
        PresetName.Ih,
        lerp(riggedFace.mouth.shape.I, Blendshape.getValue(PresetName.Ih), 0.5),
      );
      Blendshape.setValue(
        PresetName.Aa,
        lerp(riggedFace.mouth.shape.A, Blendshape.getValue(PresetName.Aa), 0.5),
      );
      Blendshape.setValue(
        PresetName.Ee,
        lerp(riggedFace.mouth.shape.E, Blendshape.getValue(PresetName.Ee), 0.5),
      );
      Blendshape.setValue(
        PresetName.Oh,
        lerp(riggedFace.mouth.shape.O, Blendshape.getValue(PresetName.Oh), 0.5),
      );
      Blendshape.setValue(
        PresetName.Ou,
        lerp(riggedFace.mouth.shape.U, Blendshape.getValue(PresetName.Ou), 0.5),
      );

      //PUPILS
      //interpolate pupil and keep a copy of the value
      let lookTarget = new THREE.Euler(
        lerp(oldLookTarget.x, riggedFace.pupil.y, 0.4),
        lerp(oldLookTarget.y, riggedFace.pupil.x, 0.4),
        0,
        'XYZ',
      );
      oldLookTarget.copy(lookTarget);
      currentVrm.lookAt?.applier.lookAt(lookTarget);
    };

    /* VRM Character Animator */
    const animateVRM = (vrm: VRM, results: any) => {
      if (!vrm) {
        return;
      }

      // Take the results from `Holistic` and animate character based on its Face, Pose, and Hand Keypoints.
      let riggedPose, riggedLeftHand, riggedRightHand, riggedFace;
      const faceLandmarks = results.faceLandmarks;
      // Pose 3D Landmarks are with respect to Hip distance in meters
      const pose3DLandmarks = results.ea;
      // Pose 2D landmarks are with respect to videoWidth and videoHeight
      const pose2DLandmarks = results.poseLandmarks;
      // Be careful, hand landmarks may be reversed
      const leftHandLandmarks = results.rightHandLandmarks;
      const rightHandLandmarks = results.leftHandLandmarks;

      // Animate Face
      if (faceLandmarks) {
        riggedFace = Kalidokit.Face.solve(faceLandmarks, {
          runtime: 'mediapipe',
          video: videoElement,
        });
        if (riggedFace) {
          rigFace(riggedFace);
        }
      }

      // Animate Pose
      if (pose2DLandmarks && pose3DLandmarks) {
        riggedPose = Kalidokit.Pose.solve(pose3DLandmarks, pose2DLandmarks, {
          runtime: 'mediapipe',
          video: videoElement,
        });
        if (riggedPose) {
          rigRotation('hips', riggedPose.Hips.rotation, 0.7);
          rigPosition(
            'hips',
            {
              x: -riggedPose.Hips.position.x, // Reverse direction
              y: riggedPose.Hips.position.y + 1, // Add a bit of height
              z: -riggedPose.Hips.position.z, // Reverse direction
            },
            1,
            0.07,
          );

          rigRotation('chest', riggedPose.Spine, 0.25, 0.3);
          rigRotation('spine', riggedPose.Spine, 0.45, 0.3);

          rigRotation('leftUpperArm', riggedPose.LeftUpperArm, 1, 0.3);
          rigRotation('leftLowerArm', riggedPose.LeftLowerArm, 1, 0.3);
          rigRotation('rightUpperArm', riggedPose.RightUpperArm, 1, 0.3);
          rigRotation('rightLowerArm', riggedPose.RightLowerArm, 1, 0.3);

          rigRotation('leftUpperLeg', riggedPose.LeftUpperLeg, 1, 0.3);
          rigRotation('leftLowerLeg', riggedPose.LeftLowerLeg, 1, 0.3);
          rigRotation('rightUpperLeg', riggedPose.RightUpperLeg, 1, 0.3);
          rigRotation('rightLowerLeg', riggedPose.RightLowerLeg, 1, 0.3);
        }
      }

      // Animate Hands
      if (leftHandLandmarks) {
        riggedLeftHand = Kalidokit.Hand.solve(leftHandLandmarks, 'Left');
        if (riggedLeftHand && riggedPose) {
          rigRotation('leftHand', {
            // Combine pose rotation Z and hand rotation X Y
            z: riggedPose.LeftHand.z,
            y: riggedLeftHand.LeftWrist.y,
            x: riggedLeftHand.LeftWrist.x,
          });
          rigRotation('leftRingProximal', riggedLeftHand.LeftRingProximal);
          rigRotation('leftRingIntermediate', riggedLeftHand.LeftRingIntermediate);
          rigRotation('leftRingDistal', riggedLeftHand.LeftRingDistal);
          rigRotation('leftIndexProximal', riggedLeftHand.LeftIndexProximal);
          rigRotation('leftIndexIntermediate', riggedLeftHand.LeftIndexIntermediate);
          rigRotation('leftIndexDistal', riggedLeftHand.LeftIndexDistal);
          rigRotation('leftMiddleProximal', riggedLeftHand.LeftMiddleProximal);
          rigRotation('leftMiddleIntermediate', riggedLeftHand.LeftMiddleIntermediate);
          rigRotation('leftMiddleDistal', riggedLeftHand.LeftMiddleDistal);
          rigRotation('leftThumbProximal', riggedLeftHand.LeftThumbProximal);
          rigRotation('leftThumbDistal', riggedLeftHand.LeftThumbDistal);
          rigRotation('leftLittleProximal', riggedLeftHand.LeftLittleProximal);
          rigRotation('leftLittleIntermediate', riggedLeftHand.LeftLittleIntermediate);
          rigRotation('leftLittleDistal', riggedLeftHand.LeftLittleDistal);
        }
      }
      if (rightHandLandmarks) {
        riggedRightHand = Kalidokit.Hand.solve(rightHandLandmarks, 'Right');
        if (riggedRightHand && riggedPose) {
          rigRotation('rightHand', {
            // Combine Z axis from pose hand and X/Y axis from hand wrist rotation
            z: riggedPose.RightHand.z,
            y: riggedRightHand.RightWrist.y,
            x: riggedRightHand.RightWrist.x,
          });
          rigRotation('rightRingProximal', riggedRightHand.RightRingProximal);
          rigRotation('rightRingIntermediate', riggedRightHand.RightRingIntermediate);
          rigRotation('rightRingDistal', riggedRightHand.RightRingDistal);
          rigRotation('rightIndexProximal', riggedRightHand.RightIndexProximal);
          rigRotation('rightIndexIntermediate', riggedRightHand.RightIndexIntermediate);
          rigRotation('rightIndexDistal', riggedRightHand.RightIndexDistal);
          rigRotation('rightMiddleProximal', riggedRightHand.RightMiddleProximal);
          rigRotation('rightMiddleIntermediate', riggedRightHand.RightMiddleIntermediate);
          rigRotation('rightMiddleDistal', riggedRightHand.RightMiddleDistal);
          rigRotation('rightThumbProximal', riggedRightHand.RightThumbProximal);
          rigRotation('rightThumbDistal', riggedRightHand.RightThumbDistal);
          rigRotation('rightLittleProximal', riggedRightHand.RightLittleProximal);
          rigRotation('rightLittleIntermediate', riggedRightHand.RightLittleIntermediate);
          rigRotation('rightLittleDistal', riggedRightHand.RightLittleDistal);
        }
      }
    };

    /* SETUP MEDIAPIPE HOLISTIC INSTANCE */
    let videoElement = document.querySelector('.input_video') as HTMLVideoElement;
    let guideCanvas = document.querySelector('canvas.guides') as HTMLCanvasElement;

    const onResults = (results: HolisticResults) => {
      console.log(results);
      drawResults(results);
      // Animate model
      animateVRM(currentVrm, results);
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
    holistic.onResults(onResults as ResultsListener);

    const drawResults = (results: HolisticResults) => {
      guideCanvas.width = videoElement.videoWidth;
      guideCanvas.height = videoElement.videoHeight;
      let canvasCtx = guideCanvas.getContext('2d');
      if (canvasCtx) {
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);
        // Use `Mediapipe` drawing functions
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
          color: '#00cff7',
          lineWidth: 4,
        });
        drawLandmarks(canvasCtx, results.poseLandmarks, {
          color: '#ff0364',
          lineWidth: 2,
        });
        drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_TESSELATION, {
          color: '#C0C0C070',
          lineWidth: 1,
        });
        if (results.faceLandmarks && results.faceLandmarks.length === 478) {
          //draw pupils
          drawLandmarks(canvasCtx, [results.faceLandmarks[468], results.faceLandmarks[468 + 5]], {
            color: '#ffe603',
            lineWidth: 2,
          });
        }
        drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, {
          color: '#eb1064',
          lineWidth: 5,
        });
        drawLandmarks(canvasCtx, results.leftHandLandmarks, {
          color: '#00cff7',
          lineWidth: 2,
        });
        drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, {
          color: '#22c3e3',
          lineWidth: 5,
        });
        drawLandmarks(canvasCtx, results.rightHandLandmarks, {
          color: '#ff0364',
          lineWidth: 2,
        });
      }
    };

    // Use `Mediapipe` utils to get camera - lower resolution = higher fps
    const camera = new Camera(videoElement, {
      onFrame: async () => {
        await holistic.send({image: videoElement});
      },
      width: 640,
      height: 480,
    });

    if (cameraIsOn) {
      camera.start();
      return () => {
        camera.stop();
      };
    } else {
      camera.stop();
    }
  }, [currentVrm, avatarBgImage, cameraIsOn]);

  return (
    <>
      <div className={`${styles.scene}`}>
        {cameraIsOn && (
          <animated.div
            className={`${styles.draggableVideo}`}
            style={{x, y, ...styles}}
            {...bindDrag()}
          >
            <div className={`${styles.preview}`}>
              <video
                className={`${styles.video} input_video`}
                width="1280px"
                height="720px"
                autoPlay
                muted
                playsInline
              ></video>
              <canvas className={`${styles.guide_canvas} guides`} />
            </div>
          </animated.div>
        )}

        <ToggleButton
          onClickButton={infoModal.isOpen ? infoModal.onClose : infoModal.onOpen}
          buttonRightPosition="48px"
          bgImageSrc="/question.png"
          bgImageUrl=""
        />
        <ToggleButton
          onClickButton={() => setisDayTheme(prev => !prev)}
          buttonRightPosition="208px"
          bgImageSrc=""
          bgImageUrl={avatarBgImageButton}
        />
        <ToggleButton
          onClickButton={() => setCameraIsOn(prev => !prev)}
          buttonRightPosition="128px"
          bgImageSrc={cameraBgImageButton}
          bgImageUrl=""
        />
        <canvas id="myAvatar" />
      </div>
      <InfoModal useDisclosureFn={infoModal} />
    </>
  );
}
