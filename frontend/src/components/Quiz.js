import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Quiz = ({ sessionId, onGoHome, onRetry }) => {
    const API_URL = process.env.REACT_APP_API_URL;
    const [questionData, setQuestionData] = useState(null);
    const [selectedAnswers, setSelectedAnswers] = useState([]);
    const [userAnswer, setUserAnswer] = useState('');
    const [totalQuestions, setTotalQuestions] = useState(0);
    const [correctAnswerCount, setCorrectAnswersCount] = useState(0);
    const [incorrectAnswersCount, setIncorrectAnswersCount] = useState(0);
    const [correctAnswers, setCorrectAnswers] = useState('');
    const [quizCompleted, setQuizCompleted] = useState(false);
    const [timer, setTimer] = useState(0);
    const [timerId, setTimerId] = useState(null);
    const [feedback, setFeedback] = useState('');
    const [isFeedbackVisible, setIsFeedbackVisible] = useState(false);
    const [fadeOut, setFadeOut] = useState(false);
    const [showResults, setShowResults] = useState(false);

    // Styles
    const pageStyle = {
        backgroundColor: 'black',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        flexDirection: 'column',
    };

    const timerStyle = {
        color: 'white',
        fontSize: '24px',
        marginBottom: '20px',
    };

    const containerStyle = {
        backgroundColor: '#333',
        padding: '30px',
        borderRadius: '15px',
        width: '400px',
        height: '550px',
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.5)',
        textAlign: 'center',
        overflowY: 'auto',
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.5s ease-out',
    };

    const buttonStyle = {
        backgroundColor: '#555',
        color: 'white',
        padding: '10px 20px',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        marginTop: '15px',
        fontWeight: 'bold',
        width: '100%',
    };

    const optionStyle = {
        display: 'flex',
        alignItems: 'center',
        padding: '12px',
        backgroundColor: '#444',
        borderRadius: '5px',
        margin: '5px 0',
        justifyContent: 'center',
        cursor: 'pointer',
        outline: 'none',
        border: '2px solid transparent',
    };

    const selectedOptionStyle = {
        ...optionStyle,
        border: '2px solid #0072ff',
    };

    const inputStyle = {
        width: '95%',
        padding: '10px',
        borderRadius: '5px',
        backgroundColor: '#444',
        color: 'white',
        border: 'none',
        textAlign: 'center',
        marginTop: '15px',
    };

    const feedbackContainerStyle = {
        backgroundColor: '#ffcccc',
        padding: '15px',
        borderRadius: '5px',
        marginTop: '20px',
        color: 'white',
        border: '1px solid #d8000c',
        textAlign: 'center',
    };

    const disabledOptionStyle = {
        ...optionStyle,
        opacity: 0.5,
        pointerEvents: 'none',
    };

    const resultContainerStyle = {
        backgroundColor: '#333',
        padding: '30px',
        borderRadius: '15px',
        width: '400px',
        textAlign: 'center',
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.5)',
        opacity: showResults ? 1 : 0,
        transform: showResults ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
    };

    // Keyboard event handler
    const handleKeyPress = (event) => {
        if (event.key === 'Enter') {
            if (isFeedbackVisible) {
                handleContinueClick();
            } else {
                const canSubmit = questionData.options.length > 1 
                    ? selectedAnswers.length > 0 
                    : userAnswer.trim() !== '';
                
                if (canSubmit) {
                    handleSubmit();
                }
            }
        }
    };

    // Event listeners
    useEffect(() => {
        document.addEventListener('keypress', handleKeyPress);
        return () => {
            document.removeEventListener('keypress', handleKeyPress);
        };
    }, [isFeedbackVisible, selectedAnswers, userAnswer, questionData]);

    const fetchQuestion = async () => {
        try {
            const response = await axios.get(`${API_URL}/next-question/?session_id=${sessionId}`);
            console.log("Fetched Question Data:", response.data);

            if (response.data.message === 'Quiz complete!') {
                setFadeOut(true);
                setTimeout(() => {
                    setQuizCompleted(true);
                    setQuestionData(null);
                    setTimeout(() => {
                        setShowResults(true);
                    }, 100);
                }, 500);
            } else {
                setQuestionData(response.data);
                setSelectedAnswers([]);
                setUserAnswer('');
                setFeedback('');
                setIsFeedbackVisible(false);
            }
        } catch (error) {
            alert('Error fetching question: ' + (error.response?.data?.error || error.message));
        }
    };

    const fetchQuizStats = async () => {
        try {
            const response = await axios.get(`${API_URL}/quiz-stats/?session_id=${sessionId}`);
            setTotalQuestions(response.data.total_questions);
            setCorrectAnswersCount(response.data.correct_answers);
            setIncorrectAnswersCount(response.data.incorrect_answers);
        } catch (error) {
            console.error('Error fetching quiz stats:', error);
        }
    };

    const handleMultipleAnswerChange = (answerText) => {
        setSelectedAnswers((prev) => {
            if (prev.includes(answerText)) {
                return prev.filter((answer) => answer !== answerText);
            }
            return [...prev, answerText];
        });
    };

    const handleAnswerChange = (answerText) => {
        setSelectedAnswers([answerText]);
    };

    const handleUserAnswerChange = (event) => {
        setUserAnswer(event.target.value);
    };

    const handleContinueClick = () => {
        setIsFeedbackVisible(false);
        setFeedback('');
        fetchQuestion();
    };

    const handleSubmit = async () => {
        let submissionData;
        if (questionData.options.length > 1) {
            submissionData = {
                session_id: sessionId,
                selected_answers: selectedAnswers,
            };
        } else {
            submissionData = {
                session_id: sessionId,
                selected_answers: [userAnswer.trim()],
            };
        }
    
        try {
            const response = await axios.post(`${API_URL}/submit-answer/`, submissionData);
            const result = response.data.result;
            setFeedback(result);
            setIsFeedbackVisible(true);
    
            if (result === 'Correct') {
                fetchQuestion();
            } else {
                setCorrectAnswers(response.data.correct_answers.join(', '));
                await moveQuestionToBottom();
            }
    
            fetchQuizStats();
        } catch (error) {
            alert('Error submitting answer: ' + (error.response?.data?.error || error.message));
        }
    };

    const moveQuestionToBottom = async () => {
        try {
            const questionIndex = questionData.question_index;
            await axios.post(`${API_URL}/move-question-to-bottom/`, {
                session_id: sessionId,
                question_index: questionIndex,
            });
        } catch (error) {
            alert('Error moving question to bottom: ' + (error.response?.data?.error || error.message));
        }
    };

    useEffect(() => {
        fetchQuestion();
        fetchQuizStats();
        const id = setInterval(() => setTimer((prev) => prev + 1), 1000);
        setTimerId(id);

        return () => {
            clearInterval(id);
        };
    }, [sessionId]);

    useEffect(() => {
        if (quizCompleted) {
            clearInterval(timerId);
        }
    }, [quizCompleted, timerId]);

    const formatTime = (totalSeconds) => {
        const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
        const seconds = String(totalSeconds % 60).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    };

    if (quizCompleted) {
        const totalAnswered = correctAnswerCount + (totalQuestions - correctAnswerCount);
        const percentageCorrect = totalAnswered > 0 ? (correctAnswerCount / (correctAnswerCount + incorrectAnswersCount)) * 100 : 0;

        return (
            <div style={pageStyle}>
                <div style={resultContainerStyle}>
                    <h2>Quiz Completed!</h2>
                    <p>{formatTime(timer)}</p>
                    <div style={{ margin: '20px auto', height: '300px', width: '50px', background: '#444', borderRadius: '5px', position: 'relative', overflow: 'hidden' }}>
                        <div
                            style={{
                                background: '#4caf50',
                                height: showResults ? `${percentageCorrect}%` : '0%',
                                width: '100%',
                                borderRadius: '5px',
                                position: 'absolute',
                                bottom: 0,
                                transition: 'height 1s ease-out',
                            }}
                        />
                    </div>
                    <p>{percentageCorrect.toFixed(0)}% Correct</p>
                    <button onClick={onGoHome} style={{...buttonStyle, opacity: showResults ? 1 : 0, transition: 'opacity 0.5s ease-out', transitionDelay: '0.5s'}}>
                        Go Home
                    </button>
                    <button onClick={onRetry} style={{...buttonStyle, opacity: showResults ? 1 : 0, transition: 'opacity 0.5s ease-out', transitionDelay: '0.7s'}}>
                        Retry Quiz
                    </button>
                </div>
            </div>
        );
    }

    if (!questionData) return <div style={{ color: 'white', textAlign: 'center', paddingTop: '50px' }}>Loading...</div>;

    const hasMultipleOptions = questionData.options.length > 1;
    const hasMultipleCorrectAnswers = questionData.multiple_choice;

    return (
        <div style={pageStyle}>
            <div style={timerStyle}>{formatTime(timer)}</div>
            <div style={containerStyle}>
                <h2>{questionData.question}</h2>
                <div>
                    {hasMultipleOptions ? (
                        hasMultipleCorrectAnswers ? (
                            questionData.options.map((option, index) => (
                                <label
                                    key={index}
                                    style={isFeedbackVisible ? disabledOptionStyle : selectedAnswers.includes(option) ? selectedOptionStyle : optionStyle}
                                    onClick={() => !isFeedbackVisible && handleMultipleAnswerChange(option)}
                                >
                                    <input
                                        type="checkbox"
                                        value={option}
                                        checked={selectedAnswers.includes(option)}
                                        onChange={() => !isFeedbackVisible && handleMultipleAnswerChange(option)}
                                        style={{ display: 'none' }}
                                        disabled={isFeedbackVisible}
                                    />
                                    {option}
                                </label>
                            ))
                        ) : (
                            questionData.options.map((option, index) => (
                                <label
                                    key={index}
                                    style={isFeedbackVisible ? disabledOptionStyle : selectedAnswers.includes(option) ? selectedOptionStyle : optionStyle}
                                    onClick={() => !isFeedbackVisible && handleAnswerChange(option)}
                                >
                                    <input
                                        type="radio"
                                        name="single-answer"
                                        value={option}
                                        checked={selectedAnswers.includes(option)}
                                        onChange={() => !isFeedbackVisible && handleAnswerChange(option)}
                                        style={{ display: 'none' }}
                                        disabled={isFeedbackVisible}
                                    />
                                    {option}
                                </label>
                            ))
                        )
                    ) : (
                        <div>
                            <input
                                type="text"
                                value={userAnswer}
                                onChange={handleUserAnswerChange}
                                placeholder="Type your answer here"
                                style={inputStyle}
                                disabled={isFeedbackVisible}
                            />
                        </div>
                    )}
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={isFeedbackVisible || (hasMultipleOptions ? selectedAnswers.length === 0 : userAnswer.trim() === '')}
                    style={buttonStyle}
                >
                    Submit
                </button>
                {feedback && feedback !== 'Correct' && (
                    <div style={feedbackContainerStyle}>
                        <p>Correct answer: {correctAnswers}</p>
                        <button
                            onClick={handleContinueClick}
                            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                        >
                            Continue
                        </button>
                    </div>
                )}
                <div style={{ marginTop: '20px', color: 'white' }}>
                    <div style={{ background: '#555', borderRadius: '5px', height: '20px', width: '100%' }}>
                        <div
                            style={{
                                background: '#4caf50',
                                height: '100%',
                                width: `${(correctAnswerCount / totalQuestions) * 100}%`,
                                borderRadius: '5px',
                                transition: 'width 0.3s ease',
                            }}
                        />
                    </div>
                    <p>{correctAnswerCount}/{totalQuestions}</p>
                </div>
            </div>
        </div>
    );
};

export default Quiz;
