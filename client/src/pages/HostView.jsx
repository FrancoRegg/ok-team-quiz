import { useEffect, useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import QRCode from "react-qr-code";
import '../styles/HostView.css'

function HostView() {
    const { socket } = useSocket();

    const [groups, setGroups] = useState([]);
    const [gameState, setGameState] = useState("LOBBY");
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [correctAnswer, setCorrectAnswer] = useState(null);
    const [timer, setTimer] = useState(null);
    const [showResetModal, setShowResetModal] = useState(false);
    const [joinUrl, setJoinUrl] = useState("");

    useEffect(() => {
        if (!socket) {
        console.log('⏳ Esperando socket...');
        return;
        }

        console.log('✅ Socket disponible, inicializando HostView');

        setJoinUrl(window.location.origin);

        socket.emit('join_game', {name:'HOST'})
        
        socket.on('server_check', (data) => {
            const { gameId } = data;
            console.log("🎟️ Host uniéndose con ticket:", gameId);
            
            // Nos unimos enviando el ID correcto
            socket.emit('join_game', { 
                name: 'HOST',
                gameId: String(gameId)
            });
        });
        if(socket.connected){
           // Esto es opcional, pero ayuda en recargas rápidas en desarrollo
        }

        socket.on('update_players', (data) =>{
            setGroups(data)
        })

        socket.on('game_state', (data)=>{
            setGameState(data)
        })

        socket.on('new_question', (questionData)=>{
            setCurrentQuestion(questionData)
        })

        socket.on('show_correct_answer', (data)=>{
            setCorrectAnswer(data)
        })

        socket.on('timer_update', (data)=>{
            setTimer(data.remainingTime)
        })

        socket.on('timer_finished', ()=>{
            setTimer(0)
        })

        //Limpieza al cerrado el componente
        return () => {
            if(socket){
                socket.off('server_check');
                socket.off('update_players');
                socket.off('game_state');
                socket.off('new_question');
                socket.off('show_correct_answer');
                socket.off('timer_update');
                socket.off('timer_finished')
            }
        }
    }, [socket]);

    const AdminButton = () => (
        <button 
            className="admin-access-btn"
            onClick={() => window.open('/admin', '_blank')} 
            title="Ir al Panel de Administración"
        >
            🔒
        </button>
    );

    if(gameState === 'LOBBY'){
        return(
            <div className="host-container">
                <div>
                    <h1 className="big-title">¡Únete al Quiz!</h1>
                
                    {/* ZONA DEL CÓDIGO QR */}
                    <div className="qr-frame">
                        {joinUrl && (
                            <QRCode 
                                value={joinUrl} 
                                size={200}
                            />
                        )}
                    </div>
                </div>
                <h3 className="sub-title">Escanea o entra en: 
                    <span className="url-highlight">{joinUrl}</span>
                </h3>
                
                <hr/>

                <h3>Esperando Jugadores...</h3>
                <ul className="players-grid">
                    {groups.filter(grupo => grupo.name !== 'HOST').map((value)=>(
                        <li className="player-chip" key={value.id}>{value.name}</li>
                    ))}
                </ul>
                <button 
                    className="btn-primary"
                    onClick={()=>{socket.emit('next_question')}}>
                        Empezar Juego
                </button>
                <AdminButton />
            </div>
        );
    }

    if(gameState === 'GAME_OVER'){
        const sortedGroups = groups
            .filter(grupo => grupo.name !== 'HOST')
            .sort((a, b) => b.score - a.score);

        const winner = sortedGroups[0];

        return(
            <div className="host-container">
                <h1 className="big-title">Juego Terminado</h1>
                {winner && (
                    <div className="qr-frame">
                        <h2 className="sub-title">🏆 GANADOR:</h2>
                        <h1 className="big-title">{winner.name}</h1>
                        <h3>Con {winner.score} puntos</h3>
                    </div>
                )}

                <div className="ranking-table-container">
                    <h3 className="sub-title" style={{marginTop: '20px'}}>Tabla Final</h3>
                    <ul className="ranking-list" style={{padding: 0, listStyle: 'none', margin: 0}}>
                        {sortedGroups.map((p, i) => (
                            <li key={p.id} className="ranking-row-item">
                                <span className="rank-name">
                                    {i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : `${i+1}. `}
                                    {p.name}
                                </span>
                                <span className="rank-score">{p.score} pts</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <button 
                    className="btn-primary" 
                    onClick={()=>{socket.emit('reset_game')}}
                    >
                    Nueva Partida 🔄
                </button>
                <AdminButton />
            </div>
        )
    }

    return(
        <div className="host-container">
            <div className="game-phase-layout">
                <h1 className="question-title">{currentQuestion?.title}</h1>

                {currentQuestion?.mediaUrl && (
                    <div className="media-frame">
                        {currentQuestion.type === 'IMAGE' ? (
                            <img 
                                src={currentQuestion.mediaUrl} 
                                alt="Pregunta" 
                                className="question-media"
                            />
                        ) : currentQuestion.type === 'VIDEO' ? (
                            <video 
                                src={currentQuestion.mediaUrl} 
                                controls 
                                autoPlay 
                                className="question-media"
                            />
                        ) : null}
                    </div>
                )}
                {gameState === 'SHOW_ANSWER' && correctAnswer && (
                    <div className="answer-reveal">
                        <h2 className="answer-title">✅ Respuesta Correcta:</h2>
                        <div className="correct-answer-display">
                            {correctAnswer.correctOption}
                        </div>
                    </div>
                )}

                {gameState === 'QUESTION_ACTIVE' && timer !== null && (
                    <div className="timer-display">
                        <span className="timer-icon">⏱️</span>
                        <span className="timer-number">{timer}</span>
                        <span className="timer-label">segundos</span>
                    </div>
                )}

                <div className="live-stats-bar">
                    <span className="stat-label">Líderes ahora:</span>
                    {groups
                        .filter(g => g.name !== 'HOST')
                        .sort((a, b) => b.score - a.score)
                        .slice(0, 3) 
                        .map((grupo, index) => (
                            <div key={grupo.id} className={`top-player-chip ${index === 0 ? 'leader' : ''}`}>
                                <span>{index === 0 ? '🥇' : index + 1 + '.'}</span>
                                <span>{grupo.name}</span>
                                <strong>{grupo.score}</strong>
                            </div>
                        ))
                    }
                </div>
                
                <div className="admin-controls">
                    {gameState === 'QUESTION_LOCKED' && (
                        <button 
                            className="btn-activate"
                            onClick={()=>{socket.emit('activate_answers')}}>
                            🟢 Activar Respuestas
                        </button>
                    )}
                    
                    {gameState === 'QUESTION_ACTIVE' && (
                        <button 
                            className="btn-primary"
                            onClick={()=>{socket.emit('show_answer')}}>
                            📺 Mostrar Respuesta Correcta
                        </button>
                    )}

                    {gameState === 'SHOW_ANSWER' && (
                        <button 
                            className="btn-primary"
                            onClick={()=>{socket.emit('next_question')}}>
                            Siguiente Pregunta ➡
                        </button>
                    )}
                    
                    <button 
                        className="btn-secondary"
                        onClick={() => setShowResetModal(true)}>
                        Reiniciar 🔄
                    </button>
                </div>
            </div>

            {showResetModal && (
                <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>🔄 Reiniciar Partida</h2>
                            <button className="modal-close" onClick={() => setShowResetModal(false)}>
                                ✕
                            </button>
                        </div>
                        
                        <div className="modal-body">
                            <p className="modal-question">¿Qué quieres hacer con los jugadores?</p>
                            
                            <div className="reset-options">
                                <button 
                                    className="reset-option-btn keep"
                                    onClick={() => {
                                        socket.emit('reset_game', { cleanPlayers: false });
                                        setShowResetModal(false);
                                    }}
                                >
                                    <span className="option-icon">🔄</span>
                                    <div className="option-text">
                                        <strong>Mantener jugadores</strong>
                                        <small>Solo resetear preguntas (conservar puntos)</small>
                                    </div>
                                </button>
                                
                                <button 
                                    className="reset-option-btn clean"
                                    onClick={() => {
                                        if (window.confirm('⚠️ ¿Seguro? Esto borrará TODOS los jugadores y puntos permanentemente.')) {
                                            socket.emit('reset_game', { cleanPlayers: true });
                                            setShowResetModal(false);
                                        }
                                    }}
                                >
                                    <span className="option-icon">🧹</span>
                                    <div className="option-text">
                                        <strong>Limpiar todo</strong>
                                        <small>Borrar jugadores y empezar de cero</small>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )};

            <AdminButton />
        </div>
    );
}

export default HostView;