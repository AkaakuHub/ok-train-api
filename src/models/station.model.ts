/**
 * 駅・駅間情報の型定義
 */

import { ApiProperty } from "@nestjs/swagger";

/**
 * 駅・駅間情報
 */
export class Position {
  @ApiProperty({
    description: "駅/駅間ID（E: 駅、U: 上り駅間、D: 下り駅間）",
    example: "E001",
  })
  ID: string;

  @ApiProperty({ description: "駅/駅間名", example: "新宿" })
  name: string;

  @ApiProperty({ description: '種別（"駅"または"駅間"）', example: "駅" })
  kind: string;

  @ApiProperty({
    description: "最大表示数（駅間の場合のみ）",
    required: false,
    example: "3",
  })
  max_disp?: string;
}
