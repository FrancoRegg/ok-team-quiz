import PropTypes from 'prop-types';
import GameHeader from '../common/GameHeader';
import '../../styles/LobbyScreen.css';

const LobbyScreen = ({ playerName, score }) => {
    return (
        <div className="mobile-container">
            <GameHeader playerName={playerName} score={score} />
            
            <div className="lobby-container">
                <div className="lobby-waiting">
                    <div className="pulse-indicator"></div>
                    <h2>Esperando inicio de partida</h2>
                    <p>Mantente atento a la pantalla principal</p>
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