import React, { useMemo } from 'react';
import { StyleSheet, View, Image, TouchableOpacity } from 'react-native';

interface GalleryPreviewButtonProps {
    photos: string[];
    onPress: () => void;
}

export const GalleryPreviewButton = ({ photos, onPress }: GalleryPreviewButtonProps) => {
    // We expect photos to be sorted (Newest First)
    const latestPhoto = photos.length > 0 ? photos[0] : null;
    // We want the previous photo. If we have > 1, it's index 1.
    const previousPhoto = photos.length > 1 ? photos[1] : null;

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.container}>
            {/* If no photos, show empty white box placeholder */}
            {!latestPhoto && (
                <View style={[styles.photo, styles.emptyPlaceholder]} />
            )}

            {/* Previous Photo (Back of stack) */}
            {previousPhoto && (
                <Image
                    source={{ uri: `file://${previousPhoto}` }}
                    style={[styles.photo, styles.backPhoto]}
                />
            )}

            {/* Latest Photo (Front of stack) */}
            {latestPhoto && (
                <Image
                    source={{ uri: `file://${latestPhoto}` }}
                    style={[styles.photo, styles.frontPhoto]}
                />
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    photo: {
        width: 48, // Slightly smaller than container to allow rotation
        height: 48,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: 'white',
        position: 'absolute',
    },
    emptyPlaceholder: {
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderColor: 'rgba(255,255,255,0.8)',
    },
    backPhoto: {
        transform: [{ rotate: '-6deg' }, { translateX: -4 }],
        opacity: 0.8,
        zIndex: 1,
    },
    frontPhoto: {
        zIndex: 2,
        // Default is centered 0 deg
    }
});
