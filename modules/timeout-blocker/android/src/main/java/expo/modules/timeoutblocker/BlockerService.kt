package expo.modules.timeoutblocker

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.content.Intent
import android.view.accessibility.AccessibilityEvent

class BlockerService : AccessibilityService() {
  override fun onAccessibilityEvent(event: AccessibilityEvent) {
    if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
    val pkg = event.packageName?.toString() ?: return
    val prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    if (pkg == packageName || !prefs.getBoolean(KEY_ACTIVE, false)) return
    if (pkg !in prefs.getStringSet(KEY_APPS, emptySet())!!) return
    performGlobalAction(GLOBAL_ACTION_HOME)
    packageManager.getLaunchIntentForPackage(packageName)?.let {
      startActivity(it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT))
    }
  }

  override fun onInterrupt() {}

  companion object {
    const val PREFS = "timeout_blocker"
    const val KEY_ACTIVE = "active"
    const val KEY_APPS = "apps"
  }
}
