import React, { useRef, useState, useEffect } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Dimensions, Alert, Linking, Platform, FlatList, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RNFS from 'react-native-fs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useWindowDimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function PhotoScreen({ route, navigation }: any) {
    const { photos, initialIndex, groupVersions } = route.params;
    const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
    const insets = useSafeAreaInsets();

    // Main viewing list (the context we opened from)
    const [viewingList, setViewingList] = useState<string[]>(photos || []);
    // Current main index
    const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);

    // Version Mode State
    const [isVersionMode, setIsVersionMode] = useState(false);
    // If we are in version mode, our data source is `groupVersions`
    // Ensure we start at the correct version index relative to the group
    const [currentVersionIndex, setCurrentVersionIndex] = useState(0);

    // Determines what we are currently looking at
    const currentList = isVersionMode && groupVersions ? groupVersions : viewingList;
    const activeIndex = isVersionMode ? currentVersionIndex : currentIndex;

    const flatListRef = useRef<FlatList>(null);
    const versionListRef = useRef<FlatList>(null);

    // Sync version index when entering version mode
    useEffect(() => {
        if (isVersionMode && groupVersions) {
            const mainPhoto = viewingList[currentIndex];
            const idx = groupVersions.indexOf(mainPhoto);
            if (idx !== -1) setCurrentVersionIndex(idx);
            else setCurrentVersionIndex(0);
        }
    }, [isVersionMode, currentIndex, groupVersions, viewingList]);

    // Force scroll logic for active mode...
    useEffect(() => {
        // Simple effect to jump if needed when switching modes
    }, [isVersionMode]);


    const onOpenGallery = async () => {
        const currentPath = currentList[activeIndex];
        if (!currentPath) return;

        try {
            const url = `file://${currentPath}`;
            const supported = await Linking.canOpenURL(url);

            if (supported || Platform.OS === 'android') {
                await Linking.openURL(url);
            } else {
                Alert.alert('Error', 'Cannot open this file externally.');
            }
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to open file. You might need a File Viewer app.');
        }
    };

    const onDelete = async () => {
        const currentPath = currentList[activeIndex];
        if (!currentPath) return;

        Alert.alert(
            'Delete Photo',
            'Are you sure you want to delete this photo?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await RNFS.unlink(currentPath);

                            // Logic is complex here:
                            // If in Version Mode -> Remove from groupVersions AND viewingList (if matched)
                            // If in Main Mode -> Remove from viewingList

                            // For simplicity, let's just go back for now to reload
                            navigation.goBack();
                        } catch (e) {
                            Alert.alert('Error', 'Failed to delete file.');
                        }
                    }
                }
            ]
        );
    };

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            const newIndex = viewableItems[0].index ?? 0;
            if (isVersionMode) setCurrentVersionIndex(newIndex);
            else setCurrentIndex(newIndex);
        }
    }).current;

    const renderItem = ({ item }: { item: string }) => {
        const isOriginal = !item.includes('_edited_');

        return (
            <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
                <Image
                    source={{ uri: `file://${item}` }}
                    style={styles.image}
                    resizeMode="contain"
                />

                {/* Original Badge */}
                {isOriginal && (
                    <View style={[styles.badgeContainer, isVersionMode && { bottom: 140 }]}>
                        <Text style={styles.badgeText}>ORIGINAL</Text>
                    </View>
                )}
            </View>
        );
    };

    const renderVersionThumb = ({ item, index }: { item: string, index: number }) => {
        const isActive = index === currentVersionIndex;
        const isOriginal = !item.includes('_edited_');
        return (
            <TouchableOpacity
                onPress={() => {
                    setCurrentVersionIndex(index);
                    flatListRef.current?.scrollToIndex({ index, animated: true });
                }}
                style={[styles.versionThumb, isActive && styles.versionThumbActive]}
            >
                <Image source={{ uri: `file://${item}` }} style={styles.thumbImage} />
                {isOriginal && <View style={styles.thumbBadge}><Text style={{ fontSize: 8, color: 'black', fontWeight: 'bold' }}>ORIG</Text></View>}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                ref={flatListRef}
                data={currentList}
                renderItem={renderItem}
                keyExtractor={item => item} // Assuming unique paths
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={activeIndex}
                onScrollToIndexFailed={() => { }}
                getItemLayout={(data, index) => (
                    { length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index }
                )}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
                removeClippedSubviews={false}
                initialNumToRender={1}
                windowSize={3}
            />

            <View style={[styles.header, { paddingTop: insets.top, height: insets.top + 60 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.button}>
                    <Icon name="arrow-left" size={28} color="white" />
                </TouchableOpacity>

                <View style={[styles.rightActions, { flex: 1, justifyContent: 'flex-end' }]}>
                    {/* Version Toggle */}
                    {(groupVersions && groupVersions.length > 1) && (
                        <TouchableOpacity
                            onPress={() => setIsVersionMode(!isVersionMode)}
                            style={[styles.button, isVersionMode && { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 }]}
                        >
                            <Icon name="history" size={28} color={isVersionMode ? "#00FFFF" : "white"} />
                        </TouchableOpacity>
                    )}

                    {!isVersionMode && (
                        <TouchableOpacity
                            onPress={() => {
                                if (currentList[activeIndex]) {
                                    navigation.navigate('ImageEdit', { imagePath: currentList[activeIndex] });
                                }
                            }}
                            style={styles.button}
                        >
                            <Icon name="pencil" size={28} color="white" />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity onPress={onOpenGallery} style={styles.button}>
                        <Icon name="image-outline" size={28} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onDelete} style={styles.button}>
                        <Icon name="trash-can-outline" size={28} color="#ff4444" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Bottom Version Strip */}
            {isVersionMode && groupVersions && (
                <View style={[styles.versionStrip, { paddingBottom: insets.bottom + 10 }]}>
                    <Text style={{ color: 'white', marginBottom: 5, fontSize: 12 }}>Version History ({currentVersionIndex + 1}/{groupVersions.length})</Text>
                    <FlatList
                        data={groupVersions}
                        renderItem={renderVersionThumb}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={item => item}
                        contentContainerStyle={{ paddingHorizontal: 10 }}
                    />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    image: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    button: {
        padding: 5,
    },
    rightActions: {
        flexDirection: 'row',
        gap: 15
    },
    badgeContainer: {
        position: 'absolute',
        bottom: 30,
        backgroundColor: '#FFD700',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    badgeText: {
        color: 'black',
        fontWeight: 'bold',
        fontSize: 12
    },
    versionStrip: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        alignItems: 'center',
        paddingTop: 10
    },
    versionThumb: {
        width: 60,
        height: 80,
        marginHorizontal: 5,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    versionThumbActive: {
        borderColor: '#00FFFF',
    },
    thumbImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    thumbBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#FFD700',
        paddingHorizontal: 2,
    }
});
