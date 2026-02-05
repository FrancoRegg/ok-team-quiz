import { useState } from 'react';
import '../../styles/RecoveryCodeModal.css';

const RecoveryCodeModal = ({ code, onClose }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        // Fallback clásico que funciona siempre
        const textArea = document.createElement('textarea');
        textArea.value = code;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Error al copiar:', error);
            alert('Copia manualmente el código: ' + code);
        } finally {
            document.body.removeChild(textArea);
        }
    };

    const handleDownload = () => {
        const content = `CÓDIGO DE RECUPERACIÓN - OK TEAM QUIZ
===============================================

Tu código de recuperación es:

${code}

⚠️ IMPORTANTE:
- Guarda este código en un lugar seguro
- Lo necesitarás si olvidas tu contraseña
- Este código NO se volverá a mostrar

Si olvidas tu contraseña:
1. Ve a la pantalla de login
2. Click en "¿Olvidaste tu contraseña?"
3. Ingresa este código
4. Crea una nueva contraseña

Generado el: ${new Date().toLocaleString('es-ES')}
`;

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `codigo-recuperacion-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content recovery-code-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>🔐 Código de Recuperación</h2>
                </div>
                
                <div className="modal-body">
                    <div className="recovery-warning">
                        <span className="warning-icon">⚠️</span>
                        <p>
                            <strong>¡Importante!</strong> Este código te permitirá recuperar el acceso 
                            si olvidas tu contraseña. <strong>Guárdalo en un lugar seguro.</strong>
                        </p>
                    </div>

                    <div className="recovery-code-display">
                        <div className="code-box">
                            {code}
                        </div>
                    </div>

                    <div className="recovery-actions">
                        <button 
                            className="btn-copy-code"
                            onClick={handleCopy}
                        >
                            {copied ? '✅ Copiado' : '📋 Copiar Código'}
                        </button>
                        
                        <button 
                            className="btn-download-code"
                            onClick={handleDownload}
                        >
                            💾 Descargar TXT
                        </button>
                    </div>

                    <div className="recovery-note">
                        <p>Este código <strong>NO se volverá a mostrar</strong>. Asegúrate de guardarlo.</p>
                    </div>

                    <button 
                        className="btn-close-recovery"
                        onClick={onClose}
                    >
                        Cerrar - Ya lo guardé ✓
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RecoveryCodeModal;