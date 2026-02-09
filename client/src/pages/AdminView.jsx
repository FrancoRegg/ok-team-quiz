import { useState, useEffect } from "react"
import { useSocket } from '../hooks/useSocket';
import RecoveryCodeModal from '../components/screens/RecoveryCodeModal';
import '../styles/Admin.css'

const PlayerEditItem = ({ player, onEdit }) => {
    const [scoreChange, setScoreChange] = useState(0);
    
    const handleSave = () => {
        if (scoreChange === 0) return;
        onEdit(player.id, scoreChange);
        setScoreChange(0);
    };
    
    const newScore = Math.max(0, player.score + scoreChange);
    
    return (
        <div className="player-edit-item">
            <div className="player-info">
                <strong>{player.name}</strong>
                <span className="current-score">Actual: {player.score} pts</span>
            </div>
            
            <div className="player-edit-controls">
                <input 
                    type="number"
                    className="score-input"
                    placeholder="Ej: +100 o -50"
                    value={scoreChange || ''}
                    onChange={(e) => setScoreChange(parseInt(e.target.value) || 0)}
                />
                <span className="new-score">
                    → {newScore} pts
                </span>
                <button 
                    className="btn-save-score"
                    onClick={handleSave}
                    disabled={scoreChange === 0}
                >
                    Guardar
                </button>
            </div>
        </div>
    );
}


