import React, { useRef, useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, Platform, PermissionsAndroid, AppState, Dimensions, DeviceEventEmitter } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import RNFS from 'react-native-fs';
import { CaptureButton } from '../components/CaptureButton';
import { APP_FOLDER_PATH } from '../utils/constants';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { CropOverlay } from '../components/CropOverlay';
import { GalleryPreviewButton } from '../components/GalleryPreviewButton';
import { useGallery } from '../hooks/useGallery';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { SettingsDropdown } from '../components/SettingsDropdown';
import { FlashMenu } from '../components/FlashMenu';
import { Skia, ImageFormat } from '@shopify/react-native-skia';
import { CameraTopBar } from '../components/CameraTopBar';
import LinearGradient from 'react-native-linear-gradient';
import Orientation from 'react-native-orientation-locker';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Main component
export const CameraScreen = ({ navigation }: any) => {
    // Select back camera with explicit Flash support preference
    // Note: If no device matches, this might return undefined, so we still handle that case.
    const device = useCameraDevice('back', {
        hasFlash: true
    });

    const { hasPermission, requestPermission } = useCameraPermission();

    // Safety check for flash support
    const supportsFlash = device?.hasFlash ?? false;

    // Debugging: Log device info
    useEffect(() => {
        if (device) {
            console.log('Active Camera Device:', {
                id: device.id,
                name: device.name,
                hasFlash: device.hasFlash,
                position: device.position
            });
        } else {
            console.log('No Camera Device Selected');
        }
    }, [device]);

    const isFocused = useIsFocused();
    const insets = useSafeAreaInsets();
    const camera = useRef<Camera>(null);
    const { theme } = useTheme();
    const { photos } = useGallery();

    const [cropRegion, setCropRegion] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [focusPoint, setFocusPoint] = useState<{ x: number, y: number } | null>(null);
    const [showFocusIndicator, setShowFocusIndicator] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isForeground, setIsForeground] = useState(true);
    const [cameraMountKey, setCameraMountKey] = useState(0);

    // Controls
    const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto' | 'torch'>('off');
    const [exposure, setExposure] = useState(0);
    const [showFlashMenu, setShowFlashMenu] = useState(false);
    const [isSquare, setIsSquare] = useState(false);

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

        // Keep visible longer for exposure adjustment or rely on interaction to keep it alive
        focusTimeout.current = setTimeout(() => {
            setShowFocusIndicator(false);
        }, 3000); // 3 seconds timeout

        try {
            await camera.current.focus(point);
        } catch (e: any) {
            if (e.code !== 'capture/focus-canceled') {
                console.error('Focus failed:', e);
            }
        }
    }, [camera, insets]);

    async function hasAndroidPermission() {
        if (Platform.OS !== 'android') return true;

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
            // Determine actual flash setting for capture
            let flashSetting: 'off' | 'on' | 'auto' = 'off';

            // Only use flash settings if supported
            if (supportsFlash) {
                if (flashMode === 'on') flashSetting = 'on';
                if (flashMode === 'auto') flashSetting = 'auto';
            }

            const photo = await camera.current.takePhoto({
                flash: flashSetting
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
                            // Skia Cropping Replacement
                            const base64Input = await RNFS.readFile(inputPath, 'base64');
                            const fileData = Skia.Data.fromBase64(base64Input);
                            const skImage = Skia.Image.MakeImageFromEncoded(fileData);

                            if (skImage) {
                                // makeSubset is not available in JS API for SkImage in this version.
                                // We use Surface to draw the crop.
                                const cropWInt = Math.round(cropW);
                                const cropHInt = Math.round(cropH);
                                const cropXInt = Math.round(cropX);
                                const cropYInt = Math.round(cropY);

                                const surface = Skia.Surface.Make(cropWInt, cropHInt);
                                if (surface) {
                                    const canvas = surface.getCanvas();
                                    // Draw the original image shifted by -cropX, -cropY
                                    canvas.drawImage(skImage, -cropXInt, -cropYInt);

                                    const subset = surface.makeImageSnapshot();

                                    if (subset) {
                                        const base64 = subset.encodeToBase64(ImageFormat.JPEG, 100);

                                        const tempFilename = `temp_crop_${Date.now()}.jpg`;
                                        const tempPath = `${RNFS.CachesDirectoryPath}/${tempFilename}`;

                                        await RNFS.writeFile(tempPath, base64, 'base64');
                                        finalPath = `file://${tempPath}`;
                                    }
                                } else {
                                    console.error('Skia Surface.Make failed');
                                }
                            } else {
                                console.error('Skia failed to load image from', inputPath);
                            }

                        } catch (cropError) {
                            console.error('Crop failed:', cropError);
                        }
                    }

                    const filename = `photo_${Date.now()}.jpg`;
                    const path = `file://${APP_FOLDER_PATH}/${filename}`;

                    // If finalPath is our temp file, we move it. 
                    // If it was original (no crop), we move/copy it. 
                    // Note: If input was original photo path, moveFile might fail if source doesn't exist?
                    // Actually photo.path from vision-camera is usually a temp file.
                    // If we cropped, finalPath is our NEW temp file.
                    // So moveFile is correct.

                    // Caveat: If we cropped, we created a new file. The original `photo.path` is still there. 
                    // Vision camera documentation says we should manage that file.
                    // If we didn't crop, finalPath = photo.path.

                    if (finalPath.startsWith('file://')) {
                        finalPath = finalPath.replace('file://', '');
                    }
                    // Clean destination path just in case
                    const cleanDest = path.replace('file://', '');

                    await RNFS.moveFile(finalPath, cleanDest);

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
    }, [camera, cropRegion, isCapturing, flashMode, supportsFlash]);

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

    const onExposureChange = (value: number) => {
        // Reset timeout on interaction
        if (focusTimeout.current) {
            clearTimeout(focusTimeout.current);
        }
        // Keep visible much longer (5s) while adjusting or after
        focusTimeout.current = setTimeout(() => {
            setShowFocusIndicator(false);
        }, 5000);

        setExposure(value);
    };

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
                exposure={exposure}
                torch={flashMode === 'torch' ? 'on' : 'off'}
                resizeMode="cover"
                onError={(e) => console.error('Camera Error:', e)}
            />

            {focusPoint && (
                <View
                    style={[
                        styles.focusWrapper,
                        {
                            left: focusPoint.x - 75,
                            top: focusPoint.y - 75,
                            opacity: showFocusIndicator ? 1 : 0,
                            pointerEvents: showFocusIndicator ? 'auto' : 'none',
                        }
                    ]}
                >
                    <View
                        style={[
                            styles.focusIndicator,
                            {
                                borderColor: theme.borderColor,
                                shadowColor: theme.glowColor,
                            }
                        ]}
                    />

                    <View style={styles.exposureContainer}>
                        <Icon name="white-balance-sunny" size={20} color={theme.borderColor} style={{ marginRight: 10 }} />
                        <View
                            style={styles.sliderTouchArea}
                            onStartShouldSetResponder={() => true}
                            onMoveShouldSetResponder={() => true}
                            onResponderMove={(e) => {
                                e.stopPropagation();
                                const newX = e.nativeEvent.locationX;
                                const sliderWidth = 100;
                                const percent = Math.max(0, Math.min(1, newX / sliderWidth));
                                const range = 4; // -2 to 2
                                const newValue = (percent * range) - 2;
                                onExposureChange(newValue);
                            }}
                        >
                            <View style={styles.sliderTrack}>
                                <View style={[styles.sliderFill, { width: `${((exposure + 2) / 4) * 100}%`, backgroundColor: theme.primaryColor }]} />
                            </View>
                        </View>
                    </View>
                </View>
            )}

            <CropOverlay
                onCropRegionChange={setCropRegion}
                onTap={onTapToFocus}
                isActive={true}
                isSquare={isSquare}
            />

            {/* Top Bar with Flash, Ratio, and Settings */}
            <CameraTopBar
                flashMode={flashMode}
                onFlashPress={() => setShowFlashMenu(true)}
                isSquare={isSquare}
                onToggleRatio={() => setIsSquare(!isSquare)}
                onSettingsPress={() => setShowSettings(true)}
                uiRotation={uiRotation}
                supportsFlash={supportsFlash}
                isCapturing={isCapturing}
            />

            <FlashMenu
                visible={showFlashMenu}
                currentMode={flashMode}
                onSelect={setFlashMode}
                onClose={() => setShowFlashMenu(false)}
            />

            <SettingsDropdown visible={showSettings} onClose={() => setShowSettings(false)} />

            <View style={[styles.controls, { paddingBottom: insets.bottom + 20 }]}>
                <View style={styles.galleryButton}>
                    <GalleryPreviewButton
                        photos={photos}
                        onPress={() => navigation.navigate('Gallery')}
                    />
                </View>

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
    focusWrapper: {
        position: 'absolute',
        width: 150,
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 50,
    },
    focusIndicator: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 2,
        backgroundColor: 'transparent',
        marginBottom: 15,
    },
    exposureContainer: {
        width: '100%',
        height: 40,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 5,
    },
    sliderTouchArea: {
        width: 120,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
        backgroundColor: 'transparent',
    },
    sliderTrack: {
        width: 100,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 2,
        overflow: 'hidden',
        marginLeft: 10,
    },
    sliderFill: {
        height: '100%',
    },
    settingsButton: {
        position: 'absolute',
        right: 20,
        zIndex: 20,
        padding: 10,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    flashButton: {
        position: 'absolute',
        left: 20,
        zIndex: 20,
        padding: 10,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
});
