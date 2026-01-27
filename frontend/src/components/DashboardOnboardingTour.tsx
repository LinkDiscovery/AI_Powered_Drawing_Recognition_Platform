import { useState, useEffect } from 'react';
import Joyride, { STATUS, type CallBackProps } from 'react-joyride';
import { useAuth } from '../context/AuthContext';
import { tourStyles, tourLocale, commonTourProps } from './tourConfig';

const DashboardOnboardingTour = () => {
    const [run, setRun] = useState(false);
    const [tourKey, setTourKey] = useState(0);
    const { user } = useAuth();

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
        const hasSeenTour = localStorage.getItem('hasSeenTour_dashboard');

        // Force tour for test@example.com regardless of localStorage
        const shouldRun = !hasSeenTour || (user?.email === 'test@example.com');

        let timer: number | undefined;
        if (shouldRun) {
            // Simple delay only, no manual scrolling
            timer = setTimeout(() => {
                setRun(true);
            }, 1000);
        }

        // ALWAYS set up the event listener for restart
        const handleRestart = () => {
            console.log('Dashboard tour restart triggered');
            localStorage.removeItem('hasSeenTour_dashboard');
            setRun(false); // Stop first
            setTimeout(() => {
                setTourKey(prev => prev + 1); // Force Remount
                setRun(true); // Start
            }, 50);
        };
        window.addEventListener('restart-dashboard-tour', handleRestart);

        return () => {
            if (timer) {
                clearTimeout(timer);
            }
            window.removeEventListener('restart-dashboard-tour', handleRestart);
        };

    }, [user]);

    const handleTourEnd = (data: CallBackProps) => {
        const { status } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
        if (finishedStatuses.includes(status)) {
            localStorage.setItem('hasSeenTour_dashboard', 'true');
            setRun(false);
        }
    };

    return (
        <Joyride
            key={tourKey}
            steps={steps}
            run={run}
            callback={handleTourEnd}
            {...commonTourProps}
            styles={tourStyles}
            locale={tourLocale}
        />
    );
};

export default DashboardOnboardingTour;
