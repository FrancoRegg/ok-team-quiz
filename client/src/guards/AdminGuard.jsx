import { useState } from "react";
import '../styles/AdminGuard.css'; 

function AdminGuard({ children }){
    const [ password, setPassword ] = useState("");
    const [ isAuthenticated, setIsAuthenticated ] = useState(() => {
        const saved = localStorage.getItem("admin_token")
        return saved ? true : false;
    });

    const [ showRecoveryModal, setShowRecoveryModal ] = useState(false);
    const [ recoveryCode, setRecoveryCode ] = useState('');
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
            newPassword !== 'Admin2024!';
    };

    const handleLogin = async() => {
        try{
            const API_URL = import.meta.env.VITE_API_URL || '';

            const resp = await fetch(`${API_URL}/api/auth/login`, {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: password })
            });

            const data = await resp.json();
            
            // Manejar respuesta según status
            if (resp.status === 429) {
                // Rate limit alcanzado
                alert(`🚫 ${data.message || 'Demasiados intentos. Espera 15 minutos.'}`);
                setPassword("");
                return;
            }
            
            if (data.success && data.token){
                localStorage.setItem("admin_token", data.token);
                // AdminView lee este dato de localStorage para mostrar el aviso
                localStorage.setItem("is_default_password", data.isDefaultPassword || 'false');
                setIsAuthenticated(true);
                console.log('✅ Token guardado');
            } else if (data.success && !data.token){
                alert("⚠️ Login exitoso pero no se recibió token");
            } else {
                // ✅ Mostrar mensaje del servidor (puede ser contraseña incorrecta u otro error)
                alert(`⛔ ${data.message || 'Contraseña incorrecta'}`);
                setPassword("");
            }
        } catch(error){
            console.error(error);
            alert("Error de conexión con el servidor");
        }
    }

    const handleRecovery = async() => {
        if (!recoveryCode.trim()) {
            alert('⚠️ Ingresa el código de recuperación');
            return;
        }

        if (!isPasswordValid()) {
            alert('⚠️ La contraseña no cumple todos los requisitos');
            return;
        }

        try {
            const API_URL = import.meta.env.VITE_API_URL || '';

            const resp = await fetch(`${API_URL}/api/auth/recover-with-code`, {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    recoveryCode: recoveryCode,
                    newPassword: newPassword
                })
            });

            const data = await resp.json();
            
            if (data.success) {
                alert(`✅ ${data.message}\n\n🔑 Nuevo código generado: ${data.recoveryCode}\n\n⚠️ Guárdalo para futuros cambios`);
                
                // Limpiar formulario
                setRecoveryCode('');
                setNewPassword('');
                setConfirmPassword('');
                setShowRecoveryModal(false);
                
                // Usuario debe hacer login con nueva contraseña
            } else {
                alert('❌ ' + data.message);
            }
        } catch (error) {
            console.error(error);
            alert('❌ Error al recuperar contraseña');
        }
    };
    
    // Permitir enviar con la tecla ENTER
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    }

    // --- LÓGICA DE RECUPERACIÓN ---
    const handleForgotPassword = () => {
        setShowRecoveryModal(true);
    }

    // Si está autenticado, mostramos el Panel. Si no, el Login.
    if (isAuthenticated) {
        return children;
    }

    return(
        <div className="guard-container">
            <div className="login-card">
                <div className="lock-icon">🔒</div>
                
                <h2 className="login-title">Acceso Restringido</h2>
                <p className="login-subtitle">Panel de Administración</p>

                <input 
                    className="login-input"
                    name="Password" 
                    type="password" 
                    placeholder="Ingresa tu contraseña..."
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown} 
                />
                
                <button className="btn-access" onClick={handleLogin}>
                    Acceder
                </button>

                {/* Enlace de recuperación */}
                <div className="forgot-section">
                    <button className="btn-forgot" onClick={handleForgotPassword}>
                        ¿Olvidaste la contraseña?
                    </button>
                </div>
            </div>
            {showRecoveryModal && (
                <div className="modal-overlay" onClick={() => setShowRecoveryModal(false)}>
                    <div className="modal-content recovery-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Recuperar Acceso</h2>
                            <button className="modal-close" onClick={() => setShowRecoveryModal(false)}>
                                ✕
                            </button>
                        </div>
                        
                        <div className="modal-body">
                            
                            {/* Código de Recuperación */}
                            <div className="form-group">
                                <label className="form-label">Código de recuperación:</label>
                                <input
                                    type="text"
                                    className="form-input recovery-code-input"
                                    placeholder="RECOV-XXXX-XXXX"
                                    value={recoveryCode}
                                    onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                                    maxLength={17}
                                />
                                <p className="input-hint">Ingresa el código que recibiste al cambiar tu contraseña</p>
                            </div>

                            {/* Nueva Contraseña */}
                            <div className="form-group">
                                <label className="form-label">Nueva contraseña:</label>
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

                            {/* Validación Visual */}
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

                            {/* Confirmar Contraseña */}
                            <div className="form-group">
                                <label className="form-label">Confirmar Contraseña:</label>
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

                            {/* Botón Recuperar */}
                            <button
                                className="btn-recover-access"
                                onClick={handleRecovery}
                                disabled={!isPasswordValid() || !recoveryCode.trim()}
                            >
                                Recuperar Acceso
                            </button>

                            {/* Soporte */}
                            <div className="recovery-support">
                                <p>¿No tienes el código?</p>
                                <p className="support-info">Contacta al administrador del sistema</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminGuard;