package app.curator

import android.content.Context
import android.graphics.Color
import android.graphics.drawable.GradientDrawable

/** Shared map-first colors and density-independent sizes for all native screens. */
object Design {
    val background = Color.parseColor("#10151F")
    val surface = Color.parseColor("#171E2A")
    val raised = Color.parseColor("#222C3C")
    val border = Color.parseColor("#303C50")
    val text = Color.parseColor("#F5F7FC")
    val muted = Color.parseColor("#A5AFC1")
    val blue = Color.parseColor("#3988FF")
    val amber = Color.parseColor("#FFC466")
    val amberInk = Color.parseColor("#342307")
    fun dp(context: Context, value: Int) = (value * context.resources.displayMetrics.density + .5f).toInt()
    fun shape(context: Context, color: Int, radius: Int = 16, outlined: Boolean = false) = GradientDrawable().apply {
        setColor(color)
        cornerRadius = dp(context, radius).toFloat()
        if (outlined) setStroke(dp(context, 1), border)
    }
}
