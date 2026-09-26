import { useState } from 'react';
import PropTypes from 'prop-types';
import '../../styles/QuestionImage.css';

// Imagen de una pregunta, con aviso cuando la URL no carga. Antes, una URL que
// no era una imagen (la portada de Drive, por ejemplo) dejaba un hueco vacío en
// el proyector y nadie se enteraba hasta que la pregunta estaba en pantalla.

const QuestionImage = ({ src, alt, className }) => {
    // Se guarda qué URL falló, no un booleano: así una URL nueva vuelve a
    // intentarse sola, sin un efecto que reinicie el estado
    const [failedSrc, setFailedSrc] = useState(null);
    const failed = failedSrc === src;

    if (!src) return null;

    if (failed) {
        return (
            <p className="question-image-failed" role="status">
                ⚠️ No se pudo cargar la imagen desde esa URL. Tiene que ser un
                enlace directo a la imagen, de los que terminan en .jpg o .png.
            </p>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            onError={() => setFailedSrc(src)}
        />
    );
};

QuestionImage.propTypes = {
    src: PropTypes.string,
    alt: PropTypes.string.isRequired,
    className: PropTypes.string,
};

export default QuestionImage;
