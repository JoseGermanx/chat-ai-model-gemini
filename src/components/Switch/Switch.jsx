
import { useTheme } from '../../hooks/useTheme';
import './Switch.css'

const Switch = () => {
    const [theme, handleChange] = useTheme('dark');

    return (
        <div className="container-switch">
            <span style={{fontSize: "medium"}}>{theme === "dark" ? "Ligth" : "Dark"}</span>
            <label className="switch">
                <input type="checkbox" onChange={handleChange} checked={theme === 'dark'} />
                <span className="slider"></span>
            </label>
        </div>
    )
}

export default Switch;