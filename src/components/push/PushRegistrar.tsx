"use client";

import { useEffect } from "react";
import { registerPushToken } from "@/app/push/actions";

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

/**
 * Capacitorネイティブアプリ内で実行されている場合のみ、プッシュ通知の許可を
 * リクエストして端末トークンをサーバーへ登録する。通常のブラウザ(Web版)では
 * window.Capacitorが存在しないため何もしない。
 */
export function PushRegistrar() {
  useEffect(() => {
    let cancelled = false;

    async function setup() {
      const capacitor = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
      if (!capacitor?.isNativePlatform?.()) return;

      const { PushNotifications } = await import("@capacitor/push-notifications");

      const current = await PushNotifications.checkPermissions();
      let granted = current.receive === "granted";
      if (!granted && current.receive !== "denied") {
        const requested = await PushNotifications.requestPermissions();
        granted = requested.receive === "granted";
      }
      if (!granted || cancelled) return;

      await PushNotifications.register();

      PushNotifications.addListener("registration", (token) => {
        const platform = capacitor.getPlatform?.() === "android" ? "android" : "ios";
        void registerPushToken(token.value, platform);
      });
      PushNotifications.addListener("registrationError", (err) => {
        console.error("プッシュ通知の登録に失敗しました", err);
      });
    }

    void setup();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