function AdminView() {

    const [ title, setTitle ] = useState("");
    const [ type, setType ] = useState("TEXT");
    const [ options, setOptions ] = useState(["", ""]);
    const [ mediaUrl, setMediaUrl ] = useState("");
    const [ correctIndex, setCorrectIndex ] = useState(0);

    // Estados de gestión
    const [ questionsList, setQuestionsList ] = useState([]); 
    const [ editingId, setEditingId ] = useState(null); 

    // Estado control de tiempo
    const [ timeLimit, setTimeLimit ] = useState(10);
    
    // Estados PLayers
    const [ players, setPlayers ] = useState([]);
    const [ showPlayersModal, setShowPlayersModal ] = useState(false);
    const [ showPasswordModal, setShowPasswordModal ] = useState(false);
    const [ currentPassword, setCurrentPassword ] = useState('');
    const [ newPassword, setNewPassword ] = useState('');
    const [ confirmPassword, setConfirmPassword ] = useState('');
    const [ passwordStrength, setPasswordStrength ] = useState({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false
    });

    const validatePasswordStrength = (password) => {
        setPasswordStrength({
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password)
        });
    };

    const isPasswordValid = () => {
        return passwordStrength.length && 
            passwordStrength.uppercase && 
            passwordStrength.lowercase && 
            passwordStrength.number &&
            newPassword === confirmPassword &&
            newPassword !== 'Admin2024!';  // No permitir la contraseña por defecto
    };

    // Estados para código de recuperación
    const [ showRecoveryCodeModal, setShowRecoveryCodeModal ] = useState(false);
    const [ recoveryCode, setRecoveryCode ] = useState('');


    const handleChangePassword = async () => {
        if (!isPasswordValid()) {
            alert('La contraseña no cumple los requisitos de seguridad');
            return;
        }

        try {
            const response = await fetchWithAuth(`${API_URL}/api/auth/change-password`, {
                method: 'POST',
                body: JSON.stringify({
                    currentPassword: currentPassword,
                    newPassword: newPassword
                })
            });

            const data = await response.json();

            if (data.success) {
                // Mostrar modal con código de recuperación
                if (data.recoveryCode) {
                    setRecoveryCode(data.recoveryCode);
                    setShowRecoveryCodeModal(true);
                    setShowPasswordModal(false);
                    
                    // Limpiar formulario
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    
                    // Actualizar flag
                    localStorage.setItem('is_default_password', 'false');
                } else {
                    alert(data.message);
                    window.location.reload();
                }
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('Error al cambiar contraseña:', error);
            alert('Error al cambiar contraseña');
        }
    };

    const { socket } = useSocket();

    const API_URL = import.meta.env.VITE_API_URL || '';

    const fetchWithAuth = async (url, options = {}) => {
        const token = localStorage.getItem('admin_token');
        
        if (!token) {
            console.log('⛔ fetchWithAuth: No hay token');
            alert('⛔ No estás autenticado');
            localStorage.removeItem('admin_token');
            window.location.reload();
            throw new Error('No token available');
        };

        console.log('🔐 fetchWithAuth: Enviando token:', token.substring(0, 10) + '...');
        
        return fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
    };

    const fetchQuestions = async () => {
        try {
            console.log('📥 Cargando preguntas...');
            const response = await fetchWithAuth(`${API_URL}/api/questions`);

            if (response.status === 401 || response.status === 403) {
                alert('⛔ Sesión expirada. Por favor, inicia sesión de nuevo.');
                localStorage.removeItem('admin_token');
                window.location.reload();
                return;
            }

            const data = await response.json();
            setQuestionsList(data);
        } catch (error) {
            console.error("Error al cargar preguntas:", error);
        }
    };

    const fetchPlayers = async () => {
        try {
            console.log('📥 Cargando jugadores...');
            const response = await fetchWithAuth(`${API_URL}/api/players`);

            if (response.status === 401 || response.status === 403) {
                alert('⛔ Sesión expirada. Por favor, inicia sesión de nuevo.');
                localStorage.removeItem('admin_token');
                window.location.reload();
                return;
            }

            const data = await response.json();
            setPlayers(data);
        } catch (error) {
            console.error("Error al cargar jugadores:", error);
        }
    };

    const handleOpenPlayersModal = () => {
        setShowPlayersModal(true);
        fetchPlayers();
    };

    const handleEditScore = async (playerId, scoreChange) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/api/players/${playerId}`, {
                method: 'PUT',
                body: JSON.stringify({ scoreChange })
            });

            if (response.ok) {
                // Recargar lista de jugadores
                await fetchPlayers();
            } else {
                alert('Error al editar puntuación');
            }
        } catch (error) {
            console.error('Error al editar puntuación:', error);
            alert('Error al editar puntuación');
        }
    };

    const handleCleanSeason = () => {
        if (!window.confirm('⚠️ ¿Estás seguro? Esto borrará TODOS los jugadores y sus puntuaciones permanentemente.')) {
            return;
        }

        if (!socket) {
            alert('⚠️ Socket no conectado. Recarga la página e intenta de nuevo.');
            return;
        }

        socket.emit('reset_game', { cleanPlayers: true });
        
        console.log('🧹 Emitiendo reset_game con cleanPlayers=true');
        
        setTimeout(() => {
            setPlayers([]);
            setShowPlayersModal(false);
            alert('Temporada limpiada correctamente');
        }, 500);
    };

    useEffect(() => {
        fetchQuestions();
        fetchPlayers();
    }, []);

    const handleOptionChange = (index, value) => {
        let copyOptions = [...options];
        copyOptions[index] = value;
        setOptions(copyOptions);
    }

    const addOption = () => {
        setOptions([...options, ""]);
    }

    const deleteOption = (index) => {
        if(options.length <= 2) return; 
        let copyOptions = [...options];
        copyOptions.splice(index, 1);
        setOptions(copyOptions);
        
        if (correctIndex >= index && correctIndex > 0) {
            setCorrectIndex(correctIndex - 1);
        }
    }

    const handleEdit = (question) => {
        setEditingId(question.id);
        setTitle(question.title);
        setType(question.type);
        setOptions(Array.isArray(question.options) ? question.options : JSON.parse(question.options));
        setMediaUrl(question.mediaUrl || "");
        setCorrectIndex(question.correctIndex);
        setTimeLimit(question.timeLimit || 10);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const handleDelete = async (id) => {
        if(!window.confirm("¿Estás seguro de borrar esta pregunta?")) return;
        try {
            // ✅ USAR fetchWithAuth en vez de fetch directo
            const response = await fetchWithAuth(`${API_URL}/api/questions/${id}`, {
                method: 'DELETE'
            });
            
            if (response.status === 401 || response.status === 403) {
                alert('⛔ Sesión expirada');
                localStorage.removeItem('admin_token');
                window.location.reload();
                return;
            }

            if (response.ok) {
                fetchQuestions(); 
            } else {
                alert("Error al borrar la pregunta");
            }
        } catch (error) {
            console.error("Error al borrar:", error);
            alert("Error al borrar");
        }
    }

    const resetForm = () => {
        setEditingId(null);
        setTitle("");
        setType("TEXT");
        setOptions(["", ""]);
        setMediaUrl("");
        setCorrectIndex(0);
        setTimeLimit(10);
    }

    const handleSubmit = async() => {
        if(!title || options.some(opt => opt.trim() === "")){
            alert("Completa todos los campos obligatorios");
            return;
        }

        // Validar URL si tipo es IMAGE/VIDEO
        if ((type === 'IMAGE' || type === 'VIDEO') && !mediaUrl.trim()) {
            alert("⚠️ Debes ingresar una URL para la " + (type === 'IMAGE' ? 'imagen' : 'video'));
            return;
        }

        // Validar formato de URL
        if ((type === 'IMAGE' || type === 'VIDEO') && mediaUrl.trim()) {
            try {
                new URL(mediaUrl);
            } catch (error) {
                alert("⚠️ La URL ingresada no es válida. Debe comenzar con http:// o https://");
                return;
            }
        }

        const questionData = { title, type, options, mediaUrl, correctIndex, timeLimit };
        
        try{
            let url = `/api/questions`;
            let method = 'POST';

            if (editingId) {
                url = `/api/questions/${editingId}`;
                method = 'PUT';
            }

            // USAR fetchWithAuth en vez de fetch directo
            const response = await fetchWithAuth(`${API_URL}${url}`, {
                method: method,
                body: JSON.stringify(questionData)
            });

            if (response.status === 401 || response.status === 403) {
                alert('⛔ Sesión expirada');
                localStorage.removeItem('admin_token');
                window.location.reload();
                return;
            }      

            if(response.ok){
                alert(editingId ? "Pregunta actualizada correctamente" : "Pregunta guardada correctamente");
                resetForm(); 
                fetchQuestions(); 
            } else {
                alert("Hubo un error en el servidor.");
            }
        } catch(error){
            console.error("Error de red:", error);
            alert("No se pudo conectar con el servidor.");
        }
    }

    const handleLogout = () => {
        if(window.confirm("¿Seguro que quieres cerrar sesión?")){
            localStorage.removeItem("admin_token"); 
            window.location.reload(); 
        }
    }

    return(
        <div className="admin-container">

            {localStorage.getItem('is_default_password') === 'true' && (
                <div className="password-warning-banner">
                    <div className="warning-content">
                        <span className="warning-icon">⚠️</span>
                        <div className="warning-text">
                            <strong>Contraseña por defecto activa</strong>
                            <p>Por seguridad, debes cambiar la contraseña de acceso.</p>
                        </div>
                        <button 
                            className="btn-change-password-banner"
                            onClick={() => setShowPasswordModal(true)}
                        >
                            Cambiar Contraseña
                        </button>
                    </div>
                </div>
            )}

            <div className="header-row">
                <h1 className="admin-title">
                    {editingId ? "Editar Pregunta" : "Nueva Pregunta"}
                </h1>
                <button className="btn-logout" onClick={handleLogout}>
                    Cerrar Sesión
                </button>
            </div>

            {/* Sección de gestión de jugadores */}
            <div className="players-section">
                <h2 className="section-title">Gestión de Participantes</h2>
                <div className="players-actions">
                    <button className="btn-players" onClick={handleOpenPlayersModal}>
                        Editar Puntuaciones
                    </button>
                    <button className="btn-clean-season" onClick={handleCleanSeason}>
                        Limpiar Temporada
                    </button>
                </div>
                <p className="players-count">
                    Participantes registrados: <strong>{players.length}</strong>
                </p>
            </div>

            <hr className="divider"/>

            <div className="form-group">
                <label className="form-label">Título de la pregunta:</label>
                <input 
                    className="form-input"
                    type="text" 
                    placeholder="Ejemplo: ¿En qué año se fundó OKTeam?"
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                />
            </div>

            <div className="form-group">
                <label className="form-label">Opciones de respuesta:</label>
                <div className="options-list">
                    {options.map((opt, i)=>(
                        <div key={i} className="option-row">
                            <input 
                                className="radio-check"
                                type="radio" 
                                name="correctAnswer" 
                                title="Marcar como correcta"
                                checked={correctIndex === i}
                                onChange={() => setCorrectIndex(i)}
                            />
                            
                            <input 
                                className="option-input-text"
                                type="text" 
                                placeholder={`Opción ${i+1}`}
                                value={opt} 
                                onChange={(e) => handleOptionChange(i, e.target.value)}
                            />

                            <button className="btn-delete" onClick={() => deleteOption(i)}>✕</button>
                        </div>
                    ))}
                    
                    <button className="btn-add" onClick={addOption}>
                        Agregar opción
                    </button>
                </div>
            </div>

            <div className="form-group form-row-multi">
                <div className="flex-1">
                    <label className="form-label">Tipo de pregunta:</label>
                    <select 
                        className="form-select"
                        value={type}
                        onChange={(e) => setType(e.target.value)}>
                        <option value="TEXT">Texto</option>
                        <option value="IMAGE">Imagen</option>
                        <option value="VIDEO">Video</option>
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">Tiempo límite (segundos):</label>
                    <div className="time-limit-input">
                        <input
                            type="number"
                            min="5"
                            max="120"
                            className="input-number"
                            value={timeLimit}
                            onChange={(e) => setTimeLimit(parseInt(e.target.value) || 10)}
                        />
                        <span className="input-hint">
                            (entre 5 y 120 segundos)
                        </span>
                    </div>
                </div>

                {type !== 'TEXT' && (
                    <div className="flex-2">
                        <label className="form-label">
                            {type === 'IMAGE' ? 'URL de la imagen:' : 'URL del Video:'}
                        </label>
                        <input 
                            className="form-input"
                            type="text" 
                            placeholder={
                                type === 'IMAGE' 
                                    ? "https://drive.google.com/uc?id=... o https://i.imgur.com/..." 
                                    : "https://www.youtube.com/embed/..."
                            }
                            value={mediaUrl} 
                            onChange={(e) => setMediaUrl(e.target.value)}
                        />
                        <p className="input-hint">
                            {type === 'IMAGE' 
                                ? "💡 Sube tu imagen a Google Drive o Imgur y pega el enlace público aquí" 
                                : "💡 Sube tu video a YouTube y usa el enlace de 'Insertar' (embed)"}
                        </p>
                    </div>
                )}
            </div>

            <div className="button-group">
                <button 
                    className={`btn-save ${editingId ? 'editing' : ''}`} 
                    onClick={handleSubmit}
                >
                    {editingId ? "Guardar Cambios" : "Guardar Pregunta"}
                </button>

                {editingId && (
                    <button className="btn-cancel" onClick={resetForm}>
                        Cancelar
                    </button>
                )}
            </div>

            <hr className="divider"/>
            
            <h2 className="questions-title">Preguntas Guardadas ({questionsList.length})</h2>
            
            <div className="questions-list">
                {questionsList.map((q) => (
                    <div key={q.id} className="question-item">
                        <div className="q-info">
                            <strong>{q.title}</strong>
                            <div className="q-meta">
                                {q.type} • {q.options.length} opciones
                            </div>
                        </div>
                        <div className="q-actions">
                            <button className="btn-icon btn-edit" onClick={() => handleEdit(q)}>
                                ✏️
                            </button>
                            <button className="btn-icon btn-delete-item" onClick={() => handleDelete(q.id)}>
                                🗑️
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* MODAL: Editar Puntuacion */}
            {showPlayersModal && (
                <div className="modal-overlay" onClick={() => setShowPlayersModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Editar Puntuaciones</h2>
                            <button className="modal-close" onClick={() => setShowPlayersModal(false)}>
                                ✕
                            </button>
                        </div>
                        
                        <div className="modal-body">
                            {players.length === 0 ? (
                                <p className="no-players">No hay participantes registrados</p>
                            ) : (
                                <div className="players-edit-list">
                                    {players.map(player => (
                                        <PlayerEditItem 
                                            key={player.id}
                                            player={player}
                                            onEdit={handleEditScore}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: Cambiar contraseña */}
            {showPasswordModal && (
                <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
                    <div className="modal-content password-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Cambiar Contraseña</h2>
                            <button className="modal-close" onClick={() => setShowPasswordModal(false)}>
                                ✕
                            </button>
                        </div>
                        
                        <div className="modal-body">
                            
                            {/* Campo: Contraseña Actual */}
                            <div className="form-group">
                                <label className="form-label">Contraseña Actual:</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    placeholder="Ingresa tu contraseña actual"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                />
                            </div>

                            {/* Campo: Nueva Contraseña */}
                            <div className="form-group">
                                <label className="form-label">Nueva Contraseña:</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    placeholder="Ingresa tu nueva contraseña"
                                    value={newPassword}
                                    onChange={(e) => {
                                        setNewPassword(e.target.value);
                                        validatePasswordStrength(e.target.value);
                                    }}
                                />
                            </div>

                            {/* Validación Visual en Tiempo Real */}
                            <div className="password-requirements">
                                <p className="requirements-title">La contraseña debe contener:</p>
                                <div className="requirement-item">
                                    <span className={passwordStrength.length ? 'check-valid' : 'check-invalid'}>
                                        {passwordStrength.length ? '✅' : '❌'}
                                    </span>
                                    <span>Mínimo 8 caracteres</span>
                                </div>
                                <div className="requirement-item">
                                    <span className={passwordStrength.uppercase ? 'check-valid' : 'check-invalid'}>
                                        {passwordStrength.uppercase ? '✅' : '❌'}
                                    </span>
                                    <span>Al menos 1 mayúscula</span>
                                </div>
                                <div className="requirement-item">
                                    <span className={passwordStrength.lowercase ? 'check-valid' : 'check-invalid'}>
                                        {passwordStrength.lowercase ? '✅' : '❌'}
                                    </span>
                                    <span>Al menos 1 minúscula</span>
                                </div>
                                <div className="requirement-item">
                                    <span className={passwordStrength.number ? 'check-valid' : 'check-invalid'}>
                                        {passwordStrength.number ? '✅' : '❌'}
                                    </span>
                                    <span>Al menos 1 número</span>
                                </div>
                            </div>

                            {/* Campo: Confirmar Contraseña */}
                            <div className="form-group">
                                <label className="form-label">Confirmar Nueva Contraseña:</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    placeholder="Confirma tu nueva contraseña"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                                {confirmPassword && newPassword !== confirmPassword && (
                                    <p className="password-mismatch">❌ Las contraseñas no coinciden</p>
                                )}
                                {confirmPassword && newPassword === confirmPassword && newPassword && (
                                    <p className="password-match">✅ Las contraseñas coinciden</p>
                                )}
                            </div>

                            {/* Botón Guardar */}
                            <button
                                className="btn-save-password"
                                onClick={handleChangePassword}
                                disabled={!isPasswordValid()}
                            >
                                Guardar Contraseña
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: Código de Recuperación */}
            {showRecoveryCodeModal && (
                <RecoveryCodeModal 
                    code={recoveryCode}
                    onClose={() => {
                        setShowRecoveryCodeModal(false);
                        window.location.reload();
                    }}
                />
            )}
        </div>
    );
}

export default AdminView;