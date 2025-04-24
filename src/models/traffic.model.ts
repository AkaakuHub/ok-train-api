/**
 * 運行情報の型定義
 */

import { ApiProperty } from "@nestjs/swagger";

/**
 * 日時情報
 */
export class DateTime {
  @ApiProperty({ description: "年", example: "2025" })
  yy: string;

  @ApiProperty({ description: "月", example: "04" })
  mt: string;

  @ApiProperty({ description: "日", example: "22" })
  dy: string;

  @ApiProperty({ description: "時", example: "11" })
  hh: string;

  @ApiProperty({ description: "分", example: "04" })
  mm: string;

  @ApiProperty({ description: "秒", example: "10" })
  ss: string;
}

/**
 * 運行情報の更新情報
 */
export class UpdateInfo {
  @ApiProperty({
    description: "日時情報",
    type: [DateTime],
  })
  dt: DateTime[];

  @ApiProperty({
    description: "ステータス（0: 正常、その他: エラー）",
    example: "0",
  })
  st: string;
}

/**
 * 列車情報
 */
export class TrainPoint {
  @ApiProperty({ description: "列車番号", example: " 0715 " })
  tr: string;

  @ApiProperty({ description: "車種コード（表示用内部コード）", example: "1" })
  sy: string;

  @ApiProperty({
    description: "車種コード（実際に使用される値）",
    example: "1",
  })
  sy_tr: string;

  @ApiProperty({ description: "方向（0: 上り、1: 下り）", example: "1" })
  ki: string;

  @ApiProperty({
    description: "列車位置（0は駅停車中、それ以外は駅間位置）",
    example: "0",
  })
  bs: string;

  @ApiProperty({ description: "遅延時間（分、00は遅れなし）", example: "00" })
  dl: string;

  @ApiProperty({ description: "行先コード（内部用）", example: "402" })
  ik: string;

  @ApiProperty({ description: "行先コード（表示用）", example: "054" })
  ik_tr: string;

  @ApiProperty({ description: "車両数", example: "10" })
  sr: string;

  @ApiProperty({
    description: "運行情報メッセージ",
    example: "この列車は京王多摩センター駅で各駅停車 橋本行きとなります。",
  })
  inf: string;
}

/**
 * 駅の列車情報
 */
export class StationTrains {
  @ApiProperty({ description: "駅/駅間ID", example: "E001" })
  id: string;

  @ApiProperty({ description: "表示用コード", example: "K" })
  sn: string;

  @ApiProperty({
    description: "その駅/駅間にいる列車リスト",
    type: [TrainPoint],
  })
  ps: TrainPoint[];
}

/**
 * 運行情報全体
 */
export class TrafficInfo {
  @ApiProperty({
    description: "更新情報",
    type: [UpdateInfo],
  })
  up: UpdateInfo[];

  @ApiProperty({
    description: "駅にいる列車情報",
    type: [StationTrains],
  })
  TS: StationTrains[];

  @ApiProperty({
    description: "駅間を走行中の列車情報",
    type: [StationTrains],
  })
  TB: StationTrains[];
}
