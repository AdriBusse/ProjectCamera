import React, { useRef, useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, Platform, PermissionsAndroid, AppState, Dimensions, DeviceEventEmitter } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import RNFS from 'react-native-fs';
import { CaptureButton } from '../components/CaptureButton';
import ImageEditor from '@react-native-community/image-editor';
import { APP_FOLDER_PATH } from '../utils/constants';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { CropOverlay } from '../components/CropOverlay';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { SettingsDropdown } from '../components/SettingsDropdown';
import LinearGradient from 'react-native-linear-gradient';
import Orientation from 'react-native-orientation-locker';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Main component
export const CameraScreen = ({ navigation }: any) => {
    // Verified: Only one CameraScreen declaration exists in this file.
    const { hasPermission, requestPermission } = useCameraPermission();
    const device = useCameraDevice('back');
    const isFocused = useIsFocused();
    const insets = useSafeAreaInsets();
    const camera = useRef<Camera>(null);
    const { theme } = useTheme();

    const [cropRegion, setCropRegion] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [focusPoint, setFocusPoint] = useState<{ x: number, y: number } | null>(null);
    const [showFocusIndicator, setShowFocusIndicator] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isForeground, setIsForeground] = useState(true);
    const [cameraMountKey, setCameraMountKey] = useState(0);

    const uiRotation = useSharedValue(0);

    // Orientation Logic
    useEffect(() => {
        Orientation.lockToPortrait();

        const onOrientationChange = (orientation: string) => {
            switch (orientation) {
                case 'PORTRAIT':
                    uiRotation.value = withSpring(0);
                    break;
                case 'LANDSCAPE-RIGHT': // Home button right
                    uiRotation.value = withSpring(-90);
                    break;
                case 'LANDSCAPE-LEFT': // Home button left
                    uiRotation.value = withSpring(90);
                    break;
                case 'PORTRAIT-UPSIDEDOWN':
                    uiRotation.value = withSpring(180);
                    break;
                default:
                    // Keep previous or reset
                    break;
            }
        };

        Orientation.addDeviceOrientationListener(onOrientationChange);
        return () => {
            Orientation.removeDeviceOrientationListener(onOrientationChange);
        };
    }, []);

    // AppState Logic
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            const isNowForeground = nextAppState === 'active';
            setIsForeground(isNowForeground);

            if (isNowForeground) {
                // Force remount to clear "camera is closed" errors
                setCameraMountKey(prev => prev + 1);
            }
        });

        return () => {
            subscription.remove();
        };
    }, []);

    useEffect(() => {
        if (!hasPermission) {
            requestPermission();
        }
    }, [hasPermission]);

    const focusTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const onTapToFocus = useCallback(async (point: { x: number, y: number }) => {
        if (!camera.current) return;

        const topSafeZone = insets.top + 80;
        const bottomSafeZone = SCREEN_HEIGHT - (insets.bottom + 120);

        if (point.y < topSafeZone || point.y > bottomSafeZone) {
            return;
        }

        if (focusTimeout.current) {
            clearTimeout(focusTimeout.current);
        }

        setFocusPoint(point);
        setShowFocusIndicator(true);

        focusTimeout.current = setTimeout(() => {
            setShowFocusIndicator(false);
        }, 1000);

        try {
            await camera.current.focus(point);
        } catch (e: any) {
            if (e.code !== 'capture/focus-canceled') {
                console.error('Focus failed:', e);
            }
        }
    }, [camera, insets]);

    async function hasAndroidPermission() {
        const platformVersion = Number(Platform.Version);
        if (platformVersion >= 29) {
            return true;
        }

        const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
        if (hasPermission) return true;

        return await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE) === PermissionsAndroid.RESULTS.GRANTED;
    }

    const onCapture = useCallback(async () => {
        if (!camera.current || isCapturing) return;
        setIsCapturing(true);
        try {
            const photo = await camera.current.takePhoto({
                flash: 'off'
            });

            // Unblock UI immediately
            setIsCapturing(false);

            // Process in background
            (async () => {
                try {
                    await RNFS.mkdir(APP_FOLDER_PATH);
                    let finalPath = photo.path;

                    if (cropRegion) {
                        const isScreenPortrait = SCREEN_HEIGHT > SCREEN_WIDTH;
                        const isPhotoLandscape = photo.width > photo.height;
                        let imageWidth = photo.width;
                        let imageHeight = photo.height;

                        if (isScreenPortrait && isPhotoLandscape) {
                            imageWidth = photo.height;
                            imageHeight = photo.width;
                        }

                        const scale = Math.max(SCREEN_WIDTH / imageWidth, SCREEN_HEIGHT / imageHeight);
                        const displayedWidth = imageWidth * scale;
                        const displayedHeight = imageHeight * scale;
                        const offsetX = (displayedWidth - SCREEN_WIDTH) / 2;
                        const offsetY = (displayedHeight - SCREEN_HEIGHT) / 2;

                        let cropX = (cropRegion.x + offsetX) / scale;
                        let cropY = (cropRegion.y + offsetY) / scale;
                        let cropW = cropRegion.width / scale;
                        let cropH = cropRegion.height / scale;

                        cropX = Math.max(0, cropX);
                        cropY = Math.max(0, cropY);
                        if (cropX + cropW > imageWidth) cropW = imageWidth - cropX;
                        if (cropY + cropH > imageHeight) cropH = imageHeight - cropY;

                        const cropData = {
                            offset: { x: Math.round(cropX), y: Math.round(cropY) },
                            size: { width: Math.round(cropW), height: Math.round(cropH) },
                        };

                        let inputPath = photo.path;
                        if (Platform.OS === 'android' && !inputPath.startsWith('file://')) {
                            inputPath = `file://${inputPath}`;
                        }

                        try {
                            const croppedResult = await ImageEditor.cropImage(inputPath, cropData);
                            finalPath = croppedResult.uri;
                        } catch (cropError) {
                            console.error('Crop failed:', cropError);
                        }
                    }

                    const filename = `photo_${Date.now()}.jpg`;
                    const path = `file://${APP_FOLDER_PATH}/${filename}`;

                    await RNFS.moveFile(finalPath, path);

                    if (Platform.OS === 'android' && !(await hasAndroidPermission())) {
                        console.warn('Permission denied for gallery save');
                    } else {
                        try {
                            await CameraRoll.saveAsset(path, { type: 'photo' });
                        } catch (cameraRollErr) {
                            console.warn('Gallery save error:', cameraRollErr);
                        }
                    }
                } catch (processingError) {
                    console.error('Background processing failed', processingError);
                } finally {
                    DeviceEventEmitter.emit('REFRESH_GALLERY');
                }
            })();

        } catch (e) {
            console.error('Failed to take photo!', e);
            setIsCapturing(false);
        }
    }, [camera, cropRegion, isCapturing]);

    const animatedIconStyle = useAnimatedStyle(() => {
        return {
            transform: [{ rotate: `${uiRotation.value}deg` }],
        };
    });

    if (!device || !hasPermission) {
        return <View style={styles.container}><Text>No Camera Device or Permission</Text></View>;
    }

    return (
        <View style={styles.container}>
            <Camera
                ref={camera}
                key={cameraMountKey}
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={isFocused && isForeground}
                photo={true}
                resizeMode="cover"
                onError={(e) => console.error('Camera Error:', e)}
            />

            {focusPoint && (
                <View
                    style={[
                        styles.focusIndicator,
                        {
                            left: focusPoint.x - 25,
                            top: focusPoint.y - 25,
                            opacity: showFocusIndicator ? 1 : 0,
                            transform: [{ scale: showFocusIndicator ? 1 : 1.25 }],
                            borderColor: theme.borderColor,
                            shadowColor: theme.glowColor,
                        }
                    ]}
                />
            )}

            <CropOverlay
                onCropRegionChange={setCropRegion}
                onTap={onTapToFocus}
                isActive={true}
            />

            <TouchableOpacity
                style={[styles.settingsButton, { top: insets.top + 10 }]}
                onPress={() => setShowSettings(true)}
                disabled={isCapturing}
            >
                <Animated.View style={[animatedIconStyle, { opacity: isCapturing ? 0.5 : 1 }]}>
                    <Icon name="cog" size={24} color={theme.borderColor} />
                </Animated.View>
            </TouchableOpacity>

            <SettingsDropdown visible={showSettings} onClose={() => setShowSettings(false)} />

            <View style={[styles.controls, { paddingBottom: insets.bottom + 20 }]}>
                <TouchableOpacity
                    style={styles.galleryButton}
                    onPress={() => navigation.navigate('Gallery')}
                    disabled={isCapturing}
                >
                    <Animated.View style={[animatedIconStyle, { opacity: isCapturing ? 0.5 : 1 }]}>
                        <LinearGradient
                            colors={theme.secondaryGradient}
                            style={[styles.galleryIcon, { borderColor: theme.borderColor }]}
                        />
                    </Animated.View>
                </TouchableOpacity>

                <CaptureButton onPress={onCapture} isLoading={isCapturing} />

                <View style={styles.spacer} />
            </View>
        </View>
    );
};



const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    controls: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    galleryButton: {
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    galleryIcon: {
        width: 40,
        height: 40,
        borderRadius: 5,
        borderWidth: 1,
    },
    spacer: {
        width: 50,
    },
    focusIndicator: {
        position: 'absolute',
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 2,
        backgroundColor: 'transparent',
        zIndex: 10,
        shadowOpacity: 1,
        shadowRadius: 10,
        elevation: 10,
    },
    settingsButton: {
        position: 'absolute',
        right: 20,
        zIndex: 20,
        padding: 10,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
});
