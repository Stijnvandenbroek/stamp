import React, { useState } from 'react';
import Home from './components/Home';
import Quiz from './components/Quiz';
import axios from 'axios';
import getApiUrl from './utils/apiConfig';

function App() {
    const [sessionId, setSessionId] = useState('');
    const [quizStarted, setQuizStarted] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const pageStyle = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        minHeight: '100vh',
        backgroundColor: '#000000',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        overflowX: 'hidden',
        margin: '0',
        padding: '0',
    };

    const headerBarStyle = {
        position: 'fixed',
        top: 0,
        width: '100%',
        padding: '20px 40px',
        background: '#000000',
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
        zIndex: 1000,
    };

    const titleStyle = {
        fontSize: '2.5em',
        fontWeight: 'bold',
        marginTop: 0,
        marginBottom: 0,
        marginLeft: 25,
        textAlign: 'left',
        cursor: 'pointer',
    };

    const mainContentStyle = {
        width: '90%',
        maxWidth: '600px',
        textAlign: 'center',
        flex: '1',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        position: 'relative',
    };

    const transitionStyles = {
        container: {
            position: 'absolute',
            width: '100%',
            opacity: isTransitioning ? 0 : 1,
            transform: isTransitioning ? 'scale(0.95)' : 'scale(1)',
            transition: 'opacity 300ms ease-in-out, transform 300ms ease-in-out',
        }
    };

    const handleUploadClick = () => {
        setIsTransitioning(true);
        
        // Slight delay to allow transition to occur before changing state
        setTimeout(() => {
            setSessionId('');
            setQuizStarted(false);
            setIsTransitioning(false);
        }, 300);
    };

    const handleTitleClick = () => {
        handleUploadClick();
    };

    const handleStartQuiz = (sessionId) => {
        setIsTransitioning(true);
        setSessionId(sessionId);
        
        // Slight delay to allow transition to occur before changing state
        setTimeout(() => {
            setQuizStarted(true);
            setIsTransitioning(false);
        }, 300);
    };

    const handleRetryQuiz = async () => {
        try {
            const apiUrl = getApiUrl();
            await axios.post(`${apiUrl}/reset-session/`, {
                session_id: sessionId,
            });
            setIsTransitioning(true);
            
            setTimeout(() => {
                setQuizStarted(false);
                setIsTransitioning(false);
            }, 300);
        } catch (error) {
            alert('Error resetting session: ' + (error.response?.data?.error || error.message));
        }
    };

    return (
        <div style={pageStyle}>
            <div style={headerBarStyle}>
                <h1 style={titleStyle} onClick={handleTitleClick}>Stamp</h1>
            </div>
            <div style={mainContentStyle}>
                {!quizStarted && (
                    <div style={{
                        ...transitionStyles.container,
                        visibility: isTransitioning ? 'hidden' : 'visible'
                    }}>
                        <Home 
                            setSessionId={handleStartQuiz} 
                            setQuizStarted={setQuizStarted} 
                        />
                    </div>
                )}
                
                {quizStarted && (
                    <div style={{
                        ...transitionStyles.container,
                        visibility: isTransitioning ? 'hidden' : 'visible'
                    }}>
                        <Quiz 
                            sessionId={sessionId} 
                            onGoHome={handleUploadClick} 
                            onRetry={handleRetryQuiz} 
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
