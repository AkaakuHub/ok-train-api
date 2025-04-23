import { Controller, Get, Param, NotFoundException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from "@nestjs/swagger";
import { TrainsService } from "./trains.service";
import { TrafficInfo } from "../models/traffic.model";

@Controller("api/trains")
@ApiTags("trains")
export class TrainsController {
  constructor(private readonly trainsService: TrainsService) {}

  @Get()
  @ApiOperation({ summary: "全運行情報の取得" })
  @ApiResponse({
    status: 200,
    description: "運行情報JSONを型付きで返却",
    type: Object,
  })
  getTrafficInfo(): TrafficInfo {
    return this.trainsService.getTrafficInfo();
  }

  @Get("station/:idOrName")
  @ApiOperation({ summary: "特定の駅の列車情報を取得" })
  @ApiParam({
    name: "idOrName",
    description: '駅ID("E001"など)または駅名("新宿"など)',
  })
  @ApiResponse({
    status: 200,
    description: "指定駅の列車情報を返却",
    schema: {
      properties: {
        stationId: { type: "string", example: "E001" },
        stationName: { type: "string", example: "新宿" },
        stationType: { type: "string", example: "駅" },
        updatedAt: { type: "string", example: "2025-04-22 11:04:10" },
        trains: {
          type: "array",
          items: {
            type: "object",
            properties: {
              trainNumber: { type: "string", example: "0715" },
              type: {
                type: "object",
                properties: {
                  code: { type: "string", example: "1" },
                  name: { type: "string", example: "特急" },
                  iconName: { type: "string", example: "特" },
                },
              },
              direction: { type: "string", example: "上り" },
              destination: {
                type: "object",
                properties: {
                  code: { type: "string", example: "054" },
                  name: { type: "string", example: "京王多摩センター" },
                },
              },
              delay: { type: "number", example: 0 },
              carCount: { type: "string", example: "10" },
              information: {
                type: "string",
                example:
                  "この列車は京王多摩センター駅で各駅停車 橋本行きとなります。",
              },
              isInStation: { type: "boolean", example: true },
              positionCode: { type: "string", example: "0" },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: "指定された駅が見つかりません" })
  getTrainsForStation(@Param("idOrName") idOrName: string): any {
    try {
      return this.trainsService.getTrainsForStation(idOrName);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`列車情報の取得に失敗しました: ${error.message}`);
    }
  }

  @Get("arrivals/:stationIdOrName")
  @ApiOperation({ summary: "指定駅への到着予定列車を取得" })
  @ApiParam({
    name: "stationIdOrName",
    description: '駅ID("E001"など)または駅名("新宿"など)',
  })
  @ApiResponse({
    status: 200,
    description: "指定駅への到着予定列車情報を返却",
    schema: {
      properties: {
        stationId: { type: "string", example: "E001" },
        stationName: { type: "string", example: "新宿" },
        updatedAt: { type: "string", example: "2025-04-22 11:04:10" },
        arrivingTrains: {
          type: "array",
          items: {
            type: "object",
            properties: {
              trainNumber: { type: "string", example: "0715" },
              type: {
                type: "object",
                properties: {
                  code: { type: "string", example: "1" },
                  name: { type: "string", example: "特急" },
                  iconName: { type: "string", example: "特" },
                },
              },
              direction: { type: "string", example: "上り" },
              destination: {
                type: "object",
                properties: {
                  code: { type: "string", example: "054" },
                  name: { type: "string", example: "京王多摩センター" },
                },
              },
              delay: { type: "number", example: 0 },
              fromSection: { type: "string", example: "笹塚～新宿" },
              estimatedArrival: { type: "string", example: "11:06" },
              information: { type: "string", example: "遅延情報..." },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: "指定された駅が見つかりません" })
  getTrainArrivals(@Param("stationIdOrName") stationIdOrName: string): any {
    return this.trainsService.getTrainArrivals(stationIdOrName);
  }

  @Get("detail/:trainId")
  @ApiOperation({
    summary: "列車IDで詳細情報を取得（現在位置・停車駅・予定到着時刻など）",
  })
  @ApiParam({ name: "trainId", description: "列車ID（例: 4888）" })
  @ApiResponse({ status: 200, description: "列車詳細情報" })
  @ApiResponse({ status: 404, description: "指定された列車が見つかりません" })
  async getTrainDetail(@Param("trainId") trainId: string): Promise<any> {
    try {
      return await this.trainsService.getTrainDetail(trainId);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new Error(`列車詳細情報の取得に失敗しました: ${error.message}`);
    }
  }
}
