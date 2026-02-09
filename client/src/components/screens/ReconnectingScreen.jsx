import '../../styles/ReconnectingScreen.css';

const ReconnectingScreen = () => {
    return (
        <div className="mobile-container">
            <div className="mobile-card reconnecting-card">
                <div className="spinner"></div>
                <h2>Reconectando...</h2>
                <p>Verificando conexión con el servidor</p>
            </div>
        </div>
    );
}

export default ReconnectingScreen;