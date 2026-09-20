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
    const [showRankingModal, setShowRankingModal] = useState(false);
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

        socket.on('error_message', (data) => {
            alert('⚠️ ' + data.message);
        });

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
                socket.off('error_message');
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

    const ResetModal = () => (
        showResetModal && (
            <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2>Reiniciar Partida</h2>
                        <button className="modal-close" onClick={() => setShowResetModal(false)}>
                            ✕
                        </button>
                    </div>
                    
                    <div className="modal-body">
                        <p className="modal-question">¿Qué desea hacer con los participantes?</p>
                        
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
                                    <strong>Mantener participantes</strong>
                                    <small>Reiniciar solo las preguntas (conservar puntos)</small>
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
                                    <small>Eliminar participantes y comenzar de cero</small>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    );

    const RankingModal = () => (
        showRankingModal && (
            <div className="modal-overlay" onClick={() => setShowRankingModal(false)}>
                <div className="modal-content ranking-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2>Tabla de Posiciones</h2>
                        <button className="modal-close" onClick={() => setShowRankingModal(false)}>
                            ✕
                        </button>
                    </div>
                    
                    <div className="modal-body">
                        {groups.filter(g => g.name !== 'HOST').length === 0 ? (
                            <p className="no-players">No hay participantes registrados</p>
                        ) : (
                            <div className="ranking-full-list">
                                {groups
                                    .filter(g => g.name !== 'HOST')
                                    .sort((a, b) => b.score - a.score)
                                    .map((player, index) => (
                                        <div key={player.id} className="ranking-item">
                                            <span className="rank-position">
                                                {index === 0 ? '🥇' : 
                                                 index === 1 ? '🥈' : 
                                                 index === 2 ? '🥉' : 
                                                 `${index + 1}.`}
                                            </span>
                                            <span className="rank-player-name">{player.name}</span>
                                            <span className="rank-player-score">{player.score} pts</span>
                                        </div>
                                    ))
                                }
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    );

    if(gameState === 'LOBBY'){
        return(
            <div className="host-container">
                <div>
                    <h1 className="big-title">OK TEAM Quiz</h1>
                
                    <div className="qr-frame">
                        {joinUrl && (
                            <QRCode 
                                value={joinUrl} 
                                size={200}
                            />
                        )}
                    </div>
                </div>
                <h3 className="sub-title">Escanea el QR o ingresa desde el móvil a: 
                    <span className="url-highlight">{joinUrl}</span>
                </h3>
                
                <hr/>

                {groups.filter(g => g.name !== 'HOST').length === 0 && (
                    <h3>Esperando Participantes...</h3>
                )}
                <ul className="players-grid">
                    {groups.filter(grupo => grupo.name !== 'HOST').map((value)=>(
                        <li className="player-chip" key={value.id}>{value.name}</li>
                    ))}
                </ul>
                <button 
                    className="btn-primary"
                    onClick={()=>{socket.emit('next_question')}}>
                        Iniciar Partida
                </button>
                <AdminButton />
                <ResetModal />
                <RankingModal />
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
                <h1 className="big-title">Partida Finalizada</h1>
                {winner && (
                    <div className="qr-frame">
                        <h2 className="sub-title">🏆 GANADOR</h2>
                        <h1 className="big-title">{winner.name}</h1>
                        <h3>Con {winner.score} puntos</h3>
                    </div>
                )}

                <div className="ranking-table-container">
                    <h3 className="sub-title" style={{marginTop: '20px'}}>Tabla de Posiciones</h3>
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
                    onClick={() => setShowResetModal(true)}
                    >
                    Nueva Partida
                </button>
                <AdminButton />
                <ResetModal />
                <RankingModal />
            </div>
        )
    }

    return(
        <div className="host-container">
            <div className="secondary-buttons">
                <button 
                    className="btn-secondary-icon"
                    data-tooltip="Ver Posiciones"
                    onClick={() => setShowRankingModal(true)}>
                    📊
                </button>
                <button 
                    className="btn-secondary-icon"
                    data-tooltip="Reiniciar"
                    onClick={() => setShowResetModal(true)}>
                    🔄
                </button>
            </div>

            <div className="game-phase-layout">
                <div className="question-card">
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
                                <iframe 
                                    src={currentQuestion.mediaUrl} 
                                    className="question-media video-iframe"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
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
                        </div>
                    )}
                </div>

                <div className="main-action-buttons">
                    {/* Volver atrás solo acá: la pregunta está en pantalla, nadie
                        respondió todavía y el servidor avisa con canGoBack si hay
                        una pregunta anterior a la que volver */}
                    {gameState === 'QUESTION_LOCKED' && currentQuestion?.canGoBack && (
                        <button
                            className="btn-main-action back"
                            onClick={()=>{socket.emit('previous_question')}}>
                                Atrás
                        </button>
                    )}

                    {gameState === 'QUESTION_LOCKED' && (
                        <button
                            className="btn-main-action activate"
                            onClick={()=>{socket.emit('activate_answers')}}>
                                Activar Respuestas
                        </button>
                    )}
                    
                    {gameState === 'QUESTION_ACTIVE' && (
                        <button 
                            className="btn-main-action show-answer"
                            onClick={()=>{socket.emit('show_answer')}}>
                                Mostrar Respuesta Correcta
                        </button>
                    )}

                    {gameState === 'SHOW_ANSWER' && (
                        <button 
                            className="btn-main-action next-question"
                            onClick={()=>{socket.emit('next_question')}}>
                                Siguiente Pregunta
                        </button>
                    )}
                </div>
                
                <div className="live-stats-bar">
                    <span className="stat-label">Posiciones Actuales:</span>
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
            </div>
            
            <AdminButton />
            <ResetModal />
            <RankingModal />
        </div>
    );
}

export default HostView;