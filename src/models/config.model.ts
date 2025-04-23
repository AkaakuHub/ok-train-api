/**
 * アプリケーション設定情報の型定義
 */

import { ApiProperty } from "@nestjs/swagger";

/**
 * 車種情報
 */
export class TrainType {
  @ApiProperty({ description: "車種コード", example: "1" })
  code: string;

  @ApiProperty({ description: "スタイルクラス", example: "express" })
  style: string;

  @ApiProperty({ description: "アイコン表示名", example: "特" })
  iconname: string;

  @ApiProperty({ description: "車種名", example: "特急" })
  name: string;

  @ApiProperty({ description: "車種名（英語）", example: "Express" })
  name_e: string;
}

/**
 * 行先情報
 */
export class Destination {
  @ApiProperty({ description: "行先コード", example: "054" })
  code: string;

  @ApiProperty({ description: "行先名", example: "京王多摩センター" })
  name: string;
}

/**
 * 路線情報
 */
export class Line {
  @ApiProperty({ description: "路線コード", example: "1" })
  code: string;

  @ApiProperty({ description: "路線名", example: "京王線" })
  name: string;

  @ApiProperty({ description: "区分", example: "1" })
  kubun: string;

  @ApiProperty({ description: "スタイルクラス", example: "keio-line" })
  style: string;
}

/**
 * アプリ情報
 */
export class AppInfo {
  @ApiProperty({ description: "アプリ種別", example: "android" })
  app_type: string;

  @ApiProperty({ description: "アプリ名", example: "京王アプリ" })
  app_name: string;

  @ApiProperty({
    description: "アプリリンク",
    example: "https://play.google.com/...",
  })
  app_link: string;
}

/**
 * その他リンク情報
 */
export class OtherLinkInfo {
  @ApiProperty({ description: "リンク名", example: "時刻表" })
  linkname: string;

  @ApiProperty({
    description: "リンクURL",
    example: "https://www.keio.co.jp/...",
  })
  link: string;
}

/**
 * 駅と路線の関連情報
 */
export class StationLineInfo {
  @ApiProperty({ description: "上り・下りフラグ", example: true })
  iu: boolean;

  @ApiProperty({
    description: "路線コードのリスト",
    type: [String],
    example: ["1", "2"],
  })
  line: string[];

  @ApiProperty({ description: "路線内の順序", example: 10 })
  order: number;
}

/**
 * 乗換情報
 */
export class TransferInfo {
  @ApiProperty({ description: "駅コード", example: "E001" })
  code: string;

  @ApiProperty({ description: "路線", example: "1" })
  line: string;

  @ApiProperty({ description: "マーク", example: "transfer" })
  mark: string;

  @ApiProperty({ description: "アプリ情報", type: [AppInfo] })
  app: AppInfo[];

  @ApiProperty({ description: "その他リンク情報", type: [OtherLinkInfo] })
  other: OtherLinkInfo[];
}

/**
 * 鉄道会社変更情報
 */
export class RailroadChange {
  @ApiProperty({ description: "鉄道会社名", example: "JR東日本" })
  name: string;

  @ApiProperty({ description: "リンク", example: "https://www.jreast.co.jp/" })
  link: string;
}
