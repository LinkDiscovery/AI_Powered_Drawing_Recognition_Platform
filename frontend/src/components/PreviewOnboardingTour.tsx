import { useState, useEffect } from 'react';
import Joyride, { STATUS, EVENTS, ACTIONS, type CallBackProps } from 'react-joyride';
import { useAuth } from '../context/AuthContext';
import { tourStyles, tourLocale, commonTourProps } from './tourConfig';

const PreviewOnboardingTour = () => {
    const { user, token, syncUserProfile } = useAuth();
    const [run, setRun] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);

    const steps = [
        {
            target: '#sidebar-tools',
            content: '여기서 그리기 도구를 선택하여 도면을 수정하거나 주석을 추가할 수 있습니다.',
            disableBeacon: true,
            placement: 'right' as const,
        },
        {
            target: '#pdf-control-bar',
            content: '도면을 확대/축소하거나 페이지를 이동할 수 있습니다.',
            placement: 'bottom' as const,
        },
        {
            target: '#preview-ai-btn',
            content: 'AI 인식 버튼을 눌러 도면의 텍스트와 심볼을 자동으로 추출하세요.',
            placement: 'bottom' as const,
        },
        {
            target: '#preview-download-btn',
            content: '작업이 완료되면 원본 파일과 데이터를 다운로드할 수 있습니다.',
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
        window.addEventListener('restart-preview-tour', handleRestart);
        return () => window.removeEventListener('restart-preview-tour', handleRestart);
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

export default PreviewOnboardingTour;
