import { useState, useEffect } from 'react';
import Joyride, { STATUS, EVENTS, type CallBackProps } from 'react-joyride';
import { useAuth } from '../context/AuthContext';
import { tourStyles, tourLocale, commonTourProps } from './tourConfig';

const DashboardOnboardingTour = () => {
    const { user, token, syncUserProfile } = useAuth();
    const [run, setRun] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);

    const steps = [
        {
            target: '#dashboard-new-btn',
            content: '새 폴더를 만들거나 파일을 업로드할 수 있습니다.',
            disableBeacon: true,
            placement: 'right' as const,
        },
        {
            target: '#dashboard-sidebar-nav',
            content: '내 드라이브, 최근 문서함 간에 빠르게 이동할 수 있습니다.',
            placement: 'right' as const,
        },
        {
            target: '#dashboard-files-title',
            content: '업로드된 파일과 폴더를 관리하세요. 드래그앤드롭으로 폴더 이동이 가능합니다.',
            placement: 'bottom' as const,
        },
        {
            target: '#nav-item-trash',
            content: '삭제된 파일은 휴지통으로 이동되며, 필요 시 복원할 수 있습니다.',
            placement: 'right' as const,
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
        window.addEventListener('restart-dashboard-tour', handleRestart);
        return () => window.removeEventListener('restart-dashboard-tour', handleRestart);
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

export default DashboardOnboardingTour;
