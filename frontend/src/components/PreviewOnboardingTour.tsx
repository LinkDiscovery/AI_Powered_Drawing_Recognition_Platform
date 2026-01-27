import { useState, useEffect } from 'react';
import Joyride, { STATUS, type CallBackProps } from 'react-joyride';
import { useAuth } from '../context/AuthContext';
import { tourStyles, tourLocale, commonTourProps } from './tourConfig';

const PreviewOnboardingTour = () => {
    const [run, setRun] = useState(false);
    const [tourKey, setTourKey] = useState(0); // Key to force re-render
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

        let timer: number | undefined;
        if (shouldRun) {
            // Simple delay only, no manual scrolling
            timer = setTimeout(() => {
                setRun(true);
            }, 1000);
        }

        // ALWAYS set up the event listener for restart
        const handleRestart = () => {
            console.log('Preview tour restart triggered');
            localStorage.removeItem('hasSeenTour_preview');
            setRun(false); // Stop first
            setTimeout(() => {
                setTourKey(prev => prev + 1); // Force Remount
                setRun(true); // Start
            }, 50);
        };
        window.addEventListener('restart-preview-tour', handleRestart);

        return () => {
            window.removeEventListener('restart-preview-tour', handleRestart);
            if (timer) {
                clearTimeout(timer);
            }
        };

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

export default PreviewOnboardingTour;
