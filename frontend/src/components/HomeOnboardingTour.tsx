import { useState, useEffect } from 'react';
import Joyride, { STATUS, EVENTS, type CallBackProps } from 'react-joyride';
import { useAuth } from '../context/AuthContext';
import { tourStyles, tourLocale, commonTourProps } from './tourConfig';

const HomeOnboardingTour = () => {
    const { user, token, syncUserProfile } = useAuth();
    const [run, setRun] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);

    const steps = [
        {
            target: '#get-started-btn',
            content: '시작하려면 여기를 클릭하세요!',
            disableBeacon: true,
            placement: 'bottom' as const,
        },
        {
            target: '#dashboard-btn',
            content: '이미 계정이 있다면 대시보드로 이동하세요.',
            placement: 'bottom' as const,
        },
        {
            target: '.sp-nav',
            content: '여기서 파일 업로드, AI인식, 도면 보관함 등 주요 기능에 접근할 수 있어요.',
            placement: 'bottom' as const,
        },
        {
            target: '.sp-help-btn',
            content: '각 페이지에서 이 버튼(?)을 누르면 언제든지 해당 가이드를 다시 볼 수 있습니다.',
            placement: 'left' as const,
        },
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
        window.addEventListener('restart-home-tour', handleRestart);
        return () => window.removeEventListener('restart-home-tour', handleRestart);
    }, []);

    const handleJoyrideCallback = async (data: CallBackProps) => {
        const { status, type, index } = data;

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
            setStepIndex(index + (type === EVENTS.TARGET_NOT_FOUND ? -1 : 1));
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

export default HomeOnboardingTour;
