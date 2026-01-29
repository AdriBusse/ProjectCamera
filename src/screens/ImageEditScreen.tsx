import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text, Dimensions, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import RNFS from 'react-native-fs';
import { FILTERS } from '../utils/filters';
import { APP_FOLDER_PATH } from '../utils/constants';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { DeviceEventEmitter } from 'react-native';
import { Canvas, ColorMatrix, Image, useImage, SkImage, makeImageSnapshot, Rect, useCanvasRef } from '@shopify/react-native-skia';
import LinearGradient from 'react-native-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function ImageEditScreen({ route, navigation }: any) {
    const { imagePath } = route.params || {};
    const insets = useSafeAreaInsets();
    const [selectedFilterIndex, setSelectedFilterIndex] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const canvasRef = useCanvasRef();

    // Safety check
    if (!imagePath) {
        if (navigation.canGoBack()) navigation.goBack();
        return null;
    }

    // Ensure we have a valid file URI
    const uri = imagePath.startsWith('file://') ? imagePath : `file://${imagePath}`;

    // Load Skia Image
    const skImage = useImage(uri);

    const handleSave = async () => {
        if (!skImage || !canvasRef.current) return;
        setIsSaving(true);

        try {
            // Take snapshot of the canvas
            // Provide dimensions to ensure full resolution if possible, but canvasRef usually captures display bounds.
            // For higher quality, we might want to create an offscreen surface, but let's try direct snapshot first.
            const snapshot = await canvasRef.current.makeImageSnapshot();
            if (snapshot) {
                const base64 = snapshot.encodeToBase64(100); // JPEG 100
                // Generate filename based on original to keep them together in sort order
                let originalName = 'photo';
                if (imagePath) {
                    const nameParts = imagePath.split('/').pop()?.split('.');
                    if (nameParts && nameParts.length > 0) {
                        originalName = nameParts.slice(0, -1).join('.');
                    }
                }

                // If the original name already contains "_edited", we append to it?
                // Actually, just appending another _edited_TIMESTAMP is fine for history, 
                // or we could replace the suffix if we don't want deep recursion of names, 
                // but user asked for "edited several times".
                // Let's just append for now to be safe and simple: 
                // photo_123.jpg -> photo_123_edited_{time}.jpg
                // Sort order descending: photo_123_edited... comes BEFORE photo_123.jpg because '_' > '.'

                const filename = `${originalName}_edited_${Date.now()}.jpg`;
                const path = `file://${APP_FOLDER_PATH}/${filename}`;

                await RNFS.writeFile(path, base64, 'base64');

                if (Platform.OS === 'android') {
                    await CameraRoll.saveAsset(path, { type: 'photo' });
                }

                DeviceEventEmitter.emit('REFRESH_GALLERY');

                Alert.alert(
                    "Saved",
                    "Image saved successfully!",
                    [{ text: "OK", onPress: () => navigation.goBack() }]
                );
            }
        } catch (e) {
            console.error('Save failed', e);
            Alert.alert("Error", "Failed to save image.");
        } finally {
            setIsSaving(false);
        }
    };

    const renderFilterItem = ({ item, index }: { item: any, index: number }) => {
        const isSelected = index === selectedFilterIndex;
        // Increase width for the rectangle look
        const defaultWidth = 70;
        // Center the selected item? Logic simplification: Just highlight border

        return (
            <TouchableOpacity
                style={[styles.filterItem, isSelected && styles.filterItemActive]}
                onPress={() => setSelectedFilterIndex(index)}
            >
                <LinearGradient
                    colors={item.gradientBackground}
                    style={styles.filterGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Text style={[styles.filterName, isSelected && styles.filterNameActive]}>
                        {item.name}
                    </Text>
                </LinearGradient>
            </TouchableOpacity>
        );
    };

    // Calculate aspect ratio for display
    const { width: dispW, height: dispH } = useMemo(() => {
        if (!skImage) return { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.6 };
        const imgW = skImage.width();
        const imgH = skImage.height();
        const screenAspect = SCREEN_WIDTH / (SCREEN_HEIGHT * 0.6);
        const imgAspect = imgW / imgH;

        let w, h;
        if (imgAspect > screenAspect) {
            w = SCREEN_WIDTH;
            h = SCREEN_WIDTH / imgAspect;
        } else {
            h = SCREEN_HEIGHT * 0.6;
            w = h * imgAspect;
        }
        return { width: w, height: h };
    }, [skImage]);


    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.button}>
                    <Icon name="close" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.title}>Edit Photo</Text>
                <TouchableOpacity onPress={handleSave} style={styles.button} disabled={isSaving || !skImage}>
                    {isSaving ? <Text style={{ color: 'white' }}>...</Text> : <Icon name="check" size={28} color="white" />}
                </TouchableOpacity>
            </View>

            {/* Main Preview */}
            <View style={styles.previewContainer}>
                {skImage ? (
                    <Canvas style={{ width: dispW, height: dispH }} ref={canvasRef}>
                        <Image
                            image={skImage}
                            x={0}
                            y={0}
                            width={dispW}
                            height={dispH}
                            fit="contain"
                        >
                            <ColorMatrix matrix={FILTERS[selectedFilterIndex].matrix} />
                        </Image>
                    </Canvas>
                ) : (
                    <Text style={{ color: 'white' }}>Loading...</Text>
                )}
            </View>

            {/* Filter Selector */}
            <View style={[styles.filterSelector, { paddingBottom: insets.bottom + 10 }]}>
                <FlatList
                    data={FILTERS}
                    renderItem={renderFilterItem}
                    keyExtractor={(item) => item.name}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterListContent}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        height: 100, // Approximate header height including status bar
    },
    title: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    button: {
        padding: 5,
    },
    previewContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterSelector: {
        height: 100,
        backgroundColor: 'rgba(20, 20, 20, 0.9)',
    },
    filterListContent: {
        paddingHorizontal: 10,
        alignItems: 'center',
    },
    filterItem: {
        marginHorizontal: 5,
        borderRadius: 10,
        overflow: 'hidden',
        width: 80,
        height: 80,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    filterItemActive: {
        borderColor: '#00FFFF', // Highlight border
    },
    filterGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterName: {
        color: 'white',
        fontSize: 12,
        textShadowColor: 'rgba(0,0,0,0.7)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
        fontWeight: 'bold',
    },
    filterNameActive: {
        color: '#00FFFF',
        textShadowColor: 'black',
    }
});
