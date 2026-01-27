import { useState, useEffect } from 'react';
import Joyride, { STATUS, type CallBackProps } from 'react-joyride';
import { useAuth } from '../context/AuthContext';
import { tourStyles, tourLocale, commonTourProps } from './tourConfig';

const HomeOnboardingTour = () => {
    const [run, setRun] = useState(false);
    const { user } = useAuth();

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
    ];

    useEffect(() => {
        const hasSeenTour = localStorage.getItem('hasSeenTour_home');

        // Force tour for test@example.com regardless of localStorage
        const shouldRun = !hasSeenTour || (user?.email === 'test@example.com');

        if (shouldRun) {
            // Simple delay only, no manual scrolling
            const timer = setTimeout(() => {
                setRun(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [user]);

    const handleTourEnd = (data: CallBackProps) => {
        const { status } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
        if (finishedStatuses.includes(status)) {
            localStorage.setItem('hasSeenTour_home', 'true');
            setRun(false);
        }
    };

    return (
        <Joyride
            steps={steps}
            run={run}
            callback={handleTourEnd}
            {...commonTourProps}
            styles={tourStyles}
            locale={tourLocale}
        />
    );
};

export default HomeOnboardingTour;
