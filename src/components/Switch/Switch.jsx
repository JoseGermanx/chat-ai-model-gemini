
import { useTheme } from '../../hooks/useTheme';
import './Switch.css'

import sun from '../../assets/sun-svgrepo-com.svg';
import moon from '../../assets/moon-svgrepo-com.svg';

const Switch = () => {
    const [theme, handleChange] = useTheme('light');

    return (
        <div className="container-switch">
            <span style={{fontSize: "8px"}}>{theme === "dark" ? <img src={sun} width={30} alt="Ligth" /> : <img src={moon} width={30} alt="Dark" />}</span>
            <label className="switch">
                <input type="checkbox" onChange={handleChange} checked={theme === 'dark'} />
                <span className="slider"></span>
            </label>
        </div>
    )
}

export default Switch;