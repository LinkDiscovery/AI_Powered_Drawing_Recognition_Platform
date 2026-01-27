import { useState, useEffect } from 'react';
import Joyride, { STATUS, EVENTS, ACTIONS, type CallBackProps } from 'react-joyride';
import { useAuth } from '../context/AuthContext';
import { tourStyles, tourLocale, commonTourProps } from './tourConfig';

const AiRecognitionOnboardingTour = () => {
    const { user, token, syncUserProfile } = useAuth();
    const [run, setRun] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);

    const steps = [
        {
            target: '.file-source-tabs',
            content: '보관함의 파일을 선택하거나 새 파일을 업로드할 수 있습니다.',
            disableBeacon: true,
            placement: 'bottom' as const,
        },
        {
            target: '.file-list-container',
            content: '분석할 도면 파일을 선택하세요.',
            placement: 'right' as const,
        },
        {
            target: '.preview-container',
            content: 'PDF 뷰어에서 도면을 확인하고 타이틀 블록 영역을 선택할 수 있습니다.',
            placement: 'left' as const,
        },
        {
            target: '.ocr-controls',
            content: '파일을 선택한 후 이 버튼을 눌러 AI 분석을 시작하세요. OCR 회전 각도도 조정할 수 있습니다.',
            placement: 'top' as const,
        },
    ];

    useEffect(() => {
        // Run ONLY if logged in AND has not seen tour (DB flag)
        // Run if logged in AND (hasSeenTour is false OR undefined/null)
        if (user && !user.hasSeenTour) {
            // Delay slightly to ensure UI is ready
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
        window.addEventListener('restart-airecognition-tour', handleRestart);
        return () => window.removeEventListener('restart-airecognition-tour', handleRestart);
    }, []);

    const handleJoyrideCallback = async (data: CallBackProps) => {
        const { status, type, index, action } = data;

        if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
            setRun(false);

            // Call API to mark tour as seen
            if (token) {
                try {
                    await fetch('/api/user/tour-complete', {
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

export default AiRecognitionOnboardingTour;
