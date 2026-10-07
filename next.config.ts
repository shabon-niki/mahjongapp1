import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // 牌画像は内容を変えるときはファイル名ごと変える運用のため、長期キャッシュして再取得を避ける
        source: "/tiles/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
