import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, Platform } from 'react-native';

interface Props {
    visible: boolean;
    onClose: () => void;
    onOpenGallery: () => void;
    onDelete: () => void;
}

export const PhotoMenu = ({ visible, onClose, onOpenGallery, onDelete }: Props) => {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <View style={styles.menuContainer}>
                        <TouchableOpacity style={styles.menuItem} onPress={() => { onClose(); onOpenGallery(); }}>
                            <Text style={styles.menuText}>Open in Gallery</Text>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.menuItem} onPress={() => { onClose(); onDelete(); }}>
                            <Text style={[styles.menuText, styles.deleteText]}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0)', // Transparent, but catches touches
    },
    menuContainer: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 20, // Adjust for status bar / header rough position
        right: 20,
        backgroundColor: '#222',
        borderRadius: 8,
        paddingVertical: 5,
        minWidth: 150,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#444',
    },
    menuItem: {
        paddingVertical: 12,
        paddingHorizontal: 15,
    },
    menuText: {
        color: 'white',
        fontSize: 16,
    },
    deleteText: {
        color: '#ff4444',
    },
    divider: {
        height: 1,
        backgroundColor: '#444',
        marginHorizontal: 10,
    }
});
