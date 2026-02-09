import PropTypes from 'prop-types';
import '../../styles/App.css';
import '../../styles/GameOverScreen.css' 

const GameOverScreen = ({ score, onExitGame }) => {
    return (
        <div className="mobile-container">
            <div className="mobile-card">
                <h1>Partida Finalizada</h1>
                <p>Consulta el podio en la pantalla principal.</p>
                
                <div className="game-over-score">
                    <span className="score-label">Tu puntuación</span>
                    <span className="score-value">{score}</span>
                    <span className="score-unit">puntos</span>
                </div>
                
                <button className="btn-exit" onClick={onExitGame}>
                    Salir
                </button>
            </div>
        </div>
    );
}

GameOverScreen.propTypes = {
    score: PropTypes.number.isRequired,
    onExitGame: PropTypes.func.isRequired
};

export default GameOverScreen;