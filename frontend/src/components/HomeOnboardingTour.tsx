import { useState, useEffect } from 'react';
import Joyride, { STATUS, type CallBackProps } from 'react-joyride';
import { useAuth } from '../context/AuthContext';

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
            continuous
            showSkipButton
            showProgress
            disableScrolling={true} // Disable scrolling since content fits in viewport
            disableOverlayClose={true}
            disableScrollParentFix={true} // Fix positioning in complex layouts
            callback={handleTourEnd}
            floaterProps={{
                disableAnimation: true, // Disable animation to ensure accurate positioning
            }}
            spotlightPadding={6} // Give some breathing room to hide pixel-perfect misalignment
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

export default HomeOnboardingTour;
