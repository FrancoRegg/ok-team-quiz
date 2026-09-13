import { useEffect, useRef, useState } from 'react';

// Mantener pantalla encendida mientras el jugador está dentro de la partida.
//
// El navegador libera el wake lock solo cada vez que la pestaña deja de estar
// visible (el jugador bloquea el teléfono, atiende un mensaje, cambia de app).
// Por eso hay que volver a pedirlo al regresar, o se pierde para el resto de
// la partida. El hook recibe si la partida está activa y se encarga del resto,
// así también cubre las reconexiones automáticas, que no pasan por el login.
//
// Devuelve el estado actual, para poder mostrarlo en pantalla al probar:
//   inactive    fuera de la partida
//   insecure    la página no es HTTPS: el navegador no ofrece la API
//   unsupported el navegador no la soporta (Safari en iOS antes de la 16.4)
//   active      pantalla retenida
//   released    el navegador lo soltó; se reintenta al volver o al tocar
//   error       el pedido fue rechazado (detail trae el motivo)

const INACTIVE = { state: 'inactive', detail: null };

export const useWakeLock = (isActive) => {
    const wakeLockRef = useRef(null);
    const [status, setStatus] = useState(INACTIVE);

    useEffect(() => {
        if (!isActive) return;

        if (!window.isSecureContext) {
            console.log('ℹ️ Wake Lock no disponible: la página no es segura (HTTPS)');
            setStatus({ state: 'insecure', detail: null });
            return () => setStatus(INACTIVE);
        }

        if (!('wakeLock' in navigator)) {
            // Safari en iOS lo soporta desde la 16.4; en equipos viejos no hay alternativa
            console.log('ℹ️ Wake Lock no soportado en este dispositivo');
            setStatus({ state: 'unsupported', detail: null });
            return () => setStatus(INACTIVE);
        }

        let cancelled = false;
        let pending = false;

        const requestWakeLock = async () => {
            // Solo se puede pedir con la página visible; si no, esperamos al regreso
            if (cancelled || pending || wakeLockRef.current) return;
            if (document.visibilityState !== 'visible') return;

            pending = true;
            try {
                const lock = await navigator.wakeLock.request('screen');

                if (cancelled) {
                    lock.release().catch(() => {});
                    return;
                }

                wakeLockRef.current = lock;
                setStatus({ state: 'active', detail: null });

                // El navegador puede soltarlo por su cuenta: limpiamos la referencia
                // para que el próximo regreso a la pestaña lo vuelva a pedir
                lock.addEventListener('release', () => {
                    wakeLockRef.current = null;
                    if (!cancelled) setStatus({ state: 'released', detail: null });
                });

                console.log('🔆 Wake Lock activado');
            } catch (err) {
                console.log('❌ Error activando Wake Lock:', err.name, err.message);
                if (!cancelled) setStatus({ state: 'error', detail: err.name || 'Error' });
            } finally {
                pending = false;
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                requestWakeLock();
            }
        };

        // Si el navegador rechazó el pedido por no venir de un toque del usuario
        // (pasa en las reconexiones automáticas), el próximo toque lo reintenta.
        // Si ya está activo, requestWakeLock sale sin hacer nada.
        const handleInteraction = () => {
            requestWakeLock();
        };

        requestWakeLock();
        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('touchend', handleInteraction, { passive: true });
        document.addEventListener('click', handleInteraction);

        return () => {
            cancelled = true;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('touchend', handleInteraction);
            document.removeEventListener('click', handleInteraction);

            if (wakeLockRef.current) {
                wakeLockRef.current.release().catch(() => {});
                wakeLockRef.current = null;
                console.log('🌙 Wake Lock liberado');
            }
            setStatus(INACTIVE);
        };
    }, [isActive]);

    return status;
}
