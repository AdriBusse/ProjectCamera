import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal } from 'react-native';
// @ts-ignore
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../context/ThemeContext';

export type FlashMode = 'off' | 'on' | 'auto' | 'torch';

interface Props {
    visible: boolean;
    currentMode: FlashMode;
    onSelect: (mode: FlashMode) => void;
    onClose: () => void;
}

export const FlashMenu = ({ visible, currentMode, onSelect, onClose }: Props) => {
    const { theme } = useTheme();

    if (!visible) return null;

    const options: { mode: FlashMode; icon: string; label: string }[] = [
        { mode: 'off', icon: 'flash-off', label: 'Off' },
        { mode: 'on', icon: 'flash', label: 'On' },
        { mode: 'auto', icon: 'flash-auto', label: 'Auto' },
        { mode: 'torch', icon: 'flashlight', label: 'Torch' },
    ];

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
                <View style={styles.containerWrapper}>
                    <LiquidGlassView
                        style={[
                            styles.glassContainer,
                            !isLiquidGlassSupported && { backgroundColor: 'rgba(20, 20, 20, 0.95)' }
                        ]}
                        interactive={true}
                        effect="regular"
                    >
                        <View style={styles.row}>
                            {options.map((opt) => {
                                const isSelected = currentMode === opt.mode;
                                return (
                                    <TouchableOpacity
                                        key={opt.mode}
                                        style={[
                                            styles.option,
                                            isSelected && { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: theme.borderColor }
                                        ]}
                                        onPress={() => {
                                            onSelect(opt.mode);
                                            onClose();
                                        }}
                                    >
                                        <Icon
                                            name={opt.icon}
                                            size={24}
                                            color={isSelected ? theme.borderColor : 'white'}
                                        />
                                        <Text style={[
                                            styles.label,
                                            { color: isSelected ? theme.borderColor : '#888' }
                                        ]}>
                                            {opt.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </LiquidGlassView>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'flex-start', // Align left where the button is
        paddingTop: 60, // Top margin to align near the header button
        paddingLeft: 20,
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
        borderRadius: 15,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        padding: 5,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    option: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 60,
        height: 60,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    label: {
        marginTop: 4,
        fontSize: 10,
        fontWeight: 'bold',
    }
});
