import { useState, useEffect, useCallback } from 'react';
import { DeviceEventEmitter } from 'react-native';
import RNFS from 'react-native-fs';
import { APP_FOLDER_PATH } from '../utils/constants';

export const useGallery = () => {
    const [photos, setPhotos] = useState<string[]>([]);

    const loadPhotos = useCallback(async () => {
        try {
            const exists = await RNFS.exists(APP_FOLDER_PATH);
            if (!exists) {
                await RNFS.mkdir(APP_FOLDER_PATH);
                setPhotos([]);
                return;
            }

            const files = await RNFS.readDir(APP_FOLDER_PATH);
            // Filter for images and sort by date (newest first)
            const imageFiles = files
                .filter(f => f.isFile() && /\.(jpg|jpeg|png)$/i.test(f.name))
                .sort((a, b) => (b.mtime?.getTime() ?? 0) - (a.mtime?.getTime() ?? 0))
                .map(f => f.path);

            setPhotos(imageFiles);
        } catch (e) {
            console.error('Failed to load photos', e);
        }
    }, []);

    const deletePhoto = useCallback(async (path: string) => {
        try {
            await RNFS.unlink(path);
            await loadPhotos();
        } catch (e) {
            console.error('Failed to delete photo', path, e);
        }
    }, [loadPhotos]);

    useEffect(() => {
        loadPhotos();
        const subscription = DeviceEventEmitter.addListener('REFRESH_GALLERY', loadPhotos);
        return () => subscription.remove();
    }, [loadPhotos]);

    return { photos, loadPhotos, deletePhoto };
};
