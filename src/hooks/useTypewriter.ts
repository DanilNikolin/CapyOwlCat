import { useState, useEffect } from 'react';

export function useTypewriter(text: string, speed: number = 30, versionKey: number = 0) {
    const [displayedText, setDisplayedText] = useState('');

    useEffect(() => {
        if (!text) {
            setDisplayedText('');
            return;
        }

        let i = 0;
        setDisplayedText(''); // Reset on text change

        const interval = setInterval(() => {
            i++;
            setDisplayedText(text.slice(0, i));

            if (i >= text.length) {
                clearInterval(interval);
            }
        }, speed);

        return () => clearInterval(interval);
    }, [text, speed, versionKey]);

    return displayedText;
}
