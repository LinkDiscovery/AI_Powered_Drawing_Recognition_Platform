import { useState, useEffect } from 'react';
import Joyride, { STATUS, type CallBackProps } from 'react-joyride';
import { useAuth } from '../context/AuthContext';

const DashboardOnboardingTour = () => {
    const [run, setRun] = useState(false);
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
            localStorage.setItem('hasSeenTour_dashboard', 'true');
            setRun(false);
        }
    };

    return (
        <Joyride
            steps={steps}
            run={run}
            continuous
            showSkipButton
            showProgress
            disableScrolling={true}
            disableOverlayClose={true}
            disableScrollParentFix={true}
            callback={handleTourEnd}
            floaterProps={{
                disableAnimation: true,
            }}
            spotlightPadding={6}
            styles={{
                options: {
                    arrowColor: '#1a1a1a',
                    backgroundColor: '#1a1a1a',
                    overlayColor: 'rgba(0, 0, 0, 0.75)',
                    primaryColor: '#ffffff',
                    textColor: '#ffffff',
                    zIndex: 10000,
                },
                spotlight: {
                    borderRadius: '8px',
                },
                tooltip: {
                    borderRadius: '8px',
                    border: '1px solid #333',
                    fontSize: '15px',
                    padding: '24px',
                },
                tooltipContent: {
                    padding: '10px 0 20px 0',
                    textAlign: 'left' as const,
                },
                buttonNext: {
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    borderRadius: '4px',
                    fontWeight: 600,
                    padding: '10px 24px',
                },
                buttonBack: {
                    color: '#888',
                    marginRight: 15,
                },
            }}
            locale={{
                back: '이전',
                close: '닫기',
                last: '완료',
                next: '다음',
                skip: '건너뛰기',
            }}
        />
    );
};

export default DashboardOnboardingTour;
