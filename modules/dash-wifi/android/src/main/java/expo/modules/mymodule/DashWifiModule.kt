package expo.modules.mymodule

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.wifi.WifiInfo
import android.net.wifi.WifiNetworkSpecifier
import android.os.Build
import android.os.PatternMatcher
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class DashWifiModule : Module() {
  private var networkCallback: ConnectivityManager.NetworkCallback? = null

  override fun definition() = ModuleDefinition {
    Name("DashWifi")

    AsyncFunction("connectToPrefix") { prefix: String, promise: Promise ->
      val context = appContext.reactContext ?: throw Exception("No react context")
      val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
         promise.reject("UNSUPPORTED", "WifiNetworkSpecifier requires Android 10+", null)
         return@AsyncFunction
      }

      val specifier = WifiNetworkSpecifier.Builder()
        .setSsidPattern(PatternMatcher(prefix, PatternMatcher.PATTERN_PREFIX))
        .build()

      val request = NetworkRequest.Builder()
        .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
        .removeCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        .setNetworkSpecifier(specifier)
        .build()

      networkCallback?.let {
          try { cm.unregisterNetworkCallback(it) } catch (e: Exception) {}
      }

      networkCallback = object : ConnectivityManager.NetworkCallback() {
          override fun onAvailable(network: Network) {
              val caps = cm.getNetworkCapabilities(network)
              val info = caps?.transportInfo as? WifiInfo
              val ssid = info?.ssid?.trim('"') ?: "RE_CONNECTED"
              
              promise.resolve(ssid)
          }

          override fun onUnavailable() {
              promise.reject("UNAVAILABLE", "User cancelled or dash not found", null)
              networkCallback = null
          }
      }

      cm.requestNetwork(request, networkCallback!!, 30_000)
    }

    AsyncFunction("disconnect") {
        val context = appContext.reactContext ?: return@AsyncFunction
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        
        networkCallback?.let {
            try { cm.unregisterNetworkCallback(it) } catch (e: Exception) {}
        }
        networkCallback = null
    }
  }
}
