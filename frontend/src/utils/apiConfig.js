// Dynamically determine API URL based on how the frontend is accessed
const getApiUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  const currentHost = window.location.hostname;
  const apiPort = '8000';

  if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
    return `http://localhost:${apiPort}`;
  }

  // Use same host for LAN/network access
  return `http://${currentHost}:${apiPort}`;
};

export default getApiUrl;
