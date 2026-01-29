# Reducing Android APK Size

The default React Native build creates a "Universal APK" that can be large (100MB+) because it usually contains native binaries for all supported architectures (x86, x86_64, armeabi-v7a, arm64-v8a) and unoptimized resources.

Here are the standard steps to reduce the size to a production-ready level (typically 30-50MB).

## 1. Enable Proguard (R8)
Proguard removes unused Java/Kotlin code and obfuscates the rest.
**File:** `android/app/build.gradle`
**Action:** Change `enableProguardInReleaseBuilds` to `true`.

```gradle
def enableProguardInReleaseBuilds = true
```

## 2. Enable Resource Shrinking
This removes unused images and XML layouts from your dependencies.
**File:** `android/app/build.gradle`
**Action:** Add `shrinkResources true` inside the `release` block.

```gradle
android {
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled enableProguardInReleaseBuilds
            shrinkResources true // <--- Add this line
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
        }
    }
}
```

## 3. Split APKs by Architecture
Instead of one big file, this builds separate APKs for each CPU type. You can upload all of them to the Play Store, or just use the `arm64-v8a` one for modern phones.
**File:** `android/app/build.gradle`
**Action:** Set `enableSeparateBuildPerCPUArchitecture` to `true`.

```gradle
def enableSeparateBuildPerCPUArchitecture = true
```

After enabling this, running `./gradlew assembleRelease` will produce multiple files in `android/app/build/outputs/apk/release/`, such as:
- `app-arm64-v8a-release.apk` (Use this for most modern Android phones)
- `app-armeabi-v7a-release.apk` (Older cheap phones)
- `app-x86_64-release.apk` (Emulators)

## 4. Use Android App Bundles (.aab)
If you are uploading to the Google Play Store, you don't need to manually manage splits. Just build an App Bundle. Google Play will generate the optimized, small APK for each user download.

**Command:**
```bash
cd android && ./gradlew bundleRelease
```
**Output:** `android/app/build/outputs/bundle/release/app-release.aab`
