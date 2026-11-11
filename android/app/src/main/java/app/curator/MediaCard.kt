package app.curator

import android.media.browse.MediaBrowser
import android.os.Bundle
import android.service.media.MediaBrowserService

// Car media widgets list apps that offer a browser service; it only hands over the session, there is nothing to browse.
class MediaCard : MediaBrowserService() {
    override fun onCreate() {
        super.onCreate()
        Now.mediaToken?.let { sessionToken = it }
    }

    override fun onGetRoot(clientPackageName: String, clientUid: Int, rootHints: Bundle?) = BrowserRoot("root", null)

    override fun onLoadChildren(parentId: String, result: Result<MutableList<MediaBrowser.MediaItem>>) =
        result.sendResult(mutableListOf())
}
