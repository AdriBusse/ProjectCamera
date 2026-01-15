import React, { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions, TouchableOpacity, Text } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    runOnJS,
    withSpring,
    useDerivedValue,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import Orientation from 'react-native-orientation-locker';

const MIN_SIZE = 100;

interface Props {
    onCropRegionChange: (region: { x: number; y: number; width: number; height: number } | null) => void;
    onTap: (point: { x: number, y: number }) => void;
    isActive: boolean;
}

export const CropOverlay = ({ onCropRegionChange, onTap, isActive }: Props) => {
    const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
    const { theme } = useTheme();

    const [isSquare, setIsSquare] = useState(false);
    const [showToggle, setShowToggle] = useState(false);

    // Initial Base Dimensions (Full Screen)
    const baseWidth = useSharedValue(SCREEN_WIDTH);
    const baseHeight = useSharedValue(SCREEN_HEIGHT);
    const scale = useSharedValue(1);

    // Saved Scale for Pinch
    const savedScale = useSharedValue(1);

    // UI Rotation
    const uiRotation = useSharedValue(0);

    useEffect(() => {
        const onOrientationChange = (orientation: string) => {
            switch (orientation) {
                case 'PORTRAIT': uiRotation.value = withSpring(0); break;
                case 'LANDSCAPE-RIGHT': uiRotation.value = withSpring(-90); break;
                case 'LANDSCAPE-LEFT': uiRotation.value = withSpring(90); break;
                case 'PORTRAIT-UPSIDEDOWN': uiRotation.value = withSpring(180); break;
            }
        };
        Orientation.addDeviceOrientationListener(onOrientationChange);
        return () => Orientation.removeDeviceOrientationListener(onOrientationChange);
    }, []);

    const animatedButtonStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${uiRotation.value}deg` }],
    }));

    // Update base dimensions on orientation change, but respect current mode
    useEffect(() => {
        if (isSquare) {
            const size = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT);
            baseWidth.value = withSpring(size);
            baseHeight.value = withSpring(size);
        } else {
            baseWidth.value = withSpring(SCREEN_WIDTH);
            baseHeight.value = withSpring(SCREEN_HEIGHT);
        }
    }, [SCREEN_WIDTH, SCREEN_HEIGHT]);

    // Derived Actual Size
    const currentWidth = useDerivedValue(() => baseWidth.value * scale.value);
    const currentHeight = useDerivedValue(() => baseHeight.value * scale.value);

    // Position (Always Centered)
    const x = useDerivedValue(() => (SCREEN_WIDTH - currentWidth.value) / 2);
    const y = useDerivedValue(() => (SCREEN_HEIGHT - currentHeight.value) / 2);

    // Report Changes
    const reportChange = (cX: number, cY: number, cW: number, cH: number) => {
        onCropRegionChange({ x: cX, y: cY, width: cW, height: cH });
    };

    useDerivedValue(() => {
        if (isActive) {
            runOnJS(reportChange)(x.value, y.value, currentWidth.value, currentHeight.value);
        }
    });

    // Toggle Button Visibility Logic
    useDerivedValue(() => {
        // Show toggle if scale implies "smaller than screen" (with small buffer)
        const isSmaller = scale.value < 0.98;
        if (isSmaller !== showToggle) {
            runOnJS(setShowToggle)(isSmaller);
        }
    });

    const toggleAspectRatio = () => {
        const nextIsSquare = !isSquare;
        setIsSquare(nextIsSquare);

        if (nextIsSquare) {
            // Switch to Square
            const size = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT);
            baseWidth.value = withSpring(size);
            baseHeight.value = withSpring(size);
        } else {
            // Switch to Screen Ratio
            baseWidth.value = withSpring(SCREEN_WIDTH);
            baseHeight.value = withSpring(SCREEN_HEIGHT);
        }
    };

    // Gestures
    const pinch = Gesture.Pinch()
        .onStart(() => {
            savedScale.value = scale.value;
        })
        .onUpdate((e) => {
            let newScale = savedScale.value * e.scale;

            // Clamp Scale to min/max
            const minScaleW = MIN_SIZE / baseWidth.value;
            const minScaleH = MIN_SIZE / baseHeight.value;
            const absoluteMinScale = Math.max(minScaleW, minScaleH);

            if (newScale > 1) newScale = 1;
            if (newScale < absoluteMinScale) newScale = absoluteMinScale;

            scale.value = newScale;
        });

    const tap = Gesture.Tap()
        .onEnd((e) => {
            runOnJS(onTap)({ x: e.x, y: e.y });
        });

    const gestures = Gesture.Simultaneous(pinch, tap);

    const animatedBoxStyle = useAnimatedStyle(() => {
        // Check if the crop box covers the entire screen (with small tolerance)
        const isFullScreen = currentWidth.value >= SCREEN_WIDTH - 1 && currentHeight.value >= SCREEN_HEIGHT - 1;

        return {
            width: currentWidth.value,
            height: currentHeight.value,
            transform: [{ translateX: x.value }, { translateY: y.value }],
            borderColor: theme.borderColor,
            borderWidth: isFullScreen ? 0 : 2,
        };
    });

    const VISUAL_PADDING = Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) * 1.5;

    // Slight blue tint in the dark overlay for "Cyber" feel
    const overlayColor = `rgba(0, 5, 20, 0.7)`;

    const animatedOverlayStyle = useAnimatedStyle(() => ({
        width: currentWidth.value + VISUAL_PADDING * 2,
        height: currentHeight.value + VISUAL_PADDING * 2,
        transform: [
            { translateX: x.value - VISUAL_PADDING },
            { translateY: y.value - VISUAL_PADDING },
        ],
    }));

    if (!isActive) return null;

    return (
        <GestureDetector gesture={gestures}>
            <View style={StyleSheet.absoluteFill}>
                {/* Unified Overlay */}
                <Animated.View
                    pointerEvents="none"
                    style={[
                        {
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            borderWidth: VISUAL_PADDING,
                            borderColor: overlayColor,
                            backgroundColor: 'transparent',
                        },
                        animatedOverlayStyle
                    ]}
                />

                {/* Crop Box */}
                <Animated.View style={[
                    styles.box,
                    animatedBoxStyle
                ]} />

                {/* Aspect Ratio Toggle Button */}
                {showToggle && (
                    <Animated.View style={[styles.buttonContainer, animatedButtonStyle]}>
                        <TouchableOpacity
                            onPress={toggleAspectRatio}
                            activeOpacity={0.6}
                            style={[
                                styles.button,
                                { borderColor: theme.borderColor }
                            ]}
                        >
                            <Text style={[styles.buttonText, { color: theme.textColor }]}>
                                {isSquare ? '16:9' : '1:1'}
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}
            </View>
        </GestureDetector>
    );
};

const styles = StyleSheet.create({
    box: {
        position: 'absolute',
        top: 0,
        left: 0,
        borderWidth: 2, // Thicker border for Brutalism
        backgroundColor: 'transparent',
    },
    buttonContainer: {
        position: 'absolute',
        top: 60,
        left: 20, // Move to left
        zIndex: 20,
    },
    button: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 4, // Slightly rounded for "HUD" button
        borderWidth: 1,
        backgroundColor: 'transparent', // Transparent as requested
    },
    buttonText: {
        fontWeight: '900',
        fontSize: 14,
        letterSpacing: 1,
    },
});
