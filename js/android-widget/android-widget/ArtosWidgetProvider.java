package com.artos.finance;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.RemoteViews;

public class ArtosWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        SharedPreferences pref = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        
        String tunai = pref.getString("artos_saldo_tunai", "0");
        String gopay = pref.getString("artos_saldo_gopay", "0");
        String mandiri = pref.getString("artos_saldo_mandiri", "0");
        String limit = pref.getString("artos_sisa_limit", "50.000");

        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_artos);

            views.setTextViewText(R.id.tvWidgetTunai, "Tunai:\nRp " + tunai);
            views.setTextViewText(R.id.tvWidgetGopay, "GoPay:\nRp " + gopay);
            views.setTextViewText(R.id.tvWidgetMandiri, "Mandiri:\nRp " + mandiri);
            views.setTextViewText(R.id.tvWidgetSisaLimit, "Sisa Limit: Rp " + limit);

            // Intent membuka aplikasi langsung ke halaman utama catat
            Intent intent = new Intent(context, MainActivity.class);
            intent.setAction(Intent.ACTION_VIEW);
            intent.setData(Uri.parse("artos://catat"));
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            PendingIntent pendingIntent = PendingIntent.getActivity(
                context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.btnWidgetInputCepat, pendingIntent);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}
