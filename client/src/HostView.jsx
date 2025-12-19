import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

function HostView() {
    const [groups, setGroups] = useState([])
    console.log("GRUPOS", groups)
    const [gameState, setGameState] = useState("LOBBY")
    const [currentQuestion, setCurrentQuestion] = useState(null)
    
    useEffect(() => {
        socket.emit('join_game', {name:'HOST'})
        socket.on('update_players', (data) =>{
            setGroups(data)
            console.log("GRUPOS", groups)
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

    return(
        <div>
            <h1>Pantalla Proyectada</h1>
            {gameState === 'LOBBY' ? (
                <div>
                    <ul>
                        {groups.filter(grupo => grupo.name !== 'HOST').map((value, i)=>(
                            <li key={i}>{value.name}</li>
                        ))}
                    </ul>
                    <button onClick={()=>{socket.emit('start_game')}}>Empezar Juego</button>
                </div>) : (
                    <div>
                        <h1>{currentQuestion?.title}</h1>
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
                )}
            
        </div>
        
    );
};

export default HostView;