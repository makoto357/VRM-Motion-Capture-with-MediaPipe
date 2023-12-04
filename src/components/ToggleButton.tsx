import styles from './ToggleButton.module.css';
import {Box, Image} from '@chakra-ui/react';

interface ToggleButtonProps {
  onClickButton: () => void;
  buttonRightPosition: string;
  bgImageSrc: string;
  bgImageUrl: string;
}

const ToggleButton: React.FC<ToggleButtonProps> = ({
  onClickButton,
  buttonRightPosition,
  bgImageSrc,
  bgImageUrl,
}) => {
  return (
    <button
      className={styles.c_button}
      style={{
        right: `${buttonRightPosition}`,
        bottom: '48px',
        backgroundImage: `url(${bgImageUrl})`,
      }}
      onClick={onClickButton}
    >
      {bgImageSrc && (
        <Box p="5px">
          <Image src={bgImageSrc} w="30px" h="30px" />
        </Box>
      )}
    </button>
  );
};

export default ToggleButton;
