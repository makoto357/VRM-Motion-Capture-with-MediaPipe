import Head from 'next/head';
import dynamic from 'next/dynamic';
import {useState, useEffect} from 'react';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {VRMLoaderPlugin, VRMUtils} from '@pixiv/three-vrm';
const KalidoCanvas = dynamic(() => import('../components/KalidoCanvas/index.page'), {ssr: false});

export default function Home() {
  const [currentVrm, setCurrentVrm] = useState(null);

  useEffect(() => {
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
        setCurrentVrm(vrm);
      },
      progress => console.log('Loading model...', 100.0 * (progress.loaded / progress.total), '%'),
      error => console.error(error),
    );
  }, []);

  return (
    <>
      <Head>
        <title>VRM Mocap</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>{currentVrm && <KalidoCanvas currentVrm={currentVrm} />}</main>
    </>
  );
}
