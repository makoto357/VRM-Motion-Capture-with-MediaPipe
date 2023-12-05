import React from 'react';
import {Modal, ModalContent, ModalBody, ModalCloseButton, Text, Box} from '@chakra-ui/react';

const InfoModal = ({useDisclosureFn}) => {
  const websiteTutorial = [
    {
      imageSrcOne: '/video.png',
      imageSrcTwo: '/drag-and-drop.png',
      guideline: "Drag the video around on the screen so it won't block your view.",
    },
    {
      imageSrcOne: '/green-grass-field.jpg',
      imageSrcTwo: '/galaxy.jpg',
      guideline: 'Switch between 2 background images to get a different feel of the avatar.',
    },
    {
      imageSrcOne: '/camera-on.svg',
      imageSrcTwo: '/camera-off.svg',
      guideline: 'Turn the camera on and off for capturing motion!',
    },
  ];

  return (
    <Modal
      isOpen={useDisclosureFn.isOpen}
      onClose={useDisclosureFn.onClose}
      motionPreset="slideInRight"
    >
      <ModalContent
        background="#dedede"
        position="absolute"
        left="0px"
        height="100vh"
        margin="0"
        borderTopRightRadius="20px"
        borderBottomRightRadius="20px"
        border="3px solid #808080"
        w="300px"
      >
        <ModalCloseButton borderRadius="50%" border="3px solid #808080" />
        <ModalBody m="54px 0px">
          <Box display="flex" flexDir="column" h="100%" justifyContent="space-between">
            <Box>
              {websiteTutorial.map((w, index) => (
                <>
                  <Box display="flex" gap="10px" mb="10px">
                    <Box
                      bgImage={`url(${w.imageSrcOne})`}
                      bgSize="cover"
                      boxSize="32px"
                      {...(index === 1 ? {borderRadius: '50%'} : {})}
                    />
                    <Box
                      bgImage={`url(${w.imageSrcTwo})`}
                      bgSize="cover"
                      boxSize="32px"
                      {...(index === 1 ? {borderRadius: '50%'} : {})}
                    />
                  </Box>
                  <Text mb="30px" fontSize="xl">
                    {w.guideline}
                  </Text>
                </>
              ))}
            </Box>
            <Box
              bgImage={`url("/website-logo.png")`}
              bgSize="contain"
              bgPosition="center"
              bgRepeat="no-repeat"
              h="50px"
            />
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default InfoModal;
