# GitHub Actions Setup Guide

 This guide explains how to configure your GitHub repository to build the Android APK and notify n8n automatically.

## 1. Prepare your Keystore

You need to encode your existing keystore file (`android/app/my-upload-key.keystore`) into a Base64 string to store it securely in GitHub Secrets.

**Run this command in your terminal (macOS):**

```bash
base64 -i android/app/my-upload-key.keystore | pbcopy
```

This will copy the Base64 string to your clipboard.

## 2. Add GitHub Secrets

Go to your GitHub repository -> **Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret**.

Add the following secrets:

| Name | Value | Description |
|------|-------|-------------|
| `ANDROID_KEYSTORE_BASE64` | *[Paste from clipboard]* | The Base64 encoded content of your keystore file. |
| `MYAPP_UPLOAD_STORE_PASSWORD` | `Hallo123` | Your keystore store password. |
| `MYAPP_UPLOAD_KEY_ALIAS` | `my-key-alias` | Your key alias. |
| `MYAPP_UPLOAD_KEY_PASSWORD` | `Hallo123` | Your key password. |
| `N8N_WEBHOOK_URL` | *[Your n8n URL]* | The webhook URL for n8n to receive notifications. |
| `N8N_SHARED_SECRET` | *[Your Secret]* | The shared secret header value for n8n authentication. |
| `GDRIVE_FOLDER_ID` | *[Folder ID]* | The Google Drive folder ID where artifacts might be stored/referenced by n8n. |

## 3. Workflow Details

The workflow is defined in `.github/workflows/build_apk.yml`.

**What it does:**
1.  Triggers on push to `main` branch.
2.  Sets up Java 17 and Node.js 20.
3.  Installs dependencies (`npm ci`).
4.  Decodes the `ANDROID_KEYSTORE_BASE64` secret back into a file.
5.  Builds the Release APK using Gradle.
6.  Uploads the APK to GitHub Actions Artifacts.
7.  Sends a POST request to your n8n webhook with build details.

## 4. Gradle Configuration

Your `android/app/build.gradle` has been updated to automatically use these environment variables if they exist, while falling back to your local hardcoded values for local development.

```gradle
release {
    storeFile file(System.getenv("MYAPP_UPLOAD_STORE_FILE") ?: "my-upload-key.keystore")
    storePassword System.getenv("MYAPP_UPLOAD_STORE_PASSWORD") ?: "Hallo123"
    keyAlias System.getenv("MYAPP_UPLOAD_KEY_ALIAS") ?: "my-key-alias"
    keyPassword System.getenv("MYAPP_UPLOAD_KEY_PASSWORD") ?: "Hallo123"
}
```

This ensures the build works both locally (using the file on disk) and in CI (using the injected secrets).
