'use client';

import { useRouter, useParams } from 'next/navigation';
import { useParentalControls } from '@/hooks/useParentalControls';
import { styles } from '../../../components/parent/parentalControlStyles';

export default function ParentalControlPage() {
    const router = useRouter();
    const params = useParams();
    const childUserId = params?.id as string;

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
        updateBlockedGenres,
        resetToDefaults
    } = useParentalControls({ childUserId });

    return (
        <div className={styles.pageContainer}>
            <div className={styles.contentArea}>
                <div className={styles.contentInner}>
                    {/* Back Button */}
                    <button
                        onClick={() => router.back()}
                        className={styles.backButton}
                    >
                        ← Back to Dashboard
                    </button>

                    <h2 className={styles.pageTitle}>Parental Controls</h2>
                    {childProfile?.fullname && (
                        <p className={styles.childName}>
                            Settings for <span className={styles.childNameHighlight}>{childProfile.fullname}</span>
                        </p>
                    )}
                    
                    <div className={styles.sectionContainer}>
                        {error && (
                            <div className={styles.errorAlert}>
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className={styles.successAlert}>
                                {success}
                            </div>
                        )}

                        {/* Time Limit */}
                        <div className={styles.panel}>
                            <h3 className={styles.panelTitle}>Screen Time Limit</h3>
                            
                            {/* Checkbox to enable/disable time limit */}
                            <div className={styles.checkboxWrapper}>
                                <input
                                    id="enableTimeLimit"
                                    type="checkbox"
                                    checked={timeLimitEnabled}
                                    onChange={(e) => setTimeLimitEnabled(e.target.checked)}
                                    className={styles.checkbox}
                                />
                                <label htmlFor="enableTimeLimit" className={styles.checkboxLabel}>
                                    Enable daily time limit
                                </label>
                            </div>
                            
                            {/* Time input controls - only enabled when checkbox is checked */}
                            <div className={timeLimitEnabled ? styles.timeControlsActive : styles.timeControlsInactive}>
                                <label htmlFor="timeLimit" className={styles.timeLabel}>
                                    Set Time Limit: <span className={styles.timeValue}>{timeLimit}</span> minutes per day
                                </label>
                                
                                {/* Slider for easy adjustment */}
                                <div className={styles.sliderContainer}>
                                    <input
                                        id="timeLimitSlider"
                                        type="range"
                                        min="1"
                                        max="240"
                                        step="5"
                                        value={timeLimit}
                                        disabled={!timeLimitEnabled}
                                        onChange={(e) => setTimeLimit(parseInt(e.target.value, 10))}
                                        className={styles.slider}
                                    />
                                    <div className={styles.sliderMarkers}>
                                        <span>1 min</span>
                                        <span>1 hr</span>
                                        <span>2 hr</span>
                                        <span>4 hr</span>
                                    </div>
                                </div>
                                
                                {/* Text input for precise control */}
                                <div className={styles.inputGroup}>
                                    <label htmlFor="timeLimit" className={styles.inputLabel}>
                                        Or enter exact minutes:
                                    </label>
                                    <input
                                        id="timeLimit"
                                        type="text"
                                        value={timeLimit.toString()}
                                        disabled={!timeLimitEnabled}
                                        onChange={(e) => {
                                            // Allow empty string temporarily during typing
                                            if (e.target.value === '') {
                                                setTimeLimit(1); // Default to 1 but don't show it yet
                                            } else {
                                                const val = parseInt(e.target.value, 10);
                                                if (!Number.isNaN(val)) {
                                                    setTimeLimit(val < 1 ? 1 : val);
                                                }
                                            }
                                        }}
                                        onBlur={(e) => {
                                            // When focus leaves the input, ensure a valid value
                                            const val = parseInt(e.target.value, 10);
                                            if (Number.isNaN(val) || val < 1) {
                                                setTimeLimit(1);
                                            }
                                        }}
                                        className={styles.textInput}
                                    />
                                </div>
                                
                                <p className={styles.helpText}>
                                    {!timeLimitEnabled 
                                        ? 'No time restriction (unlimited access)' 
                                        : `${childProfile?.fullname || 'Child'} will be allowed to use the chatbot for ${timeLimit} minutes each day`}
                                </p>
                                
                                <div className={styles.updateButtonContainer}>
                                    <button
                                        type="button"
                                        onClick={updateTimeLimit}
                                        disabled={loading}
                                        className={styles.primaryButton}
                                    >
                                        {loading ? 'Updating...' : 'Update Time Limit'}
                                    </button>
                                    <span className={styles.buttonHelpText}>
                                        Click to save this time setting only
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Banned Genres */}
                        <div className={styles.panel}>
                            <h3 className={styles.panelTitle}>Banned Genres</h3>
                            <label className={styles.checkboxLabel + " mb-3"}>
                                Select genres to restrict for {childProfile?.fullname || 'child'}
                            </label>
                            <div className={styles.genreGrid}>
                                {allGenres.map((genre) => (
                                    <button
                                        key={genre.gid}
                                        type="button"
                                        onClick={() => handleGenreToggle(genre.genrename)}
                                        className={
                                            bannedGenres.includes(genre.genrename)
                                                ? styles.genreButtonActive
                                                : styles.genreButtonInactive
                                        }
                                    >
                                        {genre.genrename}
                                    </button>
                                ))}
                            </div>
                            
                            {/* Update Genres Button */}
                            <div className={styles.updateButtonContainer}>
                                <button
                                    type="button"
                                    onClick={updateBlockedGenres}
                                    disabled={loading}
                                    className={styles.primaryButton}
                                >
                                    {loading ? 'Updating...' : 'Update Blocked Genres'}
                                </button>
                                <span className={styles.buttonHelpText}>
                                    Click to save genre restrictions only
                                </span>
                            </div>
                        </div>

                        {/* Page Actions */}
                        <div className={styles.bottomActions}>
                            <div className="flex space-x-3">
                                <button
                                    type="button"
                                    onClick={resetToDefaults}
                                    className={styles.secondaryButton}
                                >
                                    Reset to Default Settings
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}