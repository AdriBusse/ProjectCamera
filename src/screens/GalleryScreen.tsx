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
    const { photos, deletePhoto, loadPhotos } = useGallery();
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();

    const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);

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

    const handlePress = (path: string, index: number) => {
        if (isSelectionMode) {
            toggleSelection(path);
        } else {
            navigation.navigate('Photo', { photos, initialIndex: index });
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

    const renderItem = useCallback(({ item, index }: { item: string, index: number }) => {
        const isSelected = selectedPhotos.has(item);

        return (
            <TouchableOpacity
                style={{ width: IMAGE_SIZE, height: IMAGE_SIZE }}
                onLongPress={() => handleLongPress(item)}
                onPress={() => handlePress(item, index)}
                activeOpacity={0.7}
            >
                <Image
                    source={{ uri: `file://${item}` }}
                    style={[
                        styles.thumbnail,
                        { width: IMAGE_SIZE, height: IMAGE_SIZE },
                        isSelected && { borderColor: theme.primaryColor, borderWidth: 3 }
                    ]}
                    resizeMode="cover"
                />

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
    }, [selectedPhotos, isSelectionMode, theme]);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
                    <Icon name="arrow-left" size={28} color="white" />
                </TouchableOpacity>

                <Text style={styles.title}>
                    {isSelectionMode ? `${selectedPhotos.size} Selected` : 'Gallery'}
                </Text>

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
                data={photos}
                renderItem={renderItem}
                keyExtractor={item => item}
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
    }
});
