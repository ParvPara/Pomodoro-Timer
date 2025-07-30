import React, { useEffect, useState, useRef, useCallback } from 'react';
import './App.css';
import Privacy from './components/Privacy';

const CLIENT_ID = 'fc6a4ed3b43d49ada3af9c20f181896e';
const REDIRECT_URI = 'http://localhost:3000';
const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const RESPONSE_TYPE = 'token';
const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-modify-playback-state',
  'user-read-playback-state',
  'playlist-read-private',
  'playlist-read-collaborative',
];

const TIMER_TYPES = {
  FOCUS: 'focus',
  REST: 'rest',
};

function App() {
  const [token, setToken] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [timer, setTimer] = useState(1500); // 25 minutes
  const [isRunning, setIsRunning] = useState(false);
  const [volume, setVolume] = useState(50);
  const [timerType, setTimerType] = useState(TIMER_TYPES.FOCUS);
  const [focusTime, setFocusTime] = useState(25);
  const [restTime, setRestTime] = useState(5);
  const [intervals, setIntervals] = useState(1);
  const [currentInterval, setCurrentInterval] = useState(0);
  const [autoPauseMusic, setAutoPauseMusic] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const intervalRef = useRef(null);

  // Create audio context and sound function
  const playNotificationSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);

      // Clean up
      setTimeout(() => {
        audioContext.close();
      }, 1000);
    } catch (error) {
      console.log('Audio play failed:', error);
    }
  }, []);

  // Define Spotify functions with useCallback
  const playSpotify = useCallback((playlistId) => {
    if (!token) return;
    fetch(`https://api.spotify.com/v1/me/player/play`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        context_uri: `spotify:playlist:${playlistId}`,
      }),
    });
  }, [token]);

  const pauseSpotify = useCallback(() => {
    if (!token) return;
    fetch(`https://api.spotify.com/v1/me/player/pause`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }, [token]);

  const updateVolume = useCallback((newVolume) => {
    if (!token) return;
    setVolume(newVolume);
    fetch('https://api.spotify.com/v1/me/player/volume?volume_percent=' + newVolume, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }, [token]);

  // Handle token from Spotify
  useEffect(() => {
    const hash = window.location.hash;
    let _token = window.localStorage.getItem('token');

    if (!_token && hash) {
      _token = hash
        .substring(1)
        .split('&')
        .find(elem => elem.startsWith('access_token'))
        .split('=')[1];

      window.location.hash = '';
      window.localStorage.setItem('token', _token);
    }
    setToken(_token);
  }, []);

  // Fetch user playlists
  useEffect(() => {
    if (!token) return;
    fetch('https://api.spotify.com/v1/me/playlists', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => res.json())
      .then(data => {
        setPlaylists(data.items);
      });
  }, [token]);

  // Timer logic
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            playNotificationSound();
            const newType = timerType === TIMER_TYPES.FOCUS ? TIMER_TYPES.REST : TIMER_TYPES.FOCUS;
            setTimerType(newType);

            // Handle Spotify playback based on timer type and autoPauseMusic setting
            if (autoPauseMusic) {
              if (newType === TIMER_TYPES.REST) {
                pauseSpotify();
              } else if (selectedPlaylist) {
                playSpotify(selectedPlaylist);
              }
            }

            if (newType === TIMER_TYPES.FOCUS) {
              const nextInterval = currentInterval + 1;
              if (nextInterval >= intervals) {
                setIsRunning(false);
                pauseSpotify();
                setCurrentInterval(0);
                return 0;
              }
              setCurrentInterval(nextInterval);
            }

            const newTime = newType === TIMER_TYPES.FOCUS ? focusTime * 60 : restTime * 60;
            if (!(newType === TIMER_TYPES.FOCUS && currentInterval >= intervals - 1)) {
              setTimeout(() => {
                setTimer(newTime);
                setIsRunning(true);
              }, 0);
            }
            return newTime;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, timerType, focusTime, restTime, intervals, currentInterval, pauseSpotify, playNotificationSound, selectedPlaylist, playSpotify, autoPauseMusic]);

  const startTimer = () => {
    setCurrentInterval(0);
    setTimerType(TIMER_TYPES.FOCUS);
    setTimer(focusTime * 60);
    setIsRunning(true);
    if (selectedPlaylist) playSpotify(selectedPlaylist);
  };

  const resetTimer = () => {
    setTimer(timerType === TIMER_TYPES.FOCUS ? focusTime * 60 : restTime * 60);
    setIsRunning(false);
    setCurrentInterval(0);
    pauseSpotify();
  };

  const addTime = (minutes) => {
    setTimer(prev => prev + (minutes * 60));
  };

  const updateTimerSettings = (type, value) => {
    const newValue = value === '' || isNaN(value) ? 0 : Math.max(0, Math.min(60, parseInt(value)));
    if (type === TIMER_TYPES.FOCUS) {
      setFocusTime(newValue);
      if (timerType === TIMER_TYPES.FOCUS && !isRunning) {
        setTimer(newValue * 60);
      }
    } else {
      setRestTime(newValue);
      if (timerType === TIMER_TYPES.REST && !isRunning) {
        setTimer(newValue * 60);
      }
    }
  };

  const updateIntervals = (value) => {
    const newValue = value === '' || isNaN(value) ? 1 : Math.max(1, Math.min(10, parseInt(value)));
    setIntervals(newValue);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-screen">
        {/* Main Title */}
        <div className="mb-12 text-center">
          <h1 className="text-6xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-green-400 animate-gradient">
            Pomodoro Spotify
          </h1>
          <p className="text-gray-400 text-lg">
            Focus better with timed music sessions
          </p>
        </div>

        <div className="w-full max-w-4xl flex flex-col lg:flex-row gap-8 items-center">
          {/* Timer Settings */}
          <div className="lg:w-1/4 bg-gray-800 rounded-2xl shadow-2xl p-6 backdrop-blur-lg bg-opacity-50">
            <h2 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
              Timer Settings
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Focus Time (minutes)</label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={focusTime || ''}
                  onChange={(e) => updateTimerSettings(TIMER_TYPES.FOCUS, e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Rest Time (minutes)</label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={restTime || ''}
                  onChange={(e) => updateTimerSettings(TIMER_TYPES.REST, e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Number of Intervals</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={intervals || ''}
                  onChange={(e) => updateIntervals(e.target.value)}
                  className="input"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Each interval is one Focus-Rest cycle
                </p>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">Auto-pause music during rest</label>
                <button
                  onClick={() => setAutoPauseMusic(!autoPauseMusic)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                    autoPauseMusic ? 'bg-purple-500' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                      autoPauseMusic ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  className="btn-secondary flex-1"
                  onClick={() => addTime(1)}
                  disabled={!isRunning}
                >
                  +1 min
                </button>
                <button
                  className="btn-secondary flex-1"
                  onClick={() => addTime(5)}
                  disabled={!isRunning}
                >
                  +5 min
                </button>
              </div>
            </div>
          </div>

          {/* Pomodoro Timer */}
          <div className="lg:flex-1 bg-gray-800 rounded-2xl shadow-2xl p-8 backdrop-blur-lg bg-opacity-50">
            <h1 className="text-5xl font-bold mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
              {timerType === TIMER_TYPES.FOCUS ? 'Focus Time' : 'Rest Time'}
            </h1>
            
            <div className="flex flex-col items-center justify-center space-y-8">
              <div className="relative w-64 h-64 flex items-center justify-center">
                <div className={`absolute inset-0 rounded-full opacity-20 animate-pulse ${
                  timerType === TIMER_TYPES.FOCUS 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                    : 'bg-gradient-to-r from-green-500 to-blue-500'
                }`}></div>
                <div className="text-7xl font-bold tracking-tight">
                  {`${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, '0')}`}
                </div>
              </div>

              {intervals > 1 && (
                <div className="flex items-center justify-center w-full mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="text-gray-300 font-medium">
                      Interval {currentInterval + 1} of {intervals}
                    </div>
                    <div className="h-1 w-32 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          timerType === TIMER_TYPES.FOCUS 
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                            : 'bg-gradient-to-r from-green-500 to-blue-500'
                        }`}
                        style={{ width: `${((currentInterval) / intervals) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  className={`btn-primary ${
                    timerType === TIMER_TYPES.FOCUS 
                      ? 'bg-gradient-to-r from-purple-400 to-pink-500 hover:from-purple-500 hover:to-pink-600'
                      : 'bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600'
                  }`}
                  onClick={isRunning ? resetTimer : startTimer}
                >
                  {isRunning ? 'Reset' : 'Start'}
                </button>
                {isRunning && (
                  <button
                    className="btn-secondary"
                    onClick={() => setIsRunning(false)}
                  >
                    Pause
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Spotify Sidebar */}
          <div className="lg:w-1/4 bg-gray-800 rounded-2xl shadow-2xl p-6 backdrop-blur-lg bg-opacity-50">
            <h2 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">
              Spotify
            </h2>
            
            {!token ? (
              <div className="flex flex-col items-center space-y-4">
                <p className="text-gray-300 text-center">Connect with Spotify to enhance your focus sessions with your favorite music.</p>
                <a
                  className="w-full py-3 px-6 rounded-lg bg-[#1DB954] hover:bg-[#1ed760] transition-colors duration-300 font-semibold text-center"
                  href={`${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=${RESPONSE_TYPE}&scope=${SCOPES.join('%20')}`}
                >
                  Connect Spotify
                </a>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">Select Playlist</label>
                  <select
                    className="input"
                    onChange={(e) => setSelectedPlaylist(e.target.value)}
                  >
                    <option value="">Choose a playlist</option>
                    {playlists.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Volume: {volume}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => updateVolume(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Privacy Policy Link */}
        <button
          onClick={() => setShowPrivacy(true)}
          className="mt-8 text-sm text-gray-400 hover:text-white transition-colors"
        >
          Privacy Policy
        </button>
      </div>

      {/* Privacy Modal */}
      {showPrivacy && <Privacy onClose={() => setShowPrivacy(false)} />}
    </div>
  );
}

export default App;
