import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CameraScreen } from './src/screens/CameraScreen';
import { GalleryScreen } from './src/screens/GalleryScreen';
import { PhotoScreen } from './src/screens/PhotoScreen';
import { ImageEditScreen } from './src/screens/ImageEditScreen';

// const CameraScreen = () => <></>;
// const GalleryScreen = () => <></>;

const Stack = createNativeStackNavigator();

import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ThemeProvider } from './src/context/ThemeContext';

function App(): React.JSX.Element {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemeProvider>
                <SafeAreaProvider>
                    <StatusBar barStyle="light-content" backgroundColor="black" />
                    <NavigationContainer>
                        <Stack.Navigator screenOptions={{ headerShown: false }}>
                            <Stack.Screen name="Camera" component={CameraScreen} />
                            <Stack.Screen name="Gallery" component={GalleryScreen} />
                            <Stack.Screen name="Photo" component={PhotoScreen} />
                            <Stack.Screen name="ImageEdit" component={ImageEditScreen} />
                        </Stack.Navigator>
                    </NavigationContainer>
                </SafeAreaProvider>
            </ThemeProvider>
        </GestureHandlerRootView>
    );
}

export default App;
