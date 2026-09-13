import PropTypes from 'prop-types';

// Indicador de prueba: muestra en pantalla el estado del wake lock, para poder
// verificarlo desde el celular sin consola. App.jsx solo lo monta en desarrollo.
// Estilos en línea a propósito: así no suma CSS al build de producción.

const LABELS = {
    inactive: { text: 'Wake Lock: fuera de partida', color: '#6b7280' },
    insecure: { text: 'Wake Lock: página no segura, usá npm run dev:https', color: '#b45309' },
    unsupported: { text: 'Wake Lock: no soportado en este navegador', color: '#b45309' },
    active: { text: 'Wake Lock: activo, la pantalla no se apaga', color: '#047857' },
    released: { text: 'Wake Lock: liberado, tocá la pantalla para reactivar', color: '#b45309' },
    error: { text: 'Wake Lock: rechazado, tocá la pantalla para reintentar', color: '#b91c1c' },
};

const WakeLockBadge = ({ status }) => {
    const label = LABELS[status.state] || LABELS.inactive;

    return (
        <div
            role="status"
            style={{
                position: 'fixed',
                left: 8,
                right: 8,
                bottom: 8,
                zIndex: 9999,
                padding: '6px 10px',
                borderRadius: 6,
                background: 'rgba(255, 255, 255, 0.94)',
                border: `1.5px solid ${label.color}`,
                color: label.color,
                font: '600 12px/1.35 system-ui, sans-serif',
                textAlign: 'center',
                pointerEvents: 'none',
            }}
        >
            {label.text}
            {status.detail ? ` (${status.detail})` : ''}
        </div>
    );
};

WakeLockBadge.propTypes = {
    status: PropTypes.shape({
        state: PropTypes.string.isRequired,
        detail: PropTypes.string,
    }).isRequired,
};

export default WakeLockBadge;
