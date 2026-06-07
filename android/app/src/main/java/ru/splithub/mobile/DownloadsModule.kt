package ru.splithub.mobile

import android.content.ContentValues
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

/**
 * Saves a locally generated file straight into the public "Downloads" folder
 * (via MediaStore on Android 10+, or the legacy public dir below that) without
 * any folder picker — the way a normal Android download behaves.
 */
class DownloadsModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "SplitHubDownloads"

  @ReactMethod
  fun saveToDownloads(srcPath: String, fileName: String, mimeType: String, promise: Promise) {
    try {
      val source = File(srcPath.removePrefix("file://"))
      if (!source.exists()) {
        promise.reject("E_NO_FILE", "Файл для сохранения не найден")
        return
      }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        val resolver = reactApplicationContext.contentResolver
        val values = ContentValues().apply {
          put(MediaStore.Downloads.DISPLAY_NAME, fileName)
          put(MediaStore.Downloads.MIME_TYPE, mimeType)
          put(MediaStore.Downloads.IS_PENDING, 1)
        }
        val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
          ?: throw IllegalStateException("Не удалось создать запись в «Загрузках»")
        (resolver.openOutputStream(uri)
          ?: throw IllegalStateException("Не удалось открыть «Загрузки» для записи")).use { out ->
          source.inputStream().use { it.copyTo(out) }
        }
        values.clear()
        values.put(MediaStore.Downloads.IS_PENDING, 0)
        resolver.update(uri, values, null, null)
        promise.resolve(uri.toString())
      } else {
        val dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
        if (!dir.exists()) dir.mkdirs()
        val dest = File(dir, fileName)
        source.copyTo(dest, overwrite = true)
        promise.resolve(Uri.fromFile(dest).toString())
      }
    } catch (e: Exception) {
      promise.reject("E_SAVE_DOWNLOAD", e.message, e)
    }
  }
}
