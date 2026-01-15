import React, { useRef } from 'react';
import { TouchableOpacity, View, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../context/ThemeContext';

interface Props {
    onPress: () => void;
    isLoading?: boolean;
}

export const CaptureButton = ({ onPress, isLoading = false }: Props) => {
    console.log('CaptureButton rendering');
    const scale = useRef(new Animated.Value(1)).current;
    const { theme } = useTheme();

    const handlePressIn = () => {
        if (isLoading) return;
        Animated.spring(scale, {
            toValue: 0.9,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        if (isLoading) return;
        Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
        onPress();
    };

    return (
        <TouchableOpacity
            activeOpacity={1}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={isLoading}
        >
            <Animated.View style={[
                styles.outerRing,
                {
                    transform: [{ scale }],
                    shadowColor: theme.glowColor,
                    shadowOpacity: 1,
                    shadowRadius: 10,
                    elevation: 10,
                }
            ]}>
                <LinearGradient
                    colors={theme.secondaryGradient}
                    style={StyleSheet.absoluteFill}
                />
                <View style={[styles.borderMask, { borderColor: theme.borderColor }]} />

                {isLoading ? (
                    <ActivityIndicator size="large" color={theme.borderColor} />
                ) : (
                    <View style={styles.innerCircleContainer}>
                        <LinearGradient
                            colors={theme.primaryGradient}
                            style={styles.innerCircle}
                        />
                    </View>
                )}
            </Animated.View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    outerRing: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden', // Mask gradient
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    borderMask: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 3,
        borderRadius: 40,
    },
    innerCircleContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        overflow: 'hidden',
    },
    innerCircle: {
        flex: 1,
    },
});
