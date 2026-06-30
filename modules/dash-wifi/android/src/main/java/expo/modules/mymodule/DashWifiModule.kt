package expo.modules.mymodule

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.wifi.WifiInfo
import android.net.wifi.WifiManager
import android.net.wifi.WifiNetworkSpecifier
import android.os.Build
import android.os.PatternMatcher
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class DashWifiModule : Module() {
  // Hold a strong reference so Android doesn't GC the callback before onAvailable fires
  private var networkCallback: ConnectivityManager.NetworkCallback? = null
  // Store the bound network so we can unbind on disconnect
  private var boundNetwork: Network? = null

  override fun definition() = ModuleDefinition {
    Name("DashWifi")

    /**
     * Scan for WiFi networks matching the given prefix (e.g. "RE_").
     * Returns a list of matching SSIDs found in the most recent scan results.
     * On Android 10+ location permission is required to read scan results.
     */
    AsyncFunction("scanNetworks") { prefix: String, promise: Promise ->
      val context = appContext.reactContext ?: run {
        promise.reject("NO_CONTEXT", "No react context", null)
        return@AsyncFunction
      }

      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
        promise.reject("UNSUPPORTED", "WifiManager scan requires Android 10+", null)
        return@AsyncFunction
      }

      try {
        val wifiManager = context.applicationContext
          .getSystemService(Context.WIFI_SERVICE) as WifiManager

        // Trigger a fresh scan (best-effort; result arrives asynchronously but
        // we return existing results immediately as they are usually fresh enough)
        @Suppress("DEPRECATION")
        wifiManager.startScan()

        @Suppress("DEPRECATION")
        val results = wifiManager.scanResults ?: emptyList()
        val matching = results
          .mapNotNull { it.SSID?.trim('"') }
          .filter { it.startsWith(prefix, ignoreCase = true) }
          .distinct()

        promise.resolve(matching)
      } catch (e: Exception) {
        // Fall back: return empty list rather than crashing
        promise.resolve(emptyList<String>())
      }
    }

    /**
     * Connect to an exact SSID (e.g. a specific "RE_G450_XXXXXX" network).
     * Uses WifiNetworkSpecifier (Android 10+) which shows the system dialog.
     * CRITICAL FIX: calls cm.bindProcessToNetwork() so all traffic (fetch,
     * TCP sockets) routes through the dash WiFi instead of cellular.
     */
    AsyncFunction("connectToSsid") { ssid: String, promise: Promise ->
      val context = appContext.reactContext ?: run {
        promise.reject("NO_CONTEXT", "No react context", null)
        return@AsyncFunction
      }
      val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
        promise.reject("UNSUPPORTED", "WifiNetworkSpecifier requires Android 10+", null)
        return@AsyncFunction
      }

      // Clean up any existing callback
      releaseNetworkCallback(cm)

      val specifier = WifiNetworkSpecifier.Builder()
        .setSsid(ssid)
        .build()

      val request = NetworkRequest.Builder()
        .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
        .removeCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        .setNetworkSpecifier(specifier)
        .build()

      networkCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
          // KEY FIX: bind all process traffic to this network so HTTP/TCP
          // goes through the dash WiFi, not through mobile data
          cm.bindProcessToNetwork(network)
          boundNetwork = network

          val caps = cm.getNetworkCapabilities(network)
          val info = caps?.transportInfo as? WifiInfo
          val resolvedSsid = info?.ssid?.trim('"') ?: ssid

          promise.resolve(resolvedSsid)
        }

        override fun onUnavailable() {
          promise.reject("UNAVAILABLE", "User cancelled or network not found", null)
          networkCallback = null
        }

        override fun onLost(network: Network) {
          // Network was lost after connect — don't reject promise (already resolved)
          // just unbind
          if (boundNetwork == network) {
            cm.bindProcessToNetwork(null)
            boundNetwork = null
          }
        }
      }

      cm.requestNetwork(request, networkCallback!!, 30_000)
    }

    /**
     * Legacy: Connect to any network matching a prefix (e.g. "RE_").
     * Kept for backward compatibility. Also applies the bindProcessToNetwork fix.
     */
    AsyncFunction("connectToPrefix") { prefix: String, promise: Promise ->
      val context = appContext.reactContext ?: run {
        promise.reject("NO_CONTEXT", "No react context", null)
        return@AsyncFunction
      }
      val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
        promise.reject("UNSUPPORTED", "WifiNetworkSpecifier requires Android 10+", null)
        return@AsyncFunction
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
          // KEY FIX: bind process to the dash network
          cm.bindProcessToNetwork(network)
          boundNetwork = network

          val caps = cm.getNetworkCapabilities(network)
          val info = caps?.transportInfo as? WifiInfo
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

    /**
     * Disconnect: unregister the network callback and restore default routing.
     */
    AsyncFunction("disconnect") {
      val context = appContext.reactContext ?: throw Exception("No react context")
      val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

      // Restore normal (cellular/default) routing
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
