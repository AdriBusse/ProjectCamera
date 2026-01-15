import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme, THEMES } from '../context/ThemeContext';
// @ts-ignore
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface Props {
    visible: boolean;
    onClose: () => void;
}

type MenuState = 'MAIN' | 'HUD_SETTINGS';

export const SettingsDropdown = ({ visible, onClose }: Props) => {
    const { theme, setThemeName, availableThemes } = useTheme();
    const [menuState, setMenuState] = useState<MenuState>('MAIN');

    if (!visible) return null;

    const renderMainContent = () => (
        <View style={styles.menuContent}>
            <Text style={[styles.title, { color: theme.textColor }]}>MENU</Text>
            <View style={[styles.divider, { backgroundColor: theme.borderColor }]} />

            {/* Placeholders */}
            {['Profile', 'Gallery', 'Sync'].map((item) => (
                <TouchableOpacity key={item} style={styles.menuItem}>
                    <Icon name="dots-horizontal" size={20} color="white" style={{ opacity: 0.5 }} />
                    <Text style={styles.menuItemText}>{item}</Text>
                </TouchableOpacity>
            ))}

            <View style={[styles.divider, { backgroundColor: theme.borderColor }]} />

            <TouchableOpacity
                style={[styles.menuItem, styles.activeItem]}
                onPress={() => setMenuState('HUD_SETTINGS')}
            >
                <Icon name="view-dashboard-outline" size={20} color={theme.borderColor} />
                <Text style={[styles.menuItemText, { color: theme.borderColor }]}>HUD Settings</Text>
                <Icon name="chevron-right" size={20} color={theme.borderColor} />
            </TouchableOpacity>
        </View>
    );

    const renderHudSettingsContent = () => (
        <View style={styles.menuContent}>
            <TouchableOpacity
                style={styles.backButton}
                onPress={() => setMenuState('MAIN')}
            >
                <Icon name="arrow-left" size={20} color={theme.textColor} />
                <Text style={[styles.backText, { color: theme.textColor }]}>Back</Text>
            </TouchableOpacity>

            <Text style={[styles.title, { color: theme.textColor, marginTop: 10 }]}>HUD COLOR</Text>
            <View style={[styles.divider, { backgroundColor: theme.borderColor }]} />

            <View style={styles.grid}>
                {availableThemes.map((t) => {
                    const key = Object.keys(THEMES).find(k => THEMES[k].name === t.name) || 'BLUE_NEON';
                    const isSelected = theme.name === t.name;

                    return (
                        <TouchableOpacity
                            key={t.name}
                            style={[
                                styles.swatch,
                                isSelected && { borderColor: 'white', borderWidth: 2 }
                            ]}
                            onPress={() => setThemeName(key)}
                        >
                            <LinearGradient
                                colors={t.primaryGradient}
                                style={StyleSheet.absoluteFill}
                            />
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
                {/* 
                    Using View wrapper to position the glass since LiquidGlassView 
                    might need specific layout props or act as the container itself.
                */}
                <View style={styles.containerWrapper}>
                    <LiquidGlassView
                        style={[
                            styles.glassContainer,
                            // Fallback for Android or unsupported devices if library is iOS only
                            !isLiquidGlassSupported && { backgroundColor: 'rgba(20, 20, 20, 0.95)' }
                        ]}
                        interactive={true}
                        effect="regular" // 'regular', 'prominent', 'extraLight' etc
                    >
                        {/* Prevent touches on the menu from closing the modal */}
                        <TouchableOpacity activeOpacity={1} style={{ width: '100%' }}>
                            {menuState === 'MAIN' ? renderMainContent() : renderHudSettingsContent()}
                        </TouchableOpacity>
                    </LiquidGlassView>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.2)', // Dim background slightly
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        paddingTop: 80,
        paddingRight: 20,
    },
    containerWrapper: {
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    glassContainer: {
        width: 250,
        borderRadius: 20,
        overflow: 'hidden',
        // If fallback style is applied, these borders help the Brutalist look
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        padding: 20,
    },
    menuContent: {
        width: '100%',
    },
    title: {
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 5,
    },
    divider: {
        height: 2,
        width: '100%',
        marginVertical: 10,
        opacity: 0.5,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 10,
    },
    activeItem: {
        justifyContent: 'space-between',
    },
    menuItemText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    backText: {
        marginLeft: 5,
        fontSize: 14,
        fontWeight: 'bold',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 15,
        justifyContent: 'center',
        paddingTop: 10,
    },
    swatch: {
        width: 50,
        height: 50,
        borderRadius: 25,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
});
