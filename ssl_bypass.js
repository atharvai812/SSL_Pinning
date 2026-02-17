// Universal-ish Android SSL pinning bypass (TrustManager, Conscrypt, OkHttp3, WebView)

Java.perform(function () {
  function log(msg) { console.log("[SSL BYPASS] " + msg); }

  // ---- X509TrustManager: accept all ----
  var X509TM = Java.use('javax.net.ssl.X509TrustManager');
  var TrustManager = Java.registerClass({
    name: 'com.frida.CustomTrustManager',
    implements: [X509TM],
    methods: {
      checkClientTrusted: function (chain, authType) {},
      checkServerTrusted: function (chain, authType) {},
      getAcceptedIssuers: function () { return []; }
    }
  });

  // SSLContext.init -> install our TrustManager
  try {
    var SSLContext = Java.use('javax.net.ssl.SSLContext');
    SSLContext.init.overload(
      '[Ljavax.net.ssl.KeyManager;',
      '[Ljavax.net.ssl.TrustManager;',
      'java.security.SecureRandom'
    ).implementation = function (kms, tms, sr) {
      log('Hooking SSLContext.init() -> injecting permissive TrustManager');
      var tm = [ TrustManager.$new() ];
      return this.init(kms, tm, sr);
    };
  } catch (e) { log('SSLContext hook err: ' + e); }

  // ---- Android 7+ Conscrypt TrustManagerImpl ----
  var tmImplClasses = [
    'com.android.org.conscrypt.TrustManagerImpl',
    'org.conscrypt.TrustManagerImpl'  // some ROMs
  ];
  tmImplClasses.forEach(function (cls) {
    try {
      var TMI = Java.use(cls);

      // verifyChain (newer Androids)
      if (TMI.verifyChain) {
        TMI.verifyChain.implementation = function (untrustedChain, trustAnchorChain, host, clientAuth, ocspData, tlsSctData) {
          log(cls + '.verifyChain() bypass');
          return untrustedChain;
        };
      }

      // checkTrusted (older variants)
      ['checkTrusted','checkServerTrusted','checkClientTrusted'].forEach(function (m) {
        if (TMI[m]) {
          TMI[m].overloads.forEach(function (ov) {
            ov.implementation = function () {
              log(cls + '.' + m + '() bypass');
              try { return ov.apply(this, arguments); } catch (e) { return []; }
            };
          });
        }
      });
    } catch (e) { /* class may not exist on this build */ }
  });

  // ---- OkHttp3 CertificatePinner ----
  try {
    var CertPinner = Java.use('okhttp3.CertificatePinner');
    // OkHttp 3.x: check(String, List)
    if (CertPinner.check.overloads.length) {
      CertPinner.check.overloads.forEach(function (ov) {
        if (ov.argumentTypes.length === 2) {
          ov.implementation = function (hostname, peerCerts) {
            log('OkHttp3 CertificatePinner.check(' + hostname + ') bypass');
            return; // do nothing -> bypass pinning
          };
        }
      });
    }
    // Some builds have synthetic method name:
    if (CertPinner['check$okhttp']) {
      CertPinner['check$okhttp'].implementation = function () {
        log('OkHttp3 CertificatePinner.check$okhttp() bypass');
        return;
      };
    }
  } catch (e) { /* OkHttp may not be used */ }

  // ---- WebViewClient onReceivedSslError ----
  try {
    var WebViewClient = Java.use('android.webkit.WebViewClient');
    WebViewClient.onReceivedSslError.implementation = function (view, handler, error) {
      log('WebViewClient.onReceivedSslError() -> proceeding');
      handler.proceed();
    };
  } catch (e) {}

  // ---- HostnameVerifier ----
  try {
    var HV = Java.use('javax.net.ssl.HostnameVerifier');
    var AllHostsHV = Java.registerClass({
      name: 'com.frida.AllHostsHV',
      implements: [HV],
      methods: { verify: function (h, s) { return true; } }
    });

    var HUC = Java.use('javax.net.ssl.HttpsURLConnection');
    HUC.setDefaultHostnameVerifier.implementation = function (v) {
      log('HttpsURLConnection.setDefaultHostnameVerifier() -> forcing always-true');
      return this.setDefaultHostnameVerifier(AllHostsHV.$new());
    };
    HUC.setHostnameVerifier.implementation = function (v) {
      log('HttpsURLConnection.setHostnameVerifier() -> forcing always-true');
      return this.setHostnameVerifier(AllHostsHV.$new());
    };
  } catch (e) {}

  log('Installed hooks.');
});
