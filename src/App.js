import React from 'react';
import Header from './components/Header/Header';
import { BrowserRouter as Router,Route,Routes } from 'react-router-dom';
import Signup from './Pages/Signup';
import Dashboard from './Pages/Dashboard';
import { ToastContainer } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";
import 'antd/dist/reset.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    // You can log error info here
    console.error('ErrorBoundary caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return <div style={{ padding: 32, color: 'red', fontWeight: 700 }}>
        <h2>Something went wrong.</h2>
        <pre>{this.state.error && this.state.error.toString()}</pre>
      </div>;
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <ToastContainer/>
      <Router>
        <Routes>
          <Route path="/" element={<Signup/>}/>
          <Route path="/dashboard" element={<Dashboard/>}/>
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
