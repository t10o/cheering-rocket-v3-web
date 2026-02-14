# AGENTS.md — Cheering Web (Supporter) Repo Rules / Spec

## 0. このファイルの目的
このリポジトリでは、Cursor（AI）に「応援者 Web の仕様・設計方針・実装ルール」を一貫して伝えるために、この AGENTS.md を単一の正とする。
実装・提案・リファクタは、原則この方針に従う。

---

## 1. プロダクト概要（応援者 Web）
マラソン中のランナーを、応援者が「いまどこにいるか」を見ながら応援できる仕組みを提供する。

- 応援者: 共有URLから Webサイトにアクセスし、イベント参加メンバー全員の
  - 現在地 / ルート（履歴）
  - 写真
  を見て、応援メッセージを送れる

URL 形式（確定）:
- `<domain（未定）>/cheer/<eventId>`

---

## 2. 重要方針（最優先）
### 2.1 迷わないUI/UX
- マニュアル無しで使える導線と文言
- 「今の状態（閲覧中/更新中/接続不安定）」が分かる
- エラー時の復帰方法が分かる（再読み込み、URL確認など）

### 2.2 “応援”の空気感（デザイン方針）
- 応援らしい溌剌さを出す
- 情報の優先順位: 現在地 / 最新更新時刻 / メンバー一覧 / メッセージ送信
- アクセシビリティを犠牲にしない（コントラスト、タップ領域、読みやすさ）

### 2.3 バックエンドは Firebase を最大活用
- Firestore / Cloud Functions / Cloud Storage を中心に構成
- 応援メッセージ送信は、必要に応じて Functions 経由で行う（セキュリティ都合）

---

## 3. 既知の要件（Web 視点）
### 3.1 表示（イベント単位）
- `/cheer/<eventId>` にアクセスすると、イベント情報と参加メンバーが見える
- 同一イベントに参加しているメンバー全員の情報を閲覧できる
  - 現在地（最新ポイント）
  - ルート（履歴）
  - 写真（撮影地点が分かると望ましい）

### 3.2 応援メッセージ送信
- 応援Web からメッセージを送信できる
- 送信された応援メッセージは、同一イベントで走っている全員に届く（Runner 側でプッシュ通知）
- Web 側でも「送ったメッセージがイベントに保存された」ことが分かる状態を表示する

### 3.3 リアルタイム更新
- 位置情報・メッセージ・写真は原則リアルタイムで更新される
  - Firestore のリアルタイム購読（onSnapshot）を基本にする
  - ネットワークが不安定でも破綻しない（最新に追いつける、再接続できる）

### 3.4 公開範囲（未確定：重要）
- 応援Webを「ログイン無し」で見られる形にする
- セキュリティ/Rules 設計のため、以下のいずれかを採用する（実装時に決定）
  - eventId とは別の shareToken を発行し、shareToken を知っている人だけ閲覧可
  - 応援Webは Functions 経由で読み書き（shareToken検証）し、Firestore直アクセスを抑える

---

## 4. 技術選定（採用方針）
### 4.1 レンダリング方針（SPA / SSR）
- 初期は SPA を基本とする（リアルタイム更新主体、運用が軽い）
- ただし、共有URLを貼った時の「リンクプレビュー（OG）」をイベント別に出したくなったら、
  SSR（Next.js等）または “OG用の動的HTML生成” を導入する（後で選べるようにする）

### 4.2 推奨スタック（初期）
- React + TypeScript
- ルーティング（SPA）
- Firebase SDK（Firestore / Storage）
- UI: React Aria を使用し、アクセシビリティの高いものとすること
- スタイリングには Tailwind を使用する
- 地図: ルート/現在地を扱えるライブラリ（実装時に決定）

---

## 5. アーキテクチャ方針（Web）
### 5.1 責務分離（最低限）
- UI（画面）とデータアクセス（Firestore/Functions）を分離する
- Firestore の購読ロジックは hooks / service に閉じ込め、画面は state を描画するだけにする

### 5.2 推奨ディレクトリ例（変更OK）
- src/
  - app/            # ルーティング・エントリ
  - features/
    - cheer/        # 応援ページ（イベント単位）
  - components/     # 共通UI
  - services/
    - firebase/     # firebase init, auth(optional), firestore, storage
    - api/          # functions 呼び出しなど
  - hooks/
  - styles/ or theme/

---

## 6. データアクセス方針（Firestore / Functions）
### 6.1 リアルタイム購読を基本にする
- locations / messages / photos は購読で更新
- “最新だけ必要” なもの（メンバーの latestLocation 等）があるなら、取得コストが破綻しない形に寄せる

### 6.2 書き込みは慎重に
- 応援メッセージは「スパム/荒らし対策」「権限制御」の観点で Functions 経由を検討する
- クライアント直書きする場合でも、Rules で権限制御できる前提を崩さない

