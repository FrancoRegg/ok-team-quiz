import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

function HostView() {
    const [groups, setGroups] = useState([])
    const [gameState, setGameState] = useState("LOBBY")
    const [currentQuestion, setCurrentQuestion] = useState(null)
    
    useEffect(() => {
        socket.emit('join_game', {name:'HOST'})
        socket.on('update_players', (data) =>{
            setGroups(data)
        })

        socket.on('game_state', (data)=>{
            setGameState(data)
        })
        socket.on('new_question', (questionData)=>{
            setCurrentQuestion(questionData)
        })
        //Limpieza al cerrado el componente
        return () => {
            socket.off('update_players');
            socket.off('game_state');
            socket.off('new_question')
        }
    }, []);

    if(gameState === 'LOBBY'){
        return(
            <div>
                <h1>Pantalla Proyectada</h1>
                <h3>Esperando Jugadores...</h3>
                <ul>
                    {groups.filter(grupo => grupo.name !== 'HOST').map((value)=>(
                        <li key={value.id}>{value.name}</li>
                    ))}
                </ul>
                <button 
                    onClick={()=>{socket.emit('start_game')}}>
                        Empezar Juego
                </button>
            </div>
        );
    }

    if(gameState === 'GAME_OVER'){
        const sortedGroups = groups
            .filter(grupo => grupo.name !== 'HOST')
            .sort((a, b) => b.score - a.score);

        const winner = sortedGroups[0];

        return(
            <div>
            <h1>Juego Terminado</h1>
                {winner && (
                    <div>
                        <h2>🏆 GANADOR:</h2>
                        <h1>{winner.name}</h1>
                        <h3>Con {winner.score} puntos</h3>
                    </div>
                )}

                <div>
                     <h3>Tabla Final:</h3>
                     <ul>
                        {sortedGroups.map((p, i) => (
                            <li key={p.id}>{i+1}. {p.name} - {p.score}</li>
                        ))}
                     </ul>
                </div>

                <button onClick={()=>{socket.emit('reset_game')}}>
                    Nueva Partida 🔄
                </button>
            </div>
        )
    }

    return(
        <div>
            <h1>Pantalla Proyectada</h1>
                <div>
                    <h1>{currentQuestion?.title}</h1>
                    <div>
                        <ul>
                            {groups
                                .filter(grupo => grupo.name !== 'HOST')
                                .sort((a, b) => b.score - a.score)
                                .map((value, i) => (
                                <li key={value.id}>
                                    {value.name}: {value.score}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <button
                            onClick={()=>{socket.emit('start_game')}}>
                            Siguiente Pregunta
                        </button>
                        <button 
                            onClick={()=>{socket.emit('reset_game')}}>
                            Resetear Juego
                        </button>
                    </div>
                </div>
        </div>
        
    );
};

export default HostView;