## 目的

<!-- 解決する課題と利用者価値を簡潔に記載してください。 -->

## 変更内容

-

## 画面・操作確認

<!-- UI変更はbefore/afterの画像または動画、確認したviewportと主要操作を記載。該当なしなら理由を記載。 -->

## テスト

| コマンド / 確認        | 結果 |
| ---------------------- | ---- |
| `npm run lint`         |      |
| `npm run typecheck`    |      |
| `npm run test`         |      |
| `npm run build`        |      |
| `npm run test:e2e`     |      |
| `npm run agents:check` |      |

## セキュリティ・データ影響

- [ ] テナント境界・RLS・サーバー認可を確認した
- [ ] 実データ、秘密情報、署名URL、個人情報を含まない
- [ ] AI送信データと根拠IDを確認した、またはAI変更なし
- [ ] JPX正式提携、TERRAST実API、法的適合性を未確認のまま示していない

## DB migration / 環境変数

<!-- migration名、適用順、backfill、環境変数の追加・削除。該当なしと未実施を区別。 -->

## リスクとロールバック

<!-- 既知のリスク、監視方法、復旧・feature flag・逆migration方針。 -->

## レビュー

- [ ] CodeRabbitの指摘を確認・対応した（非対応は理由を記載）
- [ ] Claude Codeによる独立レビューを依頼した
- [ ] `AI_HANDOFF.md` を実測結果で更新した
