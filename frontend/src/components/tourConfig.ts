// Shared configuration for Joyride tours

export const tourStyles = {
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
};

export const tourLocale = {
    back: '이전',
    close: '닫기',
    last: '완료',
    next: '다음',
    skip: '건너뛰기',
};

export const commonTourProps = {
    continuous: true,
    showSkipButton: true,
    showProgress: true,
    disableScrolling: true,
    disableOverlayClose: true,
    disableScrollParentFix: true,
    floaterProps: {
        disableAnimation: true,
    },
    spotlightPadding: 6,
};