---

## 7. パフォーマンス方針
- 初回表示で必要な情報を絞る（まず “イベント概要 + メンバー + 現在地”）
- ルート（履歴）や写真は段階的にロードしても良い
- Firestore 購読は必要な範囲だけに絞る（過剰な購読・全件読みを避ける）
- キャッシュ等を積極的に活用し、Firebase の過金額を最小限に抑えつつ、応援の体験を損なわないようにする

---

## 8. エラーハンドリング/状態表示
- ローディング中、空状態、権限なし、イベントが存在しない、ネット不安定を UI で明確に区別
- “復帰手段” を必ず提示（再試行/再読み込み/URL確認）

---

## 9. テスト/品質（最低限）
- 型安全を優先し、曖昧な型を放置しない
- 重要なロジック（購読hook、整形、フィルタ）は unit test 対象
- 主要導線（/cheer/:eventId の表示、メッセージ送信）は E2E を検討（余力があれば）

---

## 10. デプロイ方針（Firebase）
- 静的ホスティング（SPA）を基本にする
- ルーティングは Hosting の rewrites で SPA に対応する（/cheer/* を index へ）

---

## 11. Definition of Done（Web）
- 共有URL（/cheer/<eventId>）で迷わず応援画面に到達できる
- イベント参加メンバー全員の現在地が見える（更新が追従する）
- ルート（履歴）が見える（最低限はポリラインで可）
- 写真が見える（撮影地点と紐づく）
- 応援メッセージが送れる（送信成功が分かる）
- ネット不安定時でも状態が分かり、復帰できる

---

## 12. 参照（一次ソース）
- Cursor Rules / AGENTS.md:
  - https://cursor.com/docs/context/rules
  - https://docs.cursor.com/ja/context/rules
- Firebase Hosting（rewrites等の設定）:
  - https://firebase.google.com/docs/hosting/full-config
- Firestore realtime listen（onSnapshot）:
  - https://firebase.google.com/docs/firestore/query-data/listen
  - https://docs.cloud.google.com/firestore/native/docs/query-data/listen?hl=ja
- Next.js（将来SSR/OGが必要になった場合）:
  - https://nextjs.org/docs/app/api-reference/functions/generate-metadata
  - https://nextjs.org/docs/app/getting-started/metadata-and-og-images

## 13. アプリ側の要件、使用等
## 1. プロダクト概要
マラソン中のランナーを、応援者が「いまどこにいるか」を見ながら応援できる仕組みを提供する。

- ランナー: Android アプリで計測開始 → 走行中ずっと位置情報を送信
- 応援者: 共有URLからランナーの位置・ルート・写真を見て、応援メッセージを送れる

---

## 2. 重要方針（最優先）
### 2.1 最優先は「安定稼働」
- 走行中に位置情報が止まらないことを最優先（UI演出よりも稼働継続）
- OS要件に沿って、バックグラウンド継続を“正攻法”で実装する

### 2.2 対象プラットフォーム
- Android のみ（iOS は対象外）

### 2.3 バックエンドは Firebase を最大活用
- Firestore / Cloud Functions / Cloud Storage / FCM を中心に構成
- サーバは原則持たない（Functions で補う）

---

## 3. 既知の要件

### 3.1 認証・アカウント（必須）
- 認証は **Firebase Authentication** を使用する
- サインイン方式は **Google 認証のみ**（他方式は当面やらない）
- アカウント作成時（初回サインイン直後）にプロフィール初期設定を行える
  - ユーザー名（表示名）
  - ユーザーアイコン（画像）
- 後からプロフィール編集ができる
  - ユーザー名変更
  - ユーザーアイコン変更

### 3.2 フレンド機能（必須）
- ユーザー同士はフレンド関係を結べる
- フレンド追加は **「アカウントID（共有用のID）」** を使う
  - 共有用IDは、プロフィール確認/編集画面で表示し、タップでコピーできる
- フレンドになる手順は以下の通り（片方向では成立しない）
  1) 共有IDでユーザー検索
  2) フレンド申請
  3) 相手が承認 → フレンド成立
- フレンド管理
  - フレンド一覧表示
  - フレンド削除（承認ステップ不要）
    - どちらかが削除した時点でフレンド関係は消滅する

### 3.3 イベント機能（必須）
- 「ラン」は **イベント** というまとまりで管理する
- イベントは以下を持つ
  - タイトル
  - 概要
  - ラン開始日時
- イベント作成者のみが編集・削除できる（編集権限は作成者に限定）
- イベントに対してフレンドを招待できる
  - 作成/編集画面でフレンド一覧から複数人を選択して招待する（UIはセレクト/マルチセレクト想定）
- 招待された側は「承認」することでイベントメンバーになる
- メンバーはイベント一覧から、そのイベントを **脱退** できる（作成者の扱いは後で仕様確定）
- イベントごとに **応援用 URL** を発行する
  - 形式：`<ドメイン（未定）>/cheer/<イベントID>`
- イベントごとに、以下を管理する
  - 複数ランナーの位置情報（同一イベント内で複数人が共有する）
  - 応援メッセージ（イベント単位で送信し、同一イベントで走っている全員に届く）
  - 写真（ランナーがアップロードし、座標を紐づける）

### 3.4 ラン機能（必須）
- ランの開始・終了ができる
- 誤終了防止：終了時はテキストボックスに「終了」と入力し、完全一致した場合のみ終了できる
- ラン開始で位置情報収集を開始し、走行中は継続的に記録する
  - 位置情報は概ね **1分間隔** を基準（調整可能だが安定優先）
  - バックグラウンドでも収集できる（アプリが kill されない限り継続）
- 位置情報は **可能な限り正確に** 記録し、以下を計測できるようにする（Nike+ のような体験）
  - 走行距離
  - スピード（またはペース）
- ラン中画面
  - 応援メッセージのリスト表示
    - 送信者名 + メッセージ本文が分かること
  - 写真撮影/アップロード機能（撮影地点の座標を紐づける）

### 3.5 応援者 Web（イベントと Web の関係）
- 応援者は **共有URL** から応援 Web サイトにアクセスする
- 応援 Web でできること（イベント単位）
  - イベント参加メンバー全員の「現在地」および「ルート（履歴）」の閲覧
  - 写真の閲覧（撮影地点が分かる形が望ましい）
  - 応援メッセージの送信
- 応援メッセージの配信
  - 応援 Web から送られたメッセージは、同一イベントで走っている全員に対してプッシュ通知で送信される（Android のみ）

### 3.6 UX（全体方針）
- ユーザーがマニュアル無しでも迷わない導線・文言・状態表示を提供する
  - 「次に何をすべきか」が常に分かる
  - エラー時は復帰方法が分かる

---

## 4. 技術選定（採用方針）
「モダン」かつ「運用・安定」を優先し、Android 公式推奨の土台をベースにする。  
（根拠: Android 公式の layered architecture / UDF / ViewModel 等の推奨）  
- App Architecture: https://developer.android.com/topic/architecture

### 4.1 Android（Runner App）
- 言語: Kotlin
- UI: Jetpack Compose + Material 3（Compose Material3）
  - Material 3: https://developer.android.com/develop/ui/compose/designsystems/material3
  - Material Design 3: https://m3.material.io/
- アーキテクチャ: MVVM + Clean Architecture（UI / (Domain) / Data）
  - 依存方向: UI → ViewModel → (UseCase) → Repository → DataSource（片方向）
  - SSOT / UDF を守る（UI は状態を描画するだけ）
- DI: Hilt
  - https://developer.android.com/training/dependency-injection/hilt-android
- 非同期: Kotlin Coroutines + Flow
- ナビゲーション: Navigation Compose
  - https://developer.android.com/develop/ui/compose/navigation
- 位置情報: Fused Location Provider
  - 定期更新: https://developer.android.com/develop/sensors-and-location/location/request-updates
- バックグラウンド継続: Foreground Service（type=location）
  - FGS type: https://developer.android.com/develop/background-work/services/fgs/service-types
- 確実な送信/リトライ: WorkManager（アップロード/再送の責務）
  - https://developer.android.com/develop/background-work
- ローカル永続化（採用方針）:
  - “送信待ちキュー” と “直近ログ” を端末に保持する
  - 方式は以下のどちらか（実装コスト優先で決定）
    - A) Room（構造化して扱いやすい）
    - B) DataStore（小規模なら軽い）: https://developer.android.com/jetpack/androidx/releases/datastore

### 4.2 Firebase（Backend）
- Database: Cloud Firestore（主データ）
  - オフライン永続（Android はデフォルト有効）: https://firebase.google.com/docs/firestore/manage-data/enable-offline
- Functions: Cloud Functions for Firebase（通知・集計・権限制御の補助）
  - Firestore triggers: https://firebase.google.com/docs/functions/firestore-events
- Storage: Cloud Storage for Firebase（写真）
  - Android upload: https://firebase.google.com/docs/storage/android/upload-files
- Push: Firebase Cloud Messaging（Android 通知）
  - https://firebase.google.com/docs/cloud-messaging

### 4.3 応援者UI（Web）※未確定
- 既存資産が React 前提なら React でよい
- ただしこのリポジトリが Android 単体なら、Web は別リポジトリで管理する

---

## 5. アーキテクチャ詳細（実装ルール）
このプロジェクトは、以下の “MVVM + Clean” で統一する。
（参考: Qiita 記事「MVVM + クリーンアーキテクチャ」※2次情報）
- https://qiita.com/void_takazu/items/d75aaf97eadf444bff77

### 5.1 レイヤー責務
- ui/
  - Screen / Component / navigation / theme
  - Compose は “状態（UiState）” を描画するだけ
- viewmodel/
  - UIイベントを受け、UseCase/Repository を呼び、UiState を更新
- domain/（必要な場合のみ）
  - UseCase（複数画面で再利用されるロジック、または複雑なロジックを隔離）
  - Android公式でも domain layer は optional とされるため、過剰に作らない
- data/
  - repository（データの唯一の窓口）
  - datasource（Firestore / local queue / etc）
  - model（DTO/Entity）
- service/
  - Foreground Location Service（位置情報継続の中核）
- worker/
  - WorkManager（送信・再送・同期）

### 5.2 依存関係（禁止事項）
- ui が data に直接触らない
- datasource を viewmodel から直接呼ばない
- repository の実装詳細（Firestore SDKなど）を domain/ui に漏らさない

### 5.3 SSOT（Single Source of Truth）
- “位置ログの正” は Repository が管理
- UI は Repository（または ViewModel が保持する UiState）を購読して描画する
- Firestore のオフライン永続は活用するが、送信待ちキューはアプリ側でも持つ（安定優先）

---

## 6. データ設計（Firestore案）
※これは初期案。実装に合わせて更新する。

- runs/{runId}
  - status: "running" | "finished"
  - startedAt, finishedAt
  - latestLocation: { lat, lng, timestamp }  // 参照高速化のため
  - shareToken: string                       // 共有URL用（推測: runId直出しより安全）
- runs/{runId}/locations/{locationId}
  - lat, lng, timestamp, accuracy, speed?
- runs/{runId}/messages/{messageId}
  - text, createdAt
- runs/{runId}/photos/{photoId}
  - storagePath, lat, lng, timestamp

Functions（案）
- message 作成 → ランナー端末へ FCM 通知
- run の latestLocation 更新（locations 書き込み時に runs.latestLocation を更新）

---

## 7. UIデザイン方針（Material 3 + “応援”）
### 7.1 基本方針
- Material Design 3 をベースに、一貫したコンポーネント・余白・タイポを守る
- コンセプト: “応援の熱量 / 元気 / 溌剌”
- 重要情報（走行中/停止中、現在地、最新メッセージ）を最優先で目立たせる
- アクセシビリティ（コントラスト、文字サイズ、タップ領域）を犠牲にしない

### 7.2 カラーポリシー（案）
- Material 3 の ColorScheme を採用し、seed color を “活力系（暖色寄り）” に寄せる
- ただし可読性を最優先し、本文・重要ボタンは十分なコントラストを確保

---

## 8. 実装スタイル（Cursorへの指示）
### 8.1 変更の進め方
- 1PR = 1目的（位置情報継続、送信キュー、表示など）
- 既存コードの全面改修は避け、必要な範囲の差分で進める
- 新規追加は必ず “どのレイヤーに置くか” を明示してから実装

### 8.2 コーディングルール
- any 的な曖昧さは避け、型を明確にする
- 例外は握りつぶさず、ユーザーに意味のある状態へ落とす（UiState）
- 重要なクラス（Service/Repository/UseCase）は KDoc を付ける

### 8.3 テスト方針（最低限）
- UseCase / Repository は unit test 対象
- Foreground Service は手動E2E手順を docs に残す（端末/OS差分が出るため）

---

## 9. Definition of Done（完了条件）
- 走行中（画面OFF含む）に位置情報が継続して更新・保存される
- ネットワーク断が起きても、復帰後に再送される（少なくともロストしない）
- 応援メッセージが保存され、ランナー側で受信できる（通知/画面内表示どちらでも可）
- 主要画面が Material 3 で統一され、コンセプトに沿った配色・タイポになっている

---

## 10. 参照（一次/二次を明示）
### 一次ソース（公式）
- Android App Architecture: https://developer.android.com/topic/architecture
- Hilt: https://developer.android.com/training/dependency-injection/hilt-android
- WorkManager: https://developer.android.com/develop/background-work
- Foreground service types: https://developer.android.com/develop/background-work/services/fgs/service-types
- Request location updates (FLP): https://developer.android.com/develop/sensors-and-location/location/request-updates
- Material 3 (Compose): https://developer.android.com/develop/ui/compose/designsystems/material3
- Material Design 3: https://m3.material.io/
- Firestore offline: https://firebase.google.com/docs/firestore/manage-data/enable-offline
- Cloud Functions Firestore triggers: https://firebase.google.com/docs/functions/firestore-events
- Cloud Storage upload (Android): https://firebase.google.com/docs/storage/android/upload-files
- FCM: https://firebase.google.com/docs/cloud-messaging

### 二次ソース（参考）
- MVVM + Clean（指定記事）: https://qiita.com/void_takazu/items/d75aaf97eadf444bff77