/**
 * Apple Push Notification service (APNs) 送信ユーティリティ。
 *
 * Apple Developer Program登録・APNs認証キー(.p8)発行が完了するまでは
 * 環境変数(APNS_*)が無いため送信をスキップする(基盤のみ用意)。
 * 依存追加を避けるため、JWT署名・HTTP/2通信ともNode.js標準モジュール
 * (node:crypto, node:http2)のみで実装している。
 *
 * Androidはプッシュトークンの保存までは共通対応済みだが、実送信(FCM等)は
 * 別途対応が必要(今回のスコープ外)。
 */
import { createSign } from "node:crypto";
import http2 from "node:http2";
import { prisma } from "@/lib/prisma";

type ApnsConfig = {
  keyId: string;
  teamId: string;
  bundleId: string;
  privateKey: string;
  production: boolean;
};

function loadApnsConfig(): ApnsConfig | null {
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const bundleId = process.env.APNS_BUNDLE_ID;
  const privateKey = process.env.APNS_PRIVATE_KEY;
  if (!keyId || !teamId || !bundleId || !privateKey) return null;
  return {
    keyId,
    teamId,
    bundleId,
    // .envには改行が"\n"のリテラル文字列として入るため復元する
    privateKey: privateKey.replace(/\\n/g, "\n"),
    production: process.env.APNS_ENV === "production",
  };
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** APNs用のES256署名付きJWTを生成する(有効期限はAPNs側で1時間とみなされる) */
function buildApnsJwt(config: ApnsConfig): string {
  const header = base64url(JSON.stringify({ alg: "ES256", kid: config.keyId }));
  const payload = base64url(
    JSON.stringify({ iss: config.teamId, iat: Math.floor(Date.now() / 1000) })
  );
  const unsigned = `${header}.${payload}`;
  const signature = createSign("SHA256")
    .update(unsigned)
    .sign({ key: config.privateKey, dsaEncoding: "ieee-p1363" });
  return `${unsigned}.${base64url(signature)}`;
}

export type PushPayload = { title: string; body: string; url?: string };

/** iOSのAPNsへ1トークン分の通知を送信する */
function sendToApns(config: ApnsConfig, token: string, payload: PushPayload): Promise<void> {
  return new Promise((resolve, reject) => {
    const origin = config.production
      ? "https://api.push.apple.com"
      : "https://api.sandbox.push.apple.com";
    const client = http2.connect(origin);
    client.on("error", reject);

    const body = JSON.stringify({
      aps: { alert: { title: payload.title, body: payload.body }, sound: "default" },
      url: payload.url,
    });

    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${token}`,
      authorization: `bearer ${buildApnsJwt(config)}`,
      "apns-topic": config.bundleId,
      "content-type": "application/json",
    });

    let status = 0;
    let responseBody = "";
    req.on("response", (headers) => {
      status = Number(headers[":status"] ?? 0);
    });
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => (responseBody += chunk));
    req.on("end", () => {
      client.close();
      if (status >= 200 && status < 300) resolve();
      else reject(new Error(`APNs error (${status}): ${responseBody}`));
    });
    req.on("error", reject);
    req.end(body);
  });
}

/**
 * 指定したユーザーたちの登録済み端末へプッシュ通知を送る。
 * APNs認証キーが未設定の間は何もせずログだけ出す。
 */
export async function sendPushNotification(userIds: string[], payload: PushPayload) {
  if (userIds.length === 0) return;

  const tokens = await prisma.pushToken.findMany({ where: { userId: { in: userIds } } });
  if (tokens.length === 0) return;

  const config = loadApnsConfig();
  if (!config) {
    console.warn(
      `[push] APNs未設定のため送信をスキップしました(対象${tokens.length}件): ${payload.title}`
    );
    return;
  }

  const iosTokens = tokens.filter((t) => t.platform === "ios");
  await Promise.allSettled(
    iosTokens.map(async (t) => {
      try {
        await sendToApns(config, t.token, payload);
      } catch (e) {
        console.error(`[push] 送信失敗 token=${t.token}`, e);
        if (e instanceof Error && e.message.includes("BadDeviceToken")) {
          await prisma.pushToken.delete({ where: { id: t.id } }).catch(() => {});
        }
      }
    })
  );
}
