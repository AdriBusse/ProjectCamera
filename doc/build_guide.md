# How to Build the Android APK

Since you want to execute the steps yourself, here is a complete guide to building the APK.

## Option 1: Quick Debug APK (Testing)
This is the easiest way to give the app to someone else or install it without connecting to a computer. Note that "Debug" APKs are slower than Release APKs because they contain debugging logic and no optimization.

1.  **Navigate to the android directory**:
    ```bash
    cd android
    ```

2.  **Run the build command**:
    ```bash
    ./gradlew assembleDebug
    ```

3.  **Locate the APK**:
    Once finished, the APK will be at:
    `android/app/build/outputs/apk/debug/app-debug.apk`

---

## Option 2: Production Release APK (Optimized)
Currently, your project is configured to use the **debug keystore** even for release builds (this is insecure for Play Store but fine for personal testing). It gives you the performance of a Release build (fast!) but without needing to generate keys manually yet.

1.  **Navigate to the android directory**:
    ```bash
    cd android
    ```

2.  **Clean previous builds (Recommended)**:
    ```bash
    ./gradlew clean
    ```

3.  **Run the build command**:
    ```bash
    ./gradlew assembleRelease
    ```

4.  **Locate the APK**:
    `android/app/build/outputs/apk/release/app-release.apk`

---

## Option 3: Proper Signed Release (Play Store Ready)
If you want to create a formal key for strict security:

1.  **Generate a Keystore**:
    Run this in your terminal (mac/linux):
    ```bash
    keytool -genkey -v -keystore my-upload-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
    ```
    *Place the generated file in `android/app/`.*

2.  **Update `android/app/build.gradle`**:
    Edit the `signingConfigs` block:
    ```gradle
    signingConfigs {
        release {
            storeFile file('my-upload-key.keystore')
            storePassword 'YOUR_PASSWORD'
            keyAlias 'my-key-alias'
            keyPassword 'YOUR_PASSWORD'
        }
    }
    ```
    And update `buildTypes.release` to use `signingConfig signingConfigs.release`.

3.  **Build**:
    ```bash
    cd android && ./gradlew assembleRelease
    ```
