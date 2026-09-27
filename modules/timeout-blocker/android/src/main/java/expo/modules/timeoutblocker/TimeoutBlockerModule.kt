package expo.modules.timeoutblocker

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class TimeoutBlockerModule : Module() {
  private val context get() = requireNotNull(appContext.reactContext)
  private val prefs get() = context.getSharedPreferences(BlockerService.PREFS, Context.MODE_PRIVATE)

  override fun definition() = ModuleDefinition {
    Name("TimeoutBlocker")

    Function("isServiceEnabled") {
      val me = ComponentName(context, BlockerService::class.java).flattenToString()
      Settings.Secure.getString(context.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES)
        ?.split(':')?.any { it.equals(me, ignoreCase = true) } == true
    }

    Function("openServiceSettings") {
      context.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    AsyncFunction("getLaunchableApps") {
      val pm = context.packageManager
      pm.queryIntentActivities(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER), 0)
        .map { mapOf("id" to it.activityInfo.packageName, "name" to it.loadLabel(pm).toString()) }
        .filter { it["id"] != context.packageName }
        .distinctBy { it["id"] }
        .sortedBy { it["name"]!!.lowercase() }
    }

    Function("setBlock") { apps: List<String>, active: Boolean ->
      prefs.edit().putStringSet(BlockerService.KEY_APPS, apps.toSet()).putBoolean(BlockerService.KEY_ACTIVE, active).apply()
    }
  }
}
