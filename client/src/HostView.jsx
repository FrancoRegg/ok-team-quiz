import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

function HostView() {
    const [groups, setGroups] = useState([])


    useEffect(() => {
        socket.emit('join_game', {name:'HOST'})
        socket.on('update_players', (data) =>{
            setGroups(data)
        })
    }, []);

    return(
        <div>
            <h1>Pantalla Grande</h1>
            <ul>
                {groups.filter(grupo => grupo.name !== 'HOST').map((grupo, i)=>(
                    <li key={i}>{grupo.name}</li>
                ))}
            </ul>
            <button onClick={()=>{socket.emit('start_game')}}>Empezar Juego</button>
        </div>
        
    );
};

export default HostView;