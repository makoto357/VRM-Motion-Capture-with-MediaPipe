import styles from './ToggleButton.module.css';

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
        backgroundImage: `url(${bgImageUrl})`,
      }}
      onClick={onClickButton}
    >
      {bgImageSrc && <img className={styles.c_button_image} src={bgImageSrc} />}
    </button>
  );
};

export default ToggleButton;
