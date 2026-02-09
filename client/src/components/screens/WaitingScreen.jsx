import PropTypes from 'prop-types';
import GameHeader from '../common/GameHeader';
import '../../styles/WaitingScreen.css';

const WaitingScreen = ({ playerName, score }) => {
    return (
        <div className="mobile-container">
            <GameHeader playerName={playerName} score={score} />
            
            <div className="waiting-state">
                <div className="pulse-indicator"></div>
                <h2>Preparando siguiente pregunta</h2>
                <p className="waiting-message">
                    Mantente atento a la pantalla principal
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