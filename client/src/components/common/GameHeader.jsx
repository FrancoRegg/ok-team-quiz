import PropTypes from 'prop-types';
import '../../styles/GameHeader.css';

const GameHeader = ({ playerName, score }) => {
    return (
        <>
            <div className="app-header">
                <span className="player-info">{playerName}</span>
                <span className="score-badge">{score}</span>
            </div>
            <div className="header-spacer"></div>
        </>
    );
}

GameHeader.propTypes = {
    playerName: PropTypes.string.isRequired,
    score: PropTypes.number.isRequired
};

export default GameHeader;