import React, { useRef, useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Dimensions, Alert, Linking, Platform, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RNFS from 'react-native-fs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function PhotoScreen({ route, navigation }: any) {
    const { photos, initialIndex } = route.params;
    const insets = useSafeAreaInsets();

    // We maintain local state of photos to allow deletion
    const [currentPhotos, setCurrentPhotos] = useState<string[]>(photos || []);
    // Track current index
    const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);

    const onOpenGallery = async () => {
        if (currentPhotos.length === 0) return;
        const currentPath = currentPhotos[currentIndex];

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
        if (currentPhotos.length === 0) return;
        const currentPath = currentPhotos[currentIndex];

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

                            // Update local list
                            const newPhotos = [...currentPhotos];
                            newPhotos.splice(currentIndex, 1);

                            if (newPhotos.length === 0) {
                                navigation.goBack();
                                return;
                            }

                            setCurrentPhotos(newPhotos);
                            // Adjust index if we deleted the last item
                            if (currentIndex >= newPhotos.length) {
                                setCurrentIndex(newPhotos.length - 1);
                            }
                        } catch (e) {
                            Alert.alert('Error', 'Failed to delete file.');
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: string }) => {
        return (
            <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
                <Image
                    source={{ uri: `file://${item}` }}
                    style={styles.image}
                    resizeMode="contain"
                />
            </View>
        );
    };

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index ?? 0);
        }
    }).current;

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50
    }).current;

    return (
        <View style={styles.container}>
            <FlatList
                data={currentPhotos}
                renderItem={renderItem}
                keyExtractor={item => item}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={initialIndex}
                getItemLayout={(data, index) => (
                    { length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index }
                )}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
            />

            <View style={[styles.header, { paddingTop: insets.top, height: insets.top + 60 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.button}>
                    <Icon name="arrow-left" size={28} color="white" />
                </TouchableOpacity>

                <View style={styles.rightActions}>
                    <TouchableOpacity
                        onPress={() => {
                            if (currentPhotos[currentIndex]) {
                                navigation.navigate('ImageEdit', { imagePath: currentPhotos[currentIndex] });
                            }
                        }}
                        style={styles.button}
                    >
                        <Icon name="pencil" size={28} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onOpenGallery} style={styles.button}>
                        <Icon name="image-outline" size={28} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onDelete} style={styles.button}>
                        <Icon name="trash-can-outline" size={28} color="#ff4444" />
                    </TouchableOpacity>
                </View>
            </View>
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
    }
});
