import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Alert } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
    flashMode: 'off' | 'on' | 'auto' | 'torch';
    onFlashPress: () => void;
    isSquare: boolean;
    onToggleRatio: () => void;
    onSettingsPress: () => void;
    uiRotation: SharedValue<number>;
    supportsFlash: boolean;
    isCapturing: boolean;
}

export const CameraTopBar = ({
    flashMode,
    onFlashPress,
    isSquare,
    onToggleRatio,
    onSettingsPress,
    uiRotation,
    supportsFlash,
    isCapturing
}: Props) => {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();

    const animatedIconStyle = useAnimatedStyle(() => {
        return {
            transform: [{ rotate: `${uiRotation.value}deg` }],
        };
    });

    const getFlashIcon = () => {
        switch (flashMode) {
            case 'on': return 'flash';
            case 'auto': return 'flash-auto';
            case 'torch': return 'flashlight';
            default: return 'flash-off';
        }
    };

    const handleFlashPress = () => {
        if (supportsFlash) {
            onFlashPress();
        } else {
            Alert.alert('Flash Unavailable', 'The selected camera lens does not support flash.');
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
            {/* Flash Button */}
            <TouchableOpacity
                style={styles.button}
                onPress={handleFlashPress}
                disabled={isCapturing}
            >
                <Animated.View style={[animatedIconStyle, { opacity: isCapturing ? 0.5 : 1 }]}>
                    <Icon
                        name={getFlashIcon()}
                        size={24}
                        color={!supportsFlash ? 'gray' : (flashMode === 'off' ? 'white' : theme.borderColor)}
                    />
                </Animated.View>
            </TouchableOpacity>

            {/* Aspect Ratio Toggle */}
            <TouchableOpacity
                style={[styles.ratioButton, { borderColor: theme.borderColor }]}
                onPress={onToggleRatio}
                disabled={isCapturing}
            >
                <Animated.View style={[animatedIconStyle, { opacity: isCapturing ? 0.5 : 1 }]}>
                    <Text style={[styles.ratioText, { color: theme.textColor }]}>
                        {isSquare ? '1:1' : '16:9'}
                    </Text>
                </Animated.View>
            </TouchableOpacity>

            {/* Settings Button */}
            <TouchableOpacity
                style={styles.button}
                onPress={onSettingsPress}
                disabled={isCapturing}
            >
                <Animated.View style={[animatedIconStyle, { opacity: isCapturing ? 0.5 : 1 }]}>
                    <Icon name="cog" size={24} color={theme.borderColor} />
                </Animated.View>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        zIndex: 20,
        // Optional: Add a subtle gradient background if needed for visibility
    },
    button: {
        padding: 10,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)', // Semia-transparent background for better visibility
    },
    ratioButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    ratioText: {
        fontWeight: '900',
        fontSize: 12,
        letterSpacing: 1,
    }
});
