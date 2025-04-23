import { Controller, Get, Param, NotFoundException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from "@nestjs/swagger";
import { StationsService } from "./stations.service";
import { Position } from "../models/station.model";

@Controller("api/stations")
@ApiTags("stations")
export class StationsController {
  constructor(private readonly stationsService: StationsService) {}

  @Get()
  @ApiOperation({ summary: "すべての駅情報を取得" })
  @ApiResponse({
    status: 200,
    description: "駅情報の一覧を返却",
    type: [Position],
  })
  getAllStations(): Position[] {
    return this.stationsService.getAllStations();
  }

  @Get("sections")
  @ApiOperation({ summary: "すべての駅間情報を取得" })
  @ApiResponse({
    status: 200,
    description: "駅間情報の一覧を返却",
    type: [Position],
  })
  getAllSections(): Position[] {
    return this.stationsService.getAllSections();
  }

  @Get("id/:id")
  @ApiOperation({ summary: "駅IDで駅情報を取得" })
  @ApiParam({ name: "id", description: "駅ID（例: E001）" })
  @ApiResponse({
    status: 200,
    description: "駅情報を返却",
    type: Position,
  })
  @ApiResponse({ status: 404, description: "指定されたIDの駅が見つかりません" })
  getStationById(@Param("id") id: string): Position {
    return this.stationsService.getStationById(id);
  }

  @Get("name/:name")
  @ApiOperation({ summary: "駅名で駅情報を取得" })
  @ApiParam({ name: "name", description: "駅名（例: 新宿）" })
  @ApiResponse({
    status: 200,
    description: "駅情報を返却",
    type: Position,
  })
  @ApiResponse({
    status: 404,
    description: "指定された名前の駅が見つかりません",
  })
  getStationByName(@Param("name") name: string): Position {
    return this.stationsService.getStationByName(name);
  }
}
