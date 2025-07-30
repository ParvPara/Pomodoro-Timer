import React from 'react';

function Privacy({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 backdrop-blur-lg bg-opacity-90 max-w-2xl w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            Privacy Policy
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6 text-gray-300">
          <section>
            <h3 className="text-xl font-semibold text-white mb-2">Data Collection</h3>
            <p>
              This Pomodoro Timer app does not collect, store, or transmit any personal data. 
              Your Spotify authentication is handled directly through Spotify's official OAuth flow, 
              and no account credentials are ever stored by this application.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-white mb-2">Spotify Integration</h3>
            <ul className="list-disc list-inside space-y-2">
              <li>Your Spotify access token is temporarily stored in your browser's local storage only</li>
              <li>The token is automatically cleared when you close your browser</li>
              <li>No playlist data or listening history is permanently stored</li>
              <li>All Spotify interactions happen in real-time through official Spotify Web APIs</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-white mb-2">Local Storage</h3>
            <p>
              The only data stored locally in your browser is your temporary Spotify access token, 
              which is necessary for the app to function with Spotify's services. This token is 
              automatically removed when you close your browser or after its expiration (1 hour).
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-white mb-2">Third-Party Services</h3>
            <p>
              This app only interacts with Spotify's official APIs. No other third-party services 
              are used, and no data is shared with any external services beyond the necessary 
              Spotify API calls to control your music playback.
            </p>
          </section>

          <div className="mt-8 pt-6 border-t border-gray-700">
            <p className="text-sm text-gray-400">
              For any privacy concerns or questions, please contact us or refer to Spotify's privacy policy 
              for information about how Spotify handles your data during API interactions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Privacy; 