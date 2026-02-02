import '../../styles/ReconnectingScreen.css';

const ReconnectingScreen = () => {
    return (
        <div className="mobile-container">
            <div className="mobile-card reconnecting-card">
                <div className="spinner"></div>
                <h2>Reconectando...</h2>
                <p>Validando sesión</p>
            </div>
        </div>
    );
}

export default ReconnectingScreen;