import { Component } from "react";
import PropTypes from "prop-types";

export class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err, info) {
    console.error("Error capturado por ErrorBoundary:", err, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <h2>Algo salió mal.</h2>
          <p>Por favor recarga la página para continuar.</p>
          <button onClick={() => window.location.reload()}>Recargar</button>
        </div>
      );
    }
    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
};
