import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Home = ({ setSessionId, setQuizStarted }) => {
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  // File state
  const [files, setFiles] = useState([]);
  const [fileNames, setFileNames] = useState('');
  const [isFileListVisible, setIsFileListVisible] = useState(false);

  // Settings state
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [setting1, setSetting1] = useState(false);
  const [setting2, setSetting2] = useState(false);
  const [quizSettings, setQuizSettings] = useState({
    repeat_on_mistake: false,
    shuffle_answers: false,
    randomise_order: false,
    question_count_multiplier: 1,
  });

  // API functions
  const handleFileUpload = async () => {
    if (files.length === 0) return alert("Please select files");

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    formData.append('settings', JSON.stringify(quizSettings));
    
    console.log('API URL:', API_URL);
    console.log('Uploading files:', files.map(f => f.name));
    console.log('Quiz settings:', quizSettings);

    try {
      console.log('Sending request to:', `${API_URL}/upload-csv-with-settings/`);
      const response = await axios.post(`${API_URL}/upload-csv-with-settings/`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('Response received:', response.data);
      setSessionId(response.data.session_id);
      setQuizStarted(true);
    } catch (error) {
      console.error('Upload error:', error);
      console.error('Response data:', error.response?.data);
      alert('Error uploading files: ' + (error.response?.data?.error || error.message));
    }
  };

  // Event handlers
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    setFileNames(selectedFiles.map(file => file.name).join(', '));
  };

  const toggleSettings = () => {
    setSettingsOpen(!settingsOpen);
  };

  const handleToggle1 = () => {
    const newSetting = !setting1;
    setSetting1(newSetting);
    setQuizSettings({ ...quizSettings, repeat_on_mistake: newSetting });
  };

  const handleToggle2 = () => {
    const newSetting = !setting2;
    setSetting2(newSetting);
    setQuizSettings({ ...quizSettings, shuffle_answers: newSetting });
  };

  const handleRandomizeOrderToggle = () => {
    setQuizSettings({ ...quizSettings, randomise_order: !quizSettings.randomise_order });
  };

  const handleQuestionCountChange = (e) => {
    setQuizSettings({ ...quizSettings, question_count_multiplier: parseInt(e.target.value) });
  };

  // Effects
  useEffect(() => {
    if (fileNames) {
      const timer = setTimeout(() => {
        setIsFileListVisible(true);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setIsFileListVisible(false);
    }
  }, [fileNames]);

  // Styles
  const containerStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#000000',
    color: 'white',
    fontFamily: 'Arial, sans-serif',
    padding: '20px',
    boxSizing: 'border-box',
  };

  const leftContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '30px',
  };

  const rightContainerStyle = {
    backgroundColor: '#333',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
    width: '300px',
    height: '360px',
    display: 'flex',
    flexDirection: 'column',
    opacity: isFileListVisible ? 1 : 0,
    transform: isFileListVisible ? 'translateX(0)' : 'translateX(20px)',
    transition: 'opacity 0.5s ease, transform 0.5s ease',
    pointerEvents: isFileListVisible ? 'auto' : 'none',
    position: 'relative',
  };

  const uploadContainerStyle = {
    backgroundColor: '#333',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
    textAlign: 'center',
    width: '300px',
    marginBottom: '30px',
  };

  const settingsContainerStyle = {
    backgroundColor: '#333',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
    width: '300px',
    maxHeight: settingsOpen ? '200px' : '0',
    opacity: settingsOpen ? '1' : '0',
    transition: 'max-height 0.3s ease, opacity 0.3s ease',
    overflow: 'hidden',
  };

  const buttonStyle = {
    padding: '10px 20px',
    backgroundColor: '#0072ff',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '1em',
    transition: 'background-color 0.3s',
    width: '100%',
    height: '40px',
  };

  const fileInputContainerStyle = {
    marginBottom: '20px',
    padding: '5px',
    backgroundColor: '#444',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    width: '97%',
    cursor: 'pointer',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1em',
  };

  const hiddenFileInput = {
    display: 'none',
  };

  const inputStyle = {
    width: '30px',
    height: '8px',
    padding: '5px',
    marginRight: '5px',
    textAlign: 'center',
    border: '1px solid #555',
    borderRadius: '5px',
    backgroundColor: '#444',
    color: 'white',
    appearance: 'none',
    outline: 'none',
  };

  const hideSpinnerStyle = {
    '&::-webkit-inner-spin-button, &::-webkit-outer-spin-button': {
      display: 'none',
      '-webkit-appearance': 'none',
    },
    '&[type=number]': {
      '-moz-appearance': 'textfield',
    },
  };

  const toggleStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    padding: '5px',
    borderRadius: '5px',
    backgroundColor: '#555',
    cursor: 'pointer',
  };

  const toggleSwitchStyle = (isActive) => ({
    width: '40px',
    height: '20px',
    backgroundColor: isActive ? '#0072ff' : '#444',
    borderRadius: '20px',
    marginRight: '5px',
    position: 'relative',
    transition: 'background-color 0.3s',
  });

  const toggleCircleStyle = (isActive) => ({
    width: '16px',
    height: '16px',
    backgroundColor: 'white',
    borderRadius: '50%',
    position: 'absolute',
    top: '2px',
    left: isActive ? '20px' : '2px',
    transition: 'left 0.3s',
  });

  const settingTextStyle = {
    fontSize: '0.9em',
    color: 'white',
    marginLeft: '5px',
  };

  const fileNameHeaderStyle = {
    fontWeight: 'bold', 
    marginBottom: '10px',
    position: 'sticky',
    top: '0',
    backgroundColor: '#333',
    zIndex: 1,
    paddingBottom: '10px',
  };

  const fileNamesScrollContainerStyle = {
    overflowY: 'auto',
    flexGrow: 1,
  };

  const fileNamesContainerStyle = {
    backgroundColor: '#444',
    borderRadius: '5px', 
    padding: '10px',
    marginTop: '10px',
    fontSize: '0.9em',
    color: 'white',
    wordBreak: 'break-all',
  };

  return (
    <div style={containerStyle}>
      <div style={leftContainerStyle}>
        <div style={uploadContainerStyle}>
          <label style={{ cursor: 'pointer', marginBottom: '20px', width: '100%' }}>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              style={hiddenFileInput}
              multiple
            />
            <div style={fileInputContainerStyle}>Choose Files</div>
          </label>
          <button onClick={handleFileUpload} style={buttonStyle}>
            Start Quiz
          </button>
        </div>

        <div
          onClick={toggleSettings}
          style={{ 
            color: 'white', 
            cursor: 'pointer', 
            fontSize: '1em', 
            marginBottom: '10px', 
          }}
        >
          <span>{settingsOpen ? 'Hide Settings' : 'Show Settings'}</span>
        </div>

        <div style={settingsContainerStyle}>
          <div style={toggleStyle}>
            <span style={settingTextStyle}>Repeat on Mistake</span>
            <div onClick={handleToggle1} style={toggleSwitchStyle(setting1)}>
              <div style={toggleCircleStyle(setting1)} />
            </div>
          </div>
          <div style={toggleStyle}>
            <span style={settingTextStyle}>Shuffle Answers</span>
            <div onClick={handleToggle2} style={toggleSwitchStyle(setting2)}>
              <div style={toggleCircleStyle(setting2)} />
            </div>
          </div>
          <div style={toggleStyle}>
            <span style={settingTextStyle}>Randomize Order</span>
            <div
              onClick={handleRandomizeOrderToggle}
              style={toggleSwitchStyle(quizSettings.randomise_order)}
            >
              <div
                style={toggleCircleStyle(quizSettings.randomise_order)}
              />
            </div>
          </div>
          <div style={toggleStyle}>
            <span style={settingTextStyle}>Question Count Multiplier</span>
            <input
              type="number"
              value={quizSettings.question_count_multiplier}
              onChange={handleQuestionCountChange}
              style={{ ...inputStyle, ...hideSpinnerStyle }}
            />
          </div>
        </div>
      </div>

      {fileNames && (
        <div style={rightContainerStyle}>
          <div style={fileNameHeaderStyle}>Selected Files:</div>
          <div style={fileNamesScrollContainerStyle}>
            <div style={fileNamesContainerStyle}>
              {fileNames.split(', ').map((fileName, index) => (
                <div key={index} style={{ marginBottom: '5px' }}>
                  {fileName}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
