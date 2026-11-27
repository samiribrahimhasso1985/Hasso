package net.ezidinet.dev;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * EZIDINET development shell: a WebView that loads the EZIDINET web app from a server address
 * chosen by the tester (e.g. the developer PC on the local network). No data is stored natively
 * except that address. The web app itself enforces all privacy rules on the server.
 */
public class MainActivity extends Activity {
    private static final String PREFS = "ezidinet";
    private static final String KEY_SERVER = "server_url";
    private static final String SETUP_URL = "file:///android_asset/setup.html";
    private static final int CAMERA_REQUEST = 7;

    private WebView web;
    private PermissionRequest pendingPermission;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);           // the web app keeps its session in sessionStorage
        s.setAllowFileAccess(false);            // only the bundled setup asset is loaded from file://
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(true);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);

        web.addJavascriptInterface(new Bridge(), "EzidinetShell");
        web.setWebViewClient(new ShellClient());
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                // Grant camera to the configured server only, and only after the Android permission.
                if (!isServerOrigin(request.getOrigin())) { request.deny(); return; }
                if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                    request.grant(new String[] { PermissionRequest.RESOURCE_VIDEO_CAPTURE });
                } else {
                    pendingPermission = request;
                    requestPermissions(new String[] { Manifest.permission.CAMERA }, CAMERA_REQUEST);
                }
            }
        });

        String server = savedServer();
        web.loadUrl(server == null ? SETUP_URL : server);
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] results) {
        if (code != CAMERA_REQUEST || pendingPermission == null) return;
        if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) {
            pendingPermission.grant(new String[] { PermissionRequest.RESOURCE_VIDEO_CAPTURE });
        } else {
            pendingPermission.deny();
        }
        pendingPermission = null;
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack(); else super.onBackPressed();
    }

    private String savedServer() {
        return getSharedPreferences(PREFS, MODE_PRIVATE).getString(KEY_SERVER, null);
    }

    private boolean isServerOrigin(Uri uri) {
        String server = savedServer();
        if (server == null || uri == null) return false;
        Uri s = Uri.parse(server);
        return eq(s.getScheme(), uri.getScheme()) && eq(s.getHost(), uri.getHost()) && port(s) == port(uri);
    }

    private static boolean eq(String a, String b) { return a != null && a.equalsIgnoreCase(b); }

    private static int port(Uri u) {
        if (u.getPort() != -1) return u.getPort();
        return "https".equalsIgnoreCase(u.getScheme()) ? 443 : 80;
    }

    private class ShellClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (isServerOrigin(uri)) return false;                       // stay inside the app
            if ("file".equals(uri.getScheme())) return !uri.toString().startsWith(SETUP_URL);
            // Everything else (external links) opens in the system browser, never inside the shell.
            try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) { }
            return true;
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame()) {
                view.loadUrl(SETUP_URL + "?error=1");
            }
        }
    }

    /** Called from setup.html only (the bridge ignores calls from any other page). */
    private class Bridge {
        @JavascriptInterface
        public String currentServer() {
            String s = savedServer();
            return s == null ? "" : s;
        }

        @JavascriptInterface
        public boolean saveServer(final String url) {
            Uri u = Uri.parse(url == null ? "" : url.trim());
            String scheme = u.getScheme();
            if (u.getHost() == null || !("http".equals(scheme) || "https".equals(scheme))) return false;
            final String clean = scheme + "://" + u.getHost() + (u.getPort() != -1 ? ":" + u.getPort() : "") + "/";
            runOnUiThread(() -> {
                if (!SETUP_URL.equals(stripQuery(web.getUrl()))) return;
                SharedPreferences.Editor e = getSharedPreferences(PREFS, MODE_PRIVATE).edit();
                e.putString(KEY_SERVER, clean).apply();
                web.clearHistory();
                web.loadUrl(clean);
            });
            return true;
        }
    }

    private static String stripQuery(String url) {
        if (url == null) return "";
        int q = url.indexOf('?');
        return q < 0 ? url : url.substring(0, q);
    }
}
