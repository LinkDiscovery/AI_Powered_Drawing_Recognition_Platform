import { useState, useEffect } from 'react';
import Joyride, { STATUS, type CallBackProps } from 'react-joyride';
import { useAuth } from '../context/AuthContext';
import { useFiles } from '../context/FileContext';

const UploadOnboardingTour = () => {
    const [run, setRun] = useState(false);
    const { user } = useAuth();
    const { hasItems } = useFiles(); // Check if file list is shown

    // Define steps based on state (Empty vs Has Items)
    // For now, let's focus on the initial dropzone experience
    const steps = hasItems ? [
        {
            target: '#uploader-list-card',
            content: '업로드된 도면 목록입니다. 여기서 분석하거나 저장할 수 있습니다.',
            disableBeacon: true,
            placement: 'bottom' as const,
        }
    ] : [
        {
            target: '#upload-dropzone',
            content: '분석할 도면 파일(PDF, JPG, PNG)을 여기로 끌어오거나 클릭하세요.',
            disableBeacon: true,
            placement: 'bottom' as const,
        }
    ];

    useEffect(() => {
        const hasSeenTour = localStorage.getItem('hasSeenTour_upload');

        // Force tour for test@example.com regardless of localStorage
        const shouldRun = !hasSeenTour || (user?.email === 'test@example.com');

        if (shouldRun) {
            // Simple delay only, no manual scrolling
            const timer = setTimeout(() => {
                setRun(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [user, hasItems]); // Re-run if state changes (e.g. user drops a file, though usually we only show once)

    const handleTourEnd = (data: CallBackProps) => {
        const { status } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
        if (finishedStatuses.includes(status)) {
            localStorage.setItem('hasSeenTour_upload', 'true');
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
            disableScrolling={true} // Disable scrolling specific logic as per Home tour lessons
            disableOverlayClose={true}
            disableScrollParentFix={true} // Lesson learned from Home tour
            callback={handleTourEnd}
            floaterProps={{
                disableAnimation: true, // Lesson learned: keep it static for better alignment
            }}
            spotlightPadding={6} // Breathing room
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
                    minWidth: '300px',
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

export default UploadOnboardingTour;
