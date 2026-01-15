import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CameraScreen } from './src/screens/CameraScreen';
import { GalleryScreen } from './src/screens/GalleryScreen';
import { PhotoScreen } from './src/screens/PhotoScreen';

// const CameraScreen = () => <></>;
// const GalleryScreen = () => <></>;

const Stack = createNativeStackNavigator();

import { GestureHandlerRootView } from 'react-native-gesture-handler';

function App() {
    console.log('App.tsx: CameraScreen:', CameraScreen);
    console.log('App.tsx: GalleryScreen:', GalleryScreen);
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <StatusBar barStyle="light-content" backgroundColor="black" />
                <NavigationContainer>
                    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
                        <Stack.Screen name="Camera" component={CameraScreen} />
                        <Stack.Screen name="Gallery" component={GalleryScreen} />
                        <Stack.Screen name="Photo" component={PhotoScreen} />
                    </Stack.Navigator>
                </NavigationContainer>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}

export default App;
