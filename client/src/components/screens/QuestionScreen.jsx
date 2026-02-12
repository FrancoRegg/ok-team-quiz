import PropTypes from 'prop-types';
import GameHeader from '../common/GameHeader';
import '../../styles/QuestionScreen.css';

const QuestionScreen = ({ 
    playerName, 
    score,
    timer,
    optionsAnswers,
    hasAnswered,
    answerStatus,
    myAnswer,
    correctAnswer,
    onSubmitAnswer
}) => {

    const getButtonClass = (index) => {
        if (timer === 0) return 'disabled';

        if (answerStatus === null && !hasAnswered) return 'active';

        if (answerStatus === null && hasAnswered) {
            return index === myAnswer ? 'active' : 'disabled';
        }

        if (answerStatus === 'CORRECT' && index === correctAnswer) {
            return 'correct';
        }

        if (answerStatus === 'INCORRECT' && index === myAnswer) {
            return 'incorrect';
        }
        
        return 'disabled';
    };

    const handleAnswerClick = (index) => {
        if (navigator.vibrate) navigator.vibrate(50);
        onSubmitAnswer(index);
    };

    return (
        <div className="mobile-container">
            <GameHeader playerName={playerName} score={score} />

            <div className="question-container">
                {timer !== null && (
                    <div className="mobile-timer">
                        <span className="mobile-timer-icon"></span>
                        <span className="mobile-timer-number">{timer}</span>
                    </div>
                )}

                {optionsAnswers?.options ? (
                    <div>
                        <h3 className="question-prompt">Selecciona tu respuesta:</h3>
                        <div className="game-grid">
                            {optionsAnswers.options.map((answer, i) => (
                                <button
                                    key={i} 
                                    disabled={timer === 0 || (hasAnswered && answerStatus === null)}
                                    onClick={() => handleAnswerClick(i)}
                                    className={`game-btn ${getButtonClass(i)}`}
                                >
                                    {answer}
                                </button>
                            ))}
                        </div>
                        {/* 
                        {hasAnswered && answerStatus === null && (
                            <div className="answer-submitted">
                                <div className="check-icon">✓</div>
                                <p>Respuesta enviada</p>
                            </div>
                        )}
                            */}
                    </div>
                ) : (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Cargando pregunta...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

QuestionScreen.propTypes = {
    playerName: PropTypes.string.isRequired,
    score: PropTypes.number.isRequired,
    timer: PropTypes.number,
    optionsAnswers: PropTypes.shape({
        options: PropTypes.arrayOf(PropTypes.string)
    }),
    hasAnswered: PropTypes.bool.isRequired,
    answerStatus: PropTypes.oneOf(['CORRECT', 'INCORRECT', null]),
    myAnswer: PropTypes.number,
    correctAnswer: PropTypes.number,
    onSubmitAnswer: PropTypes.func.isRequired
};

export default QuestionScreen;