import { useState, useEffect } from 'react';
import Joyride, { STATUS, EVENTS, ACTIONS, type CallBackProps } from 'react-joyride';
import { useAuth } from '../context/AuthContext';
import { useFiles } from '../context/FileContext';
import { tourStyles, tourLocale, commonTourProps } from './tourConfig';

const UploadOnboardingTour = () => {
    const { user, token, syncUserProfile } = useAuth();
    const { hasItems } = useFiles();
    const [run, setRun] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);

    // Define steps based on state (Empty vs Has Items)
    const steps = hasItems ? [
        {
            target: '#uploader-list-card',
            content: '업로드된 도면 목록입니다. 여기서 분석하거나 저장할 수 있습니다.',
            disableBeacon: true,
            placement: 'bottom' as const,
        }
    ] : [
        {
            target: '#upload-dropzone',
            content: '분석할 도면 파일(PDF, JPG, PNG)을 여기로 끌어오거나 클릭하세요.',
            disableBeacon: true,
            placement: 'bottom' as const,
        }
    ];

    useEffect(() => {
        if (user && !user.hasSeenTour) {
            const timer = setTimeout(() => {
                setRun(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [user]);

    useEffect(() => {
        const handleRestart = () => {
            setRun(true);
            setStepIndex(0);
        };
        window.addEventListener('restart-upload-tour', handleRestart);
        return () => window.removeEventListener('restart-upload-tour', handleRestart);
    }, []);

    const handleJoyrideCallback = async (data: CallBackProps) => {
        const { status, type, index, action } = data;

        if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
            setRun(false);
            if (token) {
                try {
                    await fetch('http://localhost:8080/api/user/tour-complete', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    await syncUserProfile();
                } catch (error) {
                    console.error("Failed to mark tour complete:", error);
                }
            }
        } else if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
            const nextStepIndex = index + (action === ACTIONS.PREV ? -1 : 1);
            setStepIndex(nextStepIndex);
        }
    };

    return (
        <Joyride
            steps={steps}
            run={run}
            stepIndex={stepIndex}
            callback={handleJoyrideCallback}
            {...commonTourProps}
            styles={tourStyles}
            locale={tourLocale}
        />
    );
};

export default UploadOnboardingTour;
