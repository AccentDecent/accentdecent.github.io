# Android Mod Menu

1. Set the repo up in Android Studio: https://github.com/LGLTeam/Android-Mod-Menu

2. Download apkeasytool and decompile your game of choice
3. Make changes in the repo and build it as an apk.
4. Decompile the built apk aswell
5. Copy the lib folder into your games decompiled lib folder
6. Copy the folder com.android.support from your decompiled Mod Menu into the smali folder of your game
7. On first time use, find the Main Activity of your game (should be shown in APK Easy Tool)
9. Edit the smali and go in the ``onCreate`` method. Paste this at the start (after any labels):
   
 ```java
 invoke-static {p0}, Lcom/android/support/Main;->Start(Landroid/content/Context;)V
 ```
10. Compile the game folder using APK Easy Tool
