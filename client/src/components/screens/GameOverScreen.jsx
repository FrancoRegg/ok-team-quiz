import PropTypes from 'prop-types';
import '../../styles/App.css';

const GameOverScreen = ({ score, onExitGame }) => {
    return (
        <div className="mobile-container">
            <div className="mobile-card">
                <h1>🏁 Fin del Juego</h1>
                <p>Mira la pantalla grande para ver el podio.</p>
                
                <div className="game-over-score">
                    {score} pts
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