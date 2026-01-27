import { useState, useEffect } from 'react';
import Joyride, { STATUS, type CallBackProps } from 'react-joyride';
import { useAuth } from '../context/AuthContext';

const PreviewOnboardingTour = () => {
    const [run, setRun] = useState(false);
    const { user } = useAuth();

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
        const hasSeenTour = localStorage.getItem('hasSeenTour_preview');

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
            localStorage.setItem('hasSeenTour_preview', 'true');
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

export default PreviewOnboardingTour;
