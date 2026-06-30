package expo.modules.mymodule

import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.wifi.WifiInfo
import android.net.wifi.WifiManager
import android.net.wifi.WifiNetworkSpecifier
import android.os.Build
import android.os.PatternMatcher
import android.provider.Settings
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class DashWifiModule : Module() {
  private var networkCallback: ConnectivityManager.NetworkCallback? = null
  private var boundNetwork: Network? = null

  override fun definition() = ModuleDefinition {
    Name("DashWifi")

    // ─── Scan networks ───────────────────────────────────────────────────────
    AsyncFunction("scanNetworks") { prefix: String, promise: Promise ->
      val context = appContext.reactContext ?: run {
        promise.reject("NO_CONTEXT", "No react context", null); return@AsyncFunction
      }
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
        promise.reject("UNSUPPORTED", "Requires Android 10+", null); return@AsyncFunction
      }
      try {
        val wm = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        @Suppress("DEPRECATION") wm.startScan()
        @Suppress("DEPRECATION")
        val results = wm.scanResults ?: emptyList()
        val matching = results
          .mapNotNull { it.SSID?.trim('"') }
          .filter { it.startsWith(prefix, ignoreCase = true) }
          .distinct()
        promise.resolve(matching)
      } catch (e: Exception) {
        promise.resolve(emptyList<String>())
      }
    }

    // ─── Get currently connected SSID ────────────────────────────────────────
    AsyncFunction("getCurrentSsid") { promise: Promise ->
      val context = appContext.reactContext ?: run {
        promise.resolve(null); return@AsyncFunction
      }
      try {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        var resolvedSsid: String? = null

        // 1. Scan all networks to find TRANSPORT_WIFI network specifically
        for (network in cm.allNetworks) {
          val caps = cm.getNetworkCapabilities(network)
          if (caps?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true) {
            val info = caps.transportInfo as? WifiInfo
            val s = info?.ssid?.trim('"')
            if (s != null && s != "<unknown ssid>" && s.isNotBlank()) {
              resolvedSsid = s
              break
            }
          }
        }

        // 2. Fallback to activeNetwork
        if (resolvedSsid == null) {
          val network = cm.activeNetwork
          val caps = cm.getNetworkCapabilities(network)
          val info = caps?.transportInfo as? WifiInfo
          val s = info?.ssid?.trim('"')
          if (s != null && s != "<unknown ssid>" && s.isNotBlank()) {
            resolvedSsid = s
          }
        }

        // 3. Fallback to WifiManager
        if (resolvedSsid == null) {
          val wm = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
          @Suppress("DEPRECATION")
          val info = wm.connectionInfo
          @Suppress("DEPRECATION")
          val s = info?.ssid?.trim('"')
          if (s != null && s != "<unknown ssid>" && s.isNotBlank()) {
            resolvedSsid = s
          }
        }

        if (resolvedSsid == null || resolvedSsid == "<unknown ssid>" || resolvedSsid.isBlank()) {
          promise.resolve(null)
        } else {
          promise.resolve(resolvedSsid)
        }
      } catch (e: Exception) {
        promise.resolve(null)
      }
    }

    // ─── Bind process to active WiFi network (needed for manual connection) ─
    AsyncFunction("bindToActiveWifi") { promise: Promise ->
      val context = appContext.reactContext ?: run {
        promise.resolve(false); return@AsyncFunction
      }
      try {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        var bound = false
        for (network in cm.allNetworks) {
          val caps = cm.getNetworkCapabilities(network)
          if (caps?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true) {
            cm.bindProcessToNetwork(network)
            boundNetwork = network
            bound = true
            break
          }
        }
        promise.resolve(bound)
      } catch (e: Exception) {
        promise.resolve(false)
      }
    }

    // ─── Open Android WiFi Settings ──────────────────────────────────────────
    AsyncFunction("openWifiSettings") { promise: Promise ->
      val context = appContext.reactContext ?: run {
        promise.resolve(false); return@AsyncFunction
      }
      try {
        val intent = Intent(Settings.ACTION_WIFI_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        promise.resolve(true)
      } catch (e: Exception) {
        promise.resolve(false)
      }
    }

    // ─── Connect to exact SSID via system dialog ─────────────────────────────
    AsyncFunction("connectToSsid") { ssid: String, promise: Promise ->
      val context = appContext.reactContext ?: run {
        promise.reject("NO_CONTEXT", "No react context", null); return@AsyncFunction
      }
      val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
        promise.reject("UNSUPPORTED", "Requires Android 10+", null); return@AsyncFunction
      }

      releaseNetworkCallback(cm)

      val specifier = WifiNetworkSpecifier.Builder().setSsid(ssid).build()
      val request = NetworkRequest.Builder()
        .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
        .removeCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        .setNetworkSpecifier(specifier)
        .build()

      networkCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
          cm.bindProcessToNetwork(network)
          boundNetwork = network
          val caps = cm.getNetworkCapabilities(network)
          val info = caps?.transportInfo as? WifiInfo
          @Suppress("DEPRECATION")
          val resolvedSsid = info?.ssid?.trim('"') ?: ssid
          promise.resolve(resolvedSsid)
        }
        override fun onUnavailable() {
          promise.reject("UNAVAILABLE", "User cancelled or network not found", null)
          networkCallback = null
        }
        override fun onLost(network: Network) {
          if (boundNetwork == network) {
            cm.bindProcessToNetwork(null)
            boundNetwork = null
          }
        }
      }
      cm.requestNetwork(request, networkCallback!!, 30_000)
    }

    // ─── Legacy prefix-based connect ─────────────────────────────────────────
    AsyncFunction("connectToPrefix") { prefix: String, promise: Promise ->
      val context = appContext.reactContext ?: run {
        promise.reject("NO_CONTEXT", "No react context", null); return@AsyncFunction
      }
      val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
        promise.reject("UNSUPPORTED", "Requires Android 10+", null); return@AsyncFunction
      }

      releaseNetworkCallback(cm)

      val specifier = WifiNetworkSpecifier.Builder()
        .setSsidPattern(PatternMatcher(prefix, PatternMatcher.PATTERN_PREFIX))
        .build()
      val request = NetworkRequest.Builder()
        .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
        .removeCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        .setNetworkSpecifier(specifier)
        .build()

      networkCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
          cm.bindProcessToNetwork(network)
          boundNetwork = network
          val caps = cm.getNetworkCapabilities(network)
          val info = caps?.transportInfo as? WifiInfo
          @Suppress("DEPRECATION")
          val ssid = info?.ssid?.trim('"') ?: "RE_CONNECTED"
          promise.resolve(ssid)
        }
        override fun onUnavailable() {
          promise.reject("UNAVAILABLE", "User cancelled or dash not found", null)
          networkCallback = null
        }
        override fun onLost(network: Network) {
          if (boundNetwork == network) {
            cm.bindProcessToNetwork(null)
            boundNetwork = null
          }
        }
      }
      cm.requestNetwork(request, networkCallback!!, 30_000)
    }

    // ─── Disconnect ───────────────────────────────────────────────────────────
    AsyncFunction("disconnect") {
      val context = appContext.reactContext ?: throw Exception("No react context")
      val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
      cm.bindProcessToNetwork(null)
      boundNetwork = null
      releaseNetworkCallback(cm)
      true
    }
  }

  private fun releaseNetworkCallback(cm: ConnectivityManager) {
    networkCallback?.let {
      try { cm.unregisterNetworkCallback(it) } catch (_: Exception) {}
    }
    networkCallback = null
  }
}
