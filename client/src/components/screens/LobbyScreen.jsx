import PropTypes from 'prop-types';
import GameHeader from '../common/GameHeader';
import '../../styles/LobbyScreen.css';

const LobbyScreen = ({ playerName, score }) => {
    return (
        <div className="mobile-container">
            <GameHeader playerName={playerName} score={score} />
            
            <div className="lobby-container">
                <div className="lobby-waiting">
                    <div className="pulse-text">⏳</div>
                    <h2>Esperando al Host...</h2>
                    <p>¡Prepárate, va a empezar!</p>
                    <div className="status-footer">Mira la pantalla grande</div>
                </div>
            </div>
        </div>
    );
};

LobbyScreen.propTypes = {
    playerName: PropTypes.string.isRequired,
    score: PropTypes.number.isRequired
};

export default LobbyScreen;