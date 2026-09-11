import PropTypes from 'prop-types';
import GameHeader from '../common/GameHeader';
import '../../styles/AnswerRevealScreen.css';

// Muestra únicamente la respuesta correcta. La pregunta y las opciones quedan
// en el proyector: acá solo va el dato que el participante necesita ver.

const AnswerRevealScreen = ({ playerName, score, correctOption }) => {
    return (
        <div className="mobile-container">
            <GameHeader playerName={playerName} score={score} />

            <div className="reveal-container">
                {correctOption ? (
                    <>
                        <span className="reveal-label">Respuesta correcta</span>
                        <div className="reveal-answer">{correctOption}</div>
                    </>
                ) : (
                    <p className="reveal-waiting">Mostrando respuesta...</p>
                )}
            </div>
        </div>
    );
};

AnswerRevealScreen.propTypes = {
    playerName: PropTypes.string.isRequired,
    score: PropTypes.number.isRequired,
    correctOption: PropTypes.string
};

export default AnswerRevealScreen;
