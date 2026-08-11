import {Box, Text} from '@chakra-ui/react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import {useState, useEffect} from 'react';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {VRMLoaderPlugin, VRMUtils} from '@pixiv/three-vrm';
import {CircularProgressbar} from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

const KalidoCanvas = dynamic(() => import('../components/KalidoCanvas'), {ssr: false});

export default function Home() {
  const [currentVrm, setCurrentVrm] = useState(null);
  const [progress, setProgress] = useState(0);
  const [loadError, setLoadError] = useState(false);

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
      '/models/avatar.vrm',
      gltf => {
        VRMUtils.removeUnnecessaryJoints(gltf.scene);
        const vrm = gltf.userData.vrm;
        setCurrentVrm(vrm);
      },
      progress => setProgress(Math.round(100.0 * (progress.loaded / progress.total))),
      error => {
        console.error(error);
        setLoadError(true);
      },
    );
  }, []);

  return (
    <>
      <Head>
        <title>VRM mocap</title>
        <meta name="description" content="VRM mocap!" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/website-favicon.png" />
      </Head>
      <main>
        {!currentVrm ? (
          <Box
            background="#dedede"
            bgImage="url('/website-background-cover.png')"
            backgroundSize="contain"
            bgRepeat="no-repeat"
            backgroundPosition="center"
            display="flex"
            justifyContent="center"
            alignItems="flex-end"
            h="100vh"
            w="100%"
          >
            {loadError ? (
              <Box mb="50px" textAlign="center" color="#374151">
                <Text fontWeight="bold">Unable to load avatar</Text>
                <Text fontSize="sm">Refresh the page and try again.</Text>
              </Box>
            ) : (
              <Box boxSize={['75px', '150px']} mb="50px">
                <CircularProgressbar
                  value={progress}
                  text={`${progress}%`}
                  strokeWidth={5}
                  styles={{
                    path: {
                      stroke: `rgba(55, 65, 81, ${progress / 100})`,
                      strokeLinecap: 'round',
                    },
                    trail: {
                      stroke: '#dedede',
                      strokeLinecap: 'round',
                    },
                    text: {
                      fill: '#374151',
                      fontSize: '20px',
                      fontWeight: 'bold',
                    },
                  }}
                />
              </Box>
            )}
          </Box>
        ) : (
          <KalidoCanvas currentVrm={currentVrm} />
        )}
      </main>
    </>
  );
}
