import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Theme {
    name: string;
    primaryGradient: string[];
    secondaryGradient: string[];
    borderColor: string;
    glowColor: string;
    textColor: string;
}

export const THEMES: { [key: string]: Theme } = {
    BLUE_NEON: {
        name: 'Blue Neon',
        primaryGradient: ['#00FFFF', '#0000FF'],
        secondaryGradient: ['rgba(0, 255, 255, 0.5)', 'rgba(0, 0, 255, 0.5)'],
        borderColor: '#00FFFF',
        glowColor: 'rgba(0, 255, 255, 0.8)',
        textColor: '#00FFFF',
    },
    GREEN_TOXIC: {
        name: 'Toxic Green',
        primaryGradient: ['#CCFF00', '#00FF66'],
        secondaryGradient: ['rgba(204, 255, 0, 0.5)', 'rgba(0, 255, 102, 0.5)'],
        borderColor: '#00FF66',
        glowColor: 'rgba(0, 255, 102, 0.8)',
        textColor: '#00FF66',
    },
    RED_ALERT: {
        name: 'Red Alert',
        primaryGradient: ['#FF0055', '#FF0000'],
        secondaryGradient: ['rgba(255, 0, 85, 0.5)', 'rgba(255, 0, 0, 0.5)'],
        borderColor: '#FF0055',
        glowColor: 'rgba(255, 0, 0, 0.8)',
        textColor: '#FF0055',
    },
    ORANGE_FLAME: {
        name: 'Orange Flame',
        primaryGradient: ['#FFCC00', '#FF6600'],
        secondaryGradient: ['rgba(255, 204, 0, 0.5)', 'rgba(255, 102, 0, 0.5)'],
        borderColor: '#FF6600',
        glowColor: 'rgba(255, 102, 0, 0.8)',
        textColor: '#FFCC00',
    }
};

interface ThemeContextType {
    theme: Theme;
    setThemeName: (name: string) => void;
    availableThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'HUD_THEME_PREFERENCE';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const [themeKey, setThemeKey] = useState<string>('BLUE_NEON');
    const [isLoaded, setIsLoaded] = useState(false);

    // Load persisted theme on mount
    useEffect(() => {
        (async () => {
            try {
                const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
                if (savedTheme && THEMES[savedTheme]) {
                    setThemeKey(savedTheme);
                }
            } catch (e) {
                console.warn('Failed to load theme preference', e);
            } finally {
                setIsLoaded(true);
            }
        })();
    }, []);

    const changeTheme = async (key: string) => {
        setThemeKey(key);
        try {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, key);
        } catch (e) {
            console.warn('Failed to save theme preference', e);
        }
    };

    const theme = THEMES[themeKey];

    const value = {
        theme,
        setThemeName: changeTheme,
        availableThemes: Object.values(THEMES),
    };

    if (!isLoaded) {
        return null; // Or a splash screen
    }

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
