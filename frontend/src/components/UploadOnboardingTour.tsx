import { useState, useEffect } from 'react';
import Joyride, { STATUS, type CallBackProps } from 'react-joyride';
import { useAuth } from '../context/AuthContext';
import { useFiles } from '../context/FileContext';
import { tourStyles, tourLocale, commonTourProps } from './tourConfig';

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
            callback={handleTourEnd}
            {...commonTourProps}
            styles={tourStyles}
            locale={tourLocale}
        />
    );
};

export default UploadOnboardingTour;
