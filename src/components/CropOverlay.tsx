import React, { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions, TouchableOpacity, Text, TextInput, PixelRatio } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    runOnJS,
    withSpring,
    useDerivedValue,
    useAnimatedProps,
    SharedValue,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import Orientation from 'react-native-orientation-locker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MIN_SIZE = 100;
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

// Rough approximation: 160 dpi baseline. 
// 1 inch = 25.4 mm.
// 160 px = 25.4 mm => 1 px = 0.15875 mm
// On high density screens, we divide by scale? No, logical pixels are roughly consistent physical size.
// Let's assume standard logical pixel 1 unit ~= 1/160 inch ~= 0.16mm for simplicity across devices unless we get exact DPI.
const PX_TO_MM = 25.4 / 160;

interface Props {
    onCropRegionChange: (region: { x: number; y: number; width: number; height: number } | null) => void;
    onTap: (point: { x: number, y: number }) => void;
    isActive: boolean;
    isSquare: boolean;
}

export const CropOverlay = ({ onCropRegionChange, onTap, isActive, isSquare }: Props) => {
    const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();

    // Initial Base Dimensions (Full Screen)
    const baseWidth = useSharedValue(SCREEN_WIDTH);
    const baseHeight = useSharedValue(SCREEN_HEIGHT);
    const scale = useSharedValue(1);

    // Saved Scale for Pinch
    const savedScale = useSharedValue(1);

    // UI Rotation
    const uiRotation = useSharedValue(0);
    // Track rotation state for logic (0, 90, 180, -90)
    const rotationDeg = useSharedValue(0);

    useEffect(() => {
        const onOrientationChange = (orientation: string) => {
            switch (orientation) {
                case 'PORTRAIT':
                    uiRotation.value = withSpring(0);
                    rotationDeg.value = 0;
                    break;
                case 'LANDSCAPE-RIGHT':
                    uiRotation.value = withSpring(-90);
                    rotationDeg.value = -90;
                    break;
                case 'LANDSCAPE-LEFT':
                    uiRotation.value = withSpring(90);
                    rotationDeg.value = 90;
                    break;
                case 'PORTRAIT-UPSIDEDOWN':
                    uiRotation.value = withSpring(180);
                    rotationDeg.value = 180;
                    break;
            }
        };
        Orientation.addDeviceOrientationListener(onOrientationChange);
        return () => Orientation.removeDeviceOrientationListener(onOrientationChange);
    }, []);

    // Update base dimensions on orientation change or PROP change (isSquare)
    useEffect(() => {
        if (isSquare) {
            const size = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT);
            baseWidth.value = withSpring(size);
            baseHeight.value = withSpring(size);
        } else {
            baseWidth.value = withSpring(SCREEN_WIDTH);
            baseHeight.value = withSpring(SCREEN_HEIGHT);
        }
    }, [SCREEN_WIDTH, SCREEN_HEIGHT, isSquare]);

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
            borderRadius: 20, // Rounded Corners
        };
    });

    // MM Display Logic
    const animatedProps = useAnimatedProps(() => {
        const wMM = Math.round(currentWidth.value * PX_TO_MM);
        const hMM = Math.round(currentHeight.value * PX_TO_MM);
        return {
            text: `${wMM} x ${hMM} mm`
        } as any;
    });

    const animatedTextStyle = useAnimatedStyle(() => {
        const rot = rotationDeg.value;
        let tX = 0;
        let tY = 0;
        // Logic to place it at the "Visual Top"
        const halfW = currentWidth.value / 2;
        const halfH = currentHeight.value / 2;
        const padding = 20;

        if (Math.abs(rot) < 45 || Math.abs(rot) > 315) {
            // Portrait (0)
            tY = -halfH - padding;
        } else if (Math.abs(rot - 90) < 45) {
            // Left Landscape (90) - Top is Visual RIGHT (Logical X+)
            tX = halfW + padding;
        } else if (Math.abs(rot + 90) < 45) {
            // Right Landscape (-90) - Top is Visual LEFT (Logical X-)
            tX = -halfW - padding;
        } else {
            // Upside Down (180) - Top is Visual Bottom
            tY = halfH + padding;
        }

        return {
            transform: [
                { translateX: SCREEN_WIDTH / 2 },
                { translateY: SCREEN_HEIGHT / 2 },
                { translateX: tX },
                { translateY: tY },
                { rotate: `${uiRotation.value}deg` }
            ],
            opacity: scale.value < 0.98 ? 1 : 0 // Hide when fullscreen
        };
    });

    const VISUAL_PADDING = Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) * 1.5;
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
                            borderRadius: 20 + VISUAL_PADDING,
                        },
                        animatedOverlayStyle
                    ]}
                />

                {/* Crop Box */}
                <Animated.View style={[
                    styles.box,
                    animatedBoxStyle
                ]} />

                {/* MM Values Display */}
                <AnimatedTextInput
                    underlineColorAndroid="transparent"
                    editable={false}
                    value="0 x 0 mm"
                    animatedProps={animatedProps}
                    style={[
                        styles.mmText,
                        { color: theme.borderColor },
                        animatedTextStyle
                    ]}
                />
            </View>
        </GestureDetector>
    );
};

const styles = StyleSheet.create({
    box: {
        position: 'absolute',
        top: 0,
        left: 0,
        borderWidth: 2,
        backgroundColor: 'transparent',
    },
    mmText: {
        position: 'absolute',
        top: 0,
        left: 0,
        marginLeft: -100,
        marginTop: -15,
        width: 200,
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 14,
        textShadowColor: 'black',
        textShadowRadius: 2,
    }
});
