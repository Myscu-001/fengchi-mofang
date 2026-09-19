# ---- Capacitor 核心保留 ----
# Capacitor 通过反射 / 插件机制加载原生类，必须整体保留，否则运行时会找不到插件。
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.** { *; }
-dontwarn com.getcapacitor.**
-dontwarn com.capacitorjs.**

# 保留 WebView JS 桥接方法（@JavascriptInterface 注解的方法会被反射调用）
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# 本项目原生包
-keep class com.fengchi.mofang.** { *; }

# 保留注解与签名信息，避免反射 / 序列化在运行时出错
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# WebView 及系统相关
-keep class android.webkit.** { *; }
-dontwarn android.webkit.**
