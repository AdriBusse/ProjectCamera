import React, { useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Text, Dimensions, Alert, Linking, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RNFS from 'react-native-fs';

const { width, height } = Dimensions.get('window');

import { PhotoMenu } from '../components/PhotoMenu';

export function PhotoScreen({ route, navigation }: any) {
    const { path } = route.params;
    const insets = useSafeAreaInsets();
    const [imagePath, setImagePath] = useState(path);
    const [menuVisible, setMenuVisible] = useState(false);

    const onOpenGallery = async () => {
        try {
            const url = `file://${imagePath}`;
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
        try {
            await RNFS.unlink(imagePath);
            navigation.goBack();
        } catch (e) {
            Alert.alert('Error', 'Failed to delete file.');
        }
    };

    return (
        <View style={styles.container}>
            <Image
                source={{ uri: `file://${imagePath}` }}
                style={styles.image}
                resizeMode="contain"
            />

            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.button}>
                    <Text style={styles.buttonText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.button}>
                    <Text style={styles.menuIcon}>⋮</Text>
                </TouchableOpacity>
            </View>

            <PhotoMenu
                visible={menuVisible}
                onClose={() => setMenuVisible(false)}
                onOpenGallery={onOpenGallery}
                onDelete={onDelete}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    image: {
        width: width,
        height: height,
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 10,
        backgroundColor: 'rgba(0,0,0,0.3)', // Semi-transparent header
    },
    button: {
        padding: 10,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    menuIcon: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        lineHeight: 24,
    }
});
