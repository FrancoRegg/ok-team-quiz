import { Component } from 'react';
import PropTypes from 'prop-types';

// Error Boundary para capturar errores en componentes hijos, evita que un error en un componente rompa toda la aplicación

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { 
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        // Actualizar estado para que el próximo render muestre el fallback
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log del error
        console.error('❌ Error capturado por ErrorBoundary:', error);
        console.error('📍 Info del error:', errorInfo);
        
        this.setState({
            error,
            errorInfo
        });
    }

    handleReset = () => {
        this.setState({ 
            hasError: false,
            error: null,
            errorInfo: null
        });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-boundary-container">
                    <div className="error-boundary-card">
                        <h1>😕 Oops! Algo salió mal</h1>
                        <p>La aplicación encontró un error inesperado.</p>
                        
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="error-details">
                                <summary>Detalles técnicos</summary>
                                <pre>{this.state.error.toString()}</pre>
                                <pre>{this.state.errorInfo?.componentStack}</pre>
                            </details>
                        )}
                        
                        <button 
                            className="btn-reset-error"
                            onClick={this.handleReset}
                        >
                            🔄 Recargar aplicación
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

ErrorBoundary.propTypes = {
    children: PropTypes.node.isRequired
};

export default ErrorBoundary;