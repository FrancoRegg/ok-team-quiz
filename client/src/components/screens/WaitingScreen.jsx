import PropTypes from 'prop-types';
import GameHeader from '../common/GameHeader';
import '../../styles/WaitingScreen.css';

const WaitingScreen = ({ playerName, score }) => {
    return (
        <div className="mobile-container">
            <GameHeader playerName={playerName} score={score} />
            
            <div className="waiting-state">
                <div className="pulse-text">⏳</div>
                <h2>Esperando pregunta...</h2>
                <p className="waiting-message">
                    El anfitrión está leyendo la pregunta en la pantalla principal
                </p>
            </div>
        </div>
    );
};

WaitingScreen.propTypes = {
    playerName: PropTypes.string.isRequired,
    score: PropTypes.number.isRequired
};

export default WaitingScreen;