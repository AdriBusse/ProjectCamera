import React, { useCallback } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, Dimensions, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGallery } from '../hooks/useGallery';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const IMAGE_SIZE = width / COLUMN_COUNT;

export function GalleryScreen({ navigation }: any) {
    const { photos, deletePhoto, loadPhotos } = useGallery();
    const insets = useSafeAreaInsets();

    // Reload when screen comes into focus
    React.useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadPhotos();
        });
        return unsubscribe;
    }, [navigation, loadPhotos]);

    const handleDelete = (path: string) => {
        Alert.alert(
            'Delete Photo',
            'Are you sure you want to delete this photo?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deletePhoto(path) }
            ]
        );
    };

    const renderItem = useCallback(({ item }: { item: string }) => {
        return (
            <TouchableOpacity
                style={{ width: IMAGE_SIZE, height: IMAGE_SIZE }}
                onLongPress={() => handleDelete(item)}
                onPress={() => navigation.navigate('Photo', { path: item })}
            >
                <Image
                    source={{ uri: `file://${item}` }}
                    style={[styles.thumbnail, { width: IMAGE_SIZE, height: IMAGE_SIZE }]}
                    resizeMode="cover"
                />
            </TouchableOpacity>
        );
    }, [handleDelete, navigation]);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.headerText}>Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Gallery</Text>
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
        paddingHorizontal: 20,
        borderBottomWidth: 0.5,
        borderBottomColor: '#333',
    },
    backButton: {
        marginRight: 20,
    },
    headerText: {
        color: 'white',
        fontSize: 16,
    },
    title: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    list: {
        // padding: 1, // Optional spacing
    },
    thumbnail: {
        borderWidth: 1,
        borderColor: 'black'
    },
});
