'use client';

import { useRouter, useParams } from 'next/navigation';
import { useParentalControls } from '@/hooks/useParentalControls';
import { styles } from '../../../components/parent/parentalControlStyles';
import { useState, useEffect } from 'react';

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
        updateBlockedGenres
    } = useParentalControls({ childUserId });

    const [timeLimitInput, setTimeLimitInput] = useState(timeLimit.toString());

    useEffect(() => {
        setTimeLimitInput(timeLimit.toString());
    }, [timeLimit]);

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
                                
                                {/* Text input for precise control */}
                                <div className={styles.inputGroup}>
                                    <label htmlFor="timeLimit" className={styles.inputLabel}>
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
                    </div>
                </div>
            </div>
        </div>
    );
}