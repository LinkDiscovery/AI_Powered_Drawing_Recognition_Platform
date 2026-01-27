import { useState, useEffect } from 'react';
import Joyride, { STATUS, type CallBackProps } from 'react-joyride';
import { useAuth } from '../context/AuthContext';
import { tourStyles, tourLocale, commonTourProps } from './tourConfig';

const AiRecognitionOnboardingTour = () => {
    const [run, setRun] = useState(false);
    const [tourKey, setTourKey] = useState(0);
    const { user } = useAuth();

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
            target: '#ocr-start-btn',
            content: '타이틀 블록을 선택한 후 이 버튼을 눌러 AI 분석을 시작하세요.',
            placement: 'left' as const,
            disableScrolling: false, // Scroll to this element
        },
    ];

    useEffect(() => {
        console.log('AiRecognitionOnboardingTour mounted');
        const hasSeenTour = localStorage.getItem('hasSeenTour_aiRecognition');

        // Force tour for test@example.com regardless of localStorage
        const shouldRun = !hasSeenTour || (user?.email === 'test@example.com');

        let timer: number | undefined;
        if (shouldRun) {
            // Simple delay only, no manual scrolling
            timer = setTimeout(() => {
                console.log('Auto-starting AI Recognition tour');
                setRun(true);
            }, 1000);
        }

        // ALWAYS set up the event listener for restart
        const handleRestart = () => {
            console.log('AI Recognition tour restart triggered');
            localStorage.removeItem('hasSeenTour_aiRecognition');
            setRun(false);
            setTimeout(() => {
                setTourKey(prev => prev + 1);
                setRun(true);
            }, 50);
        };
        window.addEventListener('restart-airecognition-tour', handleRestart);

        return () => {
            if (timer) {
                clearTimeout(timer);
            }
            window.removeEventListener('restart-airecognition-tour', handleRestart);
        };

    }, [user]);

    const handleTourEnd = (data: CallBackProps) => {
        const { status } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
        if (finishedStatuses.includes(status)) {
            localStorage.setItem('hasSeenTour_aiRecognition', 'true');
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

export default AiRecognitionOnboardingTour;
