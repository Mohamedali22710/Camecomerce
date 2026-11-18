import * as React from 'react';
import { useLocale } from 'react-admin';

export const RTLWrapper = ({ children }: { children: React.ReactNode }) => {
    const locale = useLocale();
    const isRTL = locale === 'ar';

    React.useEffect(() => {
        const dir = isRTL ? 'rtl' : 'ltr';
        document.documentElement.dir = dir;
        document.documentElement.lang = locale;
        document.body.dir = dir;
        document.body.style.direction = dir;
    }, [isRTL, locale]);

    return (
        <div
            dir={isRTL ? 'rtl' : 'ltr'}
            style={{
                width: '100%',
                minHeight: '100%',
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
            }}
        >
            {children}
        </div>
    );
};