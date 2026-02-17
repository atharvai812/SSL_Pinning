# 🔐 SSL Pinning Bypass Using Frida (Android Studio Emulator)

This repository demonstrates how to bypass SSL pinning on Android applications using **Frida + Burp Suite** on an **Android Studio Emulator (x86_64)**.

This is a **dynamic instrumentation approach** commonly used in **mobile application penetration testing**.

---

## ⚠️ Disclaimer:
This guide is for educational and authorized security testing purposes only. Do not test applications without proper permission.

---

## 📂 Repository Structure

```
.
├── README.md
└── ssl_bypass.js
```

* `README.md` → This guide
* `ssl_bypass.js` → SSL pinning bypass Frida script (used in Step 7)

---

## ✅ Assumptions

* Windows host
* Android Studio Emulator (Android 10+ recommended)
* Burp Suite for interception
* Python 3.9+
* Frida host tools installed

---

# 🧱 STEP 0: One-Time Prerequisites

### 0.1 Install Python

Verify:

```bash
python --version
```

---

### 0.2 Install Frida (Host)

```bash
pip install frida frida-tools
```

Verify:

```bash
frida --version
```

---

# 📱 STEP 1: Start Android Studio Emulator

1. Open Android Studio
2. Launch emulator (Pixel / Android 10+)
3. Wait until fully booted

Verify device:

```bash
adb devices
```

Expected:

```
emulator-5554   device
```

---

# 🧠 STEP 2: Check Emulator CPU Architecture

```bash
adb shell getprop ro.product.cpu.abi
```

Typical output:

```
x86_64
```

⚠️ Remember this.

---

# 🚀 STEP 3: Download Matching frida-server

Download from:

[https://github.com/frida/frida/releases](https://github.com/frida/frida/releases)

Example:

If host Frida is:

```
17.2.17
```

Download:

```
frida-server-17.2.17-android-x86_64.xz
```

Then:

* Extract
* Rename to:

```
fridaserver
```

---

# 📤 STEP 4: Push frida-server to Emulator

```bash
adb push fridaserver /data/local/tmp/
adb shell
```

Inside emulator:

```bash
cd /data/local/tmp
chmod 755 fridaserver
./fridaserver &
```

Verify from host:

```bash
frida-ps -U
```

If Android processes appear → success 🎉

---

# 🌐 STEP 5: Burp Proxy Setup

### 5.1 Configure Emulator Proxy

Emulator gateway:

```
10.0.2.2
```

Proxy:

```
Host: 10.0.2.2
Port: 8080
```

---

### 5.2 Install Burp CA Certificate

1. Export Burp cert (`cacert.der`)
2. Push to emulator
3. Install as **User Certificate**

⚠️ Android 7+ ignores user certs — hence SSL pinning bypass is required.

---

# 📦 STEP 6: Identify Target App Package

```bash
adb shell pm list packages | findstr yourapp
```

Example:

```
com.example.targetapp
```

---

# 🧪 STEP 7: SSL Pinning Bypass Script

The primary script used in this repository:

👉 **[`ssl_bypass.js`](./ssl_bypass.js)**

You can directly use the included script.

---

## 📚 Reference Script (Community Version)

This implementation is inspired by the widely used universal SSL pinning bypass script from Frida CodeShare:

🔗 https://codeshare.frida.re/@pcipolloni/universal-android-ssl-pinning-bypass-with-frida/

The CodeShare version contains additional universal hooks and broader compatibility for different SSL implementations.

---

> 💡 Tip:  
> If the included script does not bypass pinning for your target app, try the CodeShare script directly using:
>
> ```bash
> frida --codeshare pcipolloni/universal-android-ssl-pinning-bypass-with-frida -U -f com.example.targetapp
> ```

---

# ▶️ STEP 8: Inject Script (Spawn Method – Recommended)

```bash
frida -U -f com.example.targetapp -l ssl_bypass.js --no-pause
```

Expected logs:

```
[+] SSLContext bypass
[+] OkHttp SSL Pinning bypass
```

🎉 Pinning disabled.

---

# 🔍 STEP 9: Verify in Burp

1. Open the app
2. Trigger API calls
3. Check Burp

If HTTPS traffic appears → SUCCESS ✅

---

# 🔄 After Emulator Restart

Frida bypass is **not persistent**.

Each reboot:

1. Start emulator
2. Start frida-server
3. Run Frida command again

Permanent bypass requires APK patching (advanced).

---

# 🧠 Common Issues

### ❌ Address already in use

```bash
pkill -f fridaserver
./fridaserver &
```

---

### ❌ No traffic in Burp

* Always use `-f` (spawn)
* App may use native pinning → needs native hooks

---

# ✅ Final Notes

This is the **industry-standard dynamic SSL pinning bypass workflow** used in mobile application security assessments.

