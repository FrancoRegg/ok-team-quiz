import { useEffect } from 'react';

// Manejo de todos los eventos de socket del juego

export const useGameSocket = (socket, gameHandlers) => {
    const {
        setGameState,
        setOptionsAnswers,
        setHasAnswered,
        setAnswerStatus,
        setMyAnswer,
        setCorrectAnswer,
        setCorrectOption,
        setScoreGroup,
        setTimer
    } = gameHandlers;

    useEffect(() => {
        if (!socket) return;

        const handleGameState = (state) => {
            setGameState(state);
        };
        
        const handleNewQuestion = (answers) => {
            setOptionsAnswers(answers);
            setHasAnswered(false);
            setAnswerStatus(null);
            setMyAnswer(null);
            setCorrectAnswer(null);
            setCorrectOption(null);
            if (navigator.vibrate) navigator.vibrate(100);
        };

        // El HOST la muestra en el proyector y el jugador en su móvil
        const handleShowCorrectAnswer = (data) => {
            setCorrectAnswer(data.correctIndex);
            setCorrectOption(data.correctOption);
        };

        const handleTimerUpdate = (data) => {
            setTimer(data.remainingTime);
        };

        const handleTimerFinished = () => {
            setTimer(0);
        };

        const handleAnswerResult = (data) => {
            if (data.correctIndex !== undefined) {
                setCorrectAnswer(data.correctIndex);
            }
        
            if (data.correct) {
                setAnswerStatus('CORRECT');
                if (navigator.vibrate) navigator.vibrate([100, 50, 100]); 
            } else {
                setAnswerStatus('INCORRECT');
                if (navigator.vibrate) navigator.vibrate(400); 
            }
        };

        const handleUpdatePlayers = (data) => {
            const myData = data.find(player => player.id === socket.id);
            if (myData) {
                setScoreGroup(myData.score);
                if (myData.hasAnswered) setHasAnswered(true);
            }
        };

        // Registrar eventos
        socket.on('game_state', handleGameState);
        socket.on('new_question', handleNewQuestion);
        socket.on('show_correct_answer', handleShowCorrectAnswer);
        socket.on('answer_result', handleAnswerResult);
        socket.on('update_players', handleUpdatePlayers);
        socket.on('timer_update', handleTimerUpdate); 
        socket.on('timer_finished', handleTimerFinished);

        return () => {
            socket.off('game_state', handleGameState);
            socket.off('new_question', handleNewQuestion);
            socket.off('show_correct_answer', handleShowCorrectAnswer);
            socket.off('answer_result', handleAnswerResult);
            socket.off('update_players', handleUpdatePlayers);
            socket.off('timer_update', handleTimerUpdate); 
            socket.off('timer_finished', handleTimerFinished);
        };
    }, [socket, gameHandlers]);
}