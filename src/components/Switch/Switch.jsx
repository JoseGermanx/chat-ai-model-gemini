import { useTheme } from '../../hooks/useTheme';
import './Switch.css';
import moon from '../../assets/moon-svgrepo-com.svg';
import sun from '../../assets/sun-svgrepo-com.svg';

const Switch = () => {
  const [theme, toggleTheme] = useTheme();

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      <img
        src={theme === 'dark' ? sun : moon}
        width={17}
        height={17}
        alt={theme === 'dark' ? 'Sol' : 'Luna'}
        className="theme-icon"
      />
    </button>
  );
};

export default Switch;
