'use client';

import { useRouter, useParams } from 'next/navigation';
import { useParentalControls } from '@/hooks/useParentalControls';
import '../../../components/styles.css';
import { useState, useEffect } from 'react';

export default function ParentalControlPage() {
    const router = useRouter();
    const params = useParams();
    const childUserId = params?.id as string;

    // Add a state for active tab
    const [activeTab, setActiveTab] = useState('timeLimit');

    const {
        // State
        timeLimitEnabled,
        timeLimit,
        bannedGenres,
        allGenres,
        error,
        success,
        loading,
        childProfile,
        
        // Actions
        setTimeLimitEnabled,
        setTimeLimit,
        handleGenreToggle,
        updateTimeLimit,
        updateBlockedGenres
    } = useParentalControls({ childUserId });

    const [timeLimitInput, setTimeLimitInput] = useState(timeLimit.toString());

    useEffect(() => {
        setTimeLimitInput(timeLimit.toString());
    }, [timeLimit]);

    return (
        <div className="page-container">
            <div className="content-area">
                <div className="content-inner">
                    {/* Back Button with improved styling */}
                    <button
                        onClick={() => router.back()}
                        className="back-button"
                    >
                        ← Back to Dashboard
                    </button>

                    <h2 className="page-title">Parental Controls</h2>
                    {childProfile?.fullname && (
                        <p className="child-name">
                            Settings for <span className="child-name-highlight">{childProfile.fullname}</span>
                        </p>
                    )}
                    
                    {/* Tab Navigation */}
                    <div className="tab-navigation">
                        <button 
                            className={`tab-button ${activeTab === 'timeLimit' ? 'active' : ''}`}
                            onClick={() => setActiveTab('timeLimit')}
                        >
                            Time Limits
                        </button>
                        <button 
                            className={`tab-button ${activeTab === 'genres' ? 'active' : ''}`}
                            onClick={() => setActiveTab('genres')}
                        >
                            Content Restrictions
                        </button>
                    </div>
                    
                    <div className="section-container">
                        {error && (
                            <div className="error-alert">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="success-alert">
                                {success}
                            </div>
                        )}

                        {/* Time Limit - Only show when timeLimit tab is active */}
                        {activeTab === 'timeLimit' && (
                            <div className="panel">
                                <h3 className="panel-title">Screen Time Limit</h3>
                                
                                {/* Improved toggle switch instead of checkbox */}
                                <div className="toggle-switch-container">
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={timeLimitEnabled}
                                            onChange={(e) => {
                                                setTimeLimitEnabled(e.target.checked);
                                                // Show save reminder when changed
                                                const saveReminder = document.getElementById('save-reminder');
                                                if (saveReminder) {
                                                    saveReminder.classList.add('visible');
                                                }
                                            }}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                    <span className="toggle-label">
                                        {timeLimitEnabled ? 'Daily time limit enabled' : 'No time limit (unlimited access)'}
                                    </span>
                                </div>
                                
                                {/* Time input controls - only disable time inputs when checkbox unchecked, not the entire section */}
                                <div className="time-controls">
                                    {timeLimitEnabled && (
                                        <>
                                            <div className="time-limit-display">
                                                <span className="time-limit-value">{timeLimit}</span>
                                                <span className="time-limit-unit">minutes per day</span>
                                            </div>
                                            
                                            {/* Range slider for more intuitive control */}
                                            <div className="slider-container">
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="240"
                                                    value={timeLimit}
                                                    disabled={!timeLimitEnabled}
                                                    onChange={(e) => {
                                                        const value = parseInt(e.target.value);
                                                        setTimeLimit(value);
                                                        setTimeLimitInput(value.toString());
                                                        
                                                        // Show save reminder when changed
                                                        const saveReminder = document.getElementById('save-reminder');
                                                        if (saveReminder) {
                                                            saveReminder.classList.add('visible');
                                                        }
                                                    }}
                                                    className="time-slider"
                                                />
                                                <div className="slider-markers">
                                                    <span>1 min</span>
                                                    <span>1 hour</span>
                                                    <span>2 hours</span>
                                                    <span>4 hours</span>
                                                </div>
                                            </div>
                                            
                                            {/* Text input for precise control */}
                                            <div className="input-group">
                                                <label htmlFor="timeLimit" className="input-label">
                                                    Or enter exact minutes:
                                                </label>
                                                <input
                                                    id="timeLimit"
                                                    type="number"
                                                    min="1"
                                                    max="240"
                                                    value={timeLimitInput}
                                                    disabled={!timeLimitEnabled}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        // Allow empty string for editing
                                                        setTimeLimitInput(val);
                                                        const num = parseInt(val, 10);
                                                        if (!Number.isNaN(num)) {
                                                            setTimeLimit(num < 1 ? 1 : num > 240 ? 240 : num);
                                                            
                                                            // Show save reminder when changed
                                                            const saveReminder = document.getElementById('save-reminder');
                                                            if (saveReminder) {
                                                                saveReminder.classList.add('visible');
                                                            }
                                                        }
                                                    }}
                                                    onBlur={(e) => {
                                                        const val = e.target.value;
                                                        const num = parseInt(val, 10);
                                                        if (val === '' || Number.isNaN(num) || num < 1) {
                                                            setTimeLimit(1);
                                                            setTimeLimitInput('1');
                                                        } else if (num > 240) {
                                                            setTimeLimit(240);
                                                            setTimeLimitInput('240');
                                                        } else {
                                                            setTimeLimit(num);
                                                            setTimeLimitInput(num.toString());
                                                        }
                                                    }}
                                                    className="time-input"
                                                />
                                            </div>
                                        </>
                                    )}
                                    
                                    <p className="help-text">
                                        {!timeLimitEnabled 
                                            ? 'No time restriction (unlimited access)' 
                                            : `${childProfile?.fullname || 'Child'} will be allowed to use the chatbot for ${timeLimit} minutes each day`}
                                    </p>
                                    
                                    <div className="update-button-container">
                                        <div id="save-reminder" className="save-reminder">
                                            Please save your changes
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                updateTimeLimit();
                                                const saveReminder = document.getElementById('save-reminder');
                                                if (saveReminder) {
                                                    saveReminder.classList.remove('visible');
                                                }
                                            }}
                                            disabled={loading}
                                            className="primary-button"
                                        >
                                            {loading ? 'Updating...' : 'Save Time Settings'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Banned Genres - Only show when genres tab is active */}
                        {activeTab === 'genres' && (
                            <div className="panel">
                                <h3 className="panel-title">Content Restrictions</h3>
                                <p className="genre-instruction">
                                    Select genres that should be <span className="restricted-text">restricted</span> for {childProfile?.fullname || 'child'}
                                </p>
                                
                                <div className="genre-grid">
                                    {allGenres.map((genre) => (
                                        <button
                                            key={genre.gid}
                                            type="button"
                                            onClick={() => handleGenreToggle(genre.genrename)}
                                            className={
                                                bannedGenres.includes(genre.genrename)
                                                    ? "genre-button active"
                                                    : "genre-button"
                                            }
                                        >
                                            {bannedGenres.includes(genre.genrename) && (
                                                <span className="restriction-icon">🚫</span>
                                            )}
                                            {genre.genrename}
                                        </button>
                                    ))}
                                </div>
                                
                                {/* Update Genres Button */}
                                <div className="update-button-container">
                                    <button
                                        type="button"
                                        onClick={updateBlockedGenres}
                                        disabled={loading}
                                        className="primary-button"
                                    >
                                        {loading ? 'Updating...' : 'Save Content Restrictions'}
                                    </button>
                                    <span className="restriction-note">
                                        {bannedGenres.length === 0 
                                            ? "No genres are currently restricted" 
                                            : `${bannedGenres.length} genre${bannedGenres.length !== 1 ? 's' : ''} restricted`}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}