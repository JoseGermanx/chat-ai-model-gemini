
import { useTheme } from '../../hooks/useTheme';
import './Switch.css'

const Switch = () => {
    const [theme, handleChange] = useTheme('light');

    return (
        <div className="container-switch">
            <label className="switch">
                <input type="checkbox" onChange={handleChange} checked={theme === 'dark'} />
                <span className="slider"></span>
            </label>
        </div>
    )
}

export default Switch;