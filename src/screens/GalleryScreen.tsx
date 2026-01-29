import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, Dimensions, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGallery } from '../hooks/useGallery';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const IMAGE_SIZE = width / COLUMN_COUNT;

export function GalleryScreen({ navigation }: any) {
    const { photos, deletePhoto, loadPhotos, getPhotoGroups } = useGallery();
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();

    const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [showGrouped, setShowGrouped] = useState(true); // Default to grouped view

    // Prepare data directly in render or useMemo.
    // getPhotoGroups returns { id, preview, allVersions, isGrouped }
    const galleryData = React.useMemo(() => {
        if (showGrouped) {
            return getPhotoGroups(photos); // Returns array of objects
        } else {
            // Map plain photos to consistent structure
            return photos.map(path => ({
                id: path,
                preview: path,
                allVersions: [path],
                isGrouped: false
            }));
        }
    }, [photos, showGrouped, getPhotoGroups]);

    // Reload when screen comes into focus
    React.useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadPhotos();
            // Reset selection on return
            setIsSelectionMode(false);
            setSelectedPhotos(new Set());
        });
        return unsubscribe;
    }, [navigation, loadPhotos]);

    const toggleSelection = (path: string) => {
        const newSelected = new Set(selectedPhotos);
        if (newSelected.has(path)) {
            newSelected.delete(path);
            if (newSelected.size === 0) setIsSelectionMode(false);
        } else {
            newSelected.add(path);
        }
        setSelectedPhotos(newSelected);
    };

    const handleLongPress = (path: string) => {
        setIsSelectionMode(true);
        const newSelected = new Set(selectedPhotos);
        newSelected.add(path);
        setSelectedPhotos(newSelected);
    };

    const handlePress = (item: any, index: number) => {
        if (isSelectionMode) {
            toggleSelection(item.preview);
        } else {
            // If grouped, pass only the relevant group versions or the flat list?
            // User requirement: "in the image i can press again on a button to see all versions"
            // So default behavior is just showing the clicked image.
            navigation.navigate('Photo', {
                photos: galleryData.map(d => d.preview), // Context is current view
                initialIndex: index,
                groupVersions: item.allVersions // Passthrough group versions for this specific item
            });
        }
    };

    const confirmDelete = () => {
        Alert.alert(
            'Delete Photos',
            `Are you sure you want to delete ${selectedPhotos.size} photo(s)?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        // Delete all selected
                        const promises = Array.from(selectedPhotos).map(path => deletePhoto(path));
                        await Promise.all(promises);
                        setSelectedPhotos(new Set());
                        setIsSelectionMode(false);
                    }
                }
            ]
        );
    };

    const cancelSelection = () => {
        setIsSelectionMode(false);
        setSelectedPhotos(new Set());
    };

    const renderItem = useCallback(({ item, index }: { item: any, index: number }) => {
        const isSelected = selectedPhotos.has(item.preview);

        return (
            <TouchableOpacity
                style={{ width: IMAGE_SIZE, height: IMAGE_SIZE }}
                onLongPress={() => handleLongPress(item.preview)}
                onPress={() => handlePress(item, index)}
                activeOpacity={0.7}
            >
                <Image
                    source={{ uri: `file://${item.preview}` }}
                    style={[
                        styles.thumbnail,
                        { width: IMAGE_SIZE, height: IMAGE_SIZE },
                        isSelected && { borderColor: theme.primaryColor, borderWidth: 3 }
                    ]}
                    resizeMode="cover"
                />

                {/* Group Indicator (Small icon top right) */}
                {item.isGrouped && !isSelectionMode && (
                    <View style={styles.groupIndicator}>
                        <Icon name="layers-outline" size={16} color="white" />
                    </View>
                )}

                {isSelectionMode && (
                    <View style={styles.selectionIndicator}>
                        <Icon
                            name={isSelected ? "check-circle" : "circle-outline"}
                            size={24}
                            color={isSelected ? theme.primaryColor : "white"}
                        />
                    </View>
                )}
            </TouchableOpacity>
        );
    }, [selectedPhotos, isSelectionMode, theme, showGrouped]);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
                    <Icon name="arrow-left" size={28} color="white" />
                </TouchableOpacity>

                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.title}>
                        {isSelectionMode ? `${selectedPhotos.size} Selected` : 'Gallery'}
                    </Text>
                    {/* Toggle Button */}
                    {!isSelectionMode && (
                        <TouchableOpacity
                            onPress={() => setShowGrouped(!showGrouped)}
                            style={[styles.headerButton, { flexDirection: 'row', alignItems: 'center' }]}
                        >
                            <Icon
                                name={showGrouped ? "layers" : "view-grid"}
                                size={20}
                                color="white"
                                style={{ marginRight: 5 }}
                            />
                            <Text style={{ color: 'white', fontSize: 12 }}>
                                {showGrouped ? "Grouped" : "All"}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.headerActions}>
                    {isSelectionMode ? (
                        <>
                            <TouchableOpacity onPress={confirmDelete} style={styles.headerButton}>
                                <Icon name="trash-can-outline" size={28} color="#ff4444" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={cancelSelection} style={styles.headerButton}>
                                <Icon name="close" size={28} color="white" />
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity
                            onPress={() => setIsSelectionMode(true)}
                            style={styles.headerButton}
                            onLongPress={() => {
                                // Easter egg or advanced select all could go here
                            }}
                        >
                            <Icon name="checkbox-multiple-marked-outline" size={28} color="white" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <FlatList
                data={galleryData}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                numColumns={COLUMN_COUNT}
                contentContainerStyle={styles.list}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    header: {
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        borderBottomWidth: 0.5,
        borderBottomColor: '#333',
    },
    headerActions: {
        flexDirection: 'row',
    },
    headerButton: {
        padding: 5,
        marginLeft: 10,
    },
    title: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 15,
        flex: 1,
    },
    list: {
        // padding: 1, 
    },
    thumbnail: {
        borderWidth: 1,
        borderColor: 'black'
    },
    selectionIndicator: {
        position: 'absolute',
        top: 5,
        right: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.5,
        shadowRadius: 1,
        elevation: 2,
    },
    groupIndicator: {
        position: 'absolute',
        top: 5,
        right: 5,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 10,
        padding: 4,
    }
});
