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
            // Filter for images and sort by name (descending) to group edits with originals if named appropriately
            const imageFiles = files
                .filter(f => f.isFile() && /\.(jpg|jpeg|png)$/i.test(f.name))
                .sort((a, b) => b.name.localeCompare(a.name))
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

    const getPhotoGroups = useCallback((allPhotos: string[]) => {
        const groups: { [key: string]: string[] } = {};

        allPhotos.forEach(path => {
            const filename = path.split('/').pop() || '';
            // Match pattern: original_name + optional (_edited_TIMESTAMP)
            // We want to extract "original_name"
            // Example: photo_123.jpg
            // Example: photo_123_edited_456.jpg
            // Regex: ^(.+?)(_edited_\d+)*\.jpg$
            // Actually simpler: split by '_edited_'
            let baseName = filename;
            if (filename.includes('_edited_')) {
                baseName = filename.split('_edited_')[0] + '.jpg'; // Re-add extension for consistency if needed, or just use base ID
            }

            // However, we need to group by the "Base File" really.
            // If we have `photo_123.jpg` and `photo_123_edited...`, the base is `photo_123`.

            const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
            const baseId = nameWithoutExt.split('_edited_')[0]; // "photo_123"

            if (!groups[baseId]) {
                groups[baseId] = [];
            }
            groups[baseId].push(path);
        });

        // Now create a list of representatives (the newest one in each group)
        // Groups are already containing paths.
        // Since input `allPhotos` is already sorted descending (Newest first),
        // the first item in `groups[baseId]` is the newest version.

        return Object.values(groups).map(group => ({
            id: group[0], // Use path of newest as ID
            preview: group[0],
            allVersions: group, // Still sorted descending
            isGrouped: group.length > 1
        }));
    }, []);

    return { photos, loadPhotos, deletePhoto, getPhotoGroups };
};
