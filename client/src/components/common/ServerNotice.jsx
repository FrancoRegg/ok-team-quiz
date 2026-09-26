import { useEffect } from 'react';
import PropTypes from 'prop-types';
import '../../styles/ServerNotice.css';

// Avisos que manda el servidor al jugador ("las respuestas no están activadas",
// "no pudimos registrar tu respuesta"). Antes se emitían y no se veían en
// ningún lado. Se va solo a los 6 segundos y también se puede cerrar tocándolo.

const AUTO_HIDE_MS = 6000;

const ServerNotice = ({ message, onClose }) => {
    useEffect(() => {
        if (!message) return;

        const timeout = setTimeout(onClose, AUTO_HIDE_MS);
        return () => clearTimeout(timeout);
    // El mensaje vuelve a montar el aviso: cada uno dura sus 6 segundos
    }, [message, onClose]);

    if (!message) return null;

    return (
        <button type="button" className="server-notice" onClick={onClose} role="alert">
            {message}
        </button>
    );
};

ServerNotice.propTypes = {
    message: PropTypes.string,
    onClose: PropTypes.func.isRequired,
};

export default ServerNotice;
