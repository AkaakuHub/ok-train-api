import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { Position } from "../models/station.model";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class StationsService {
  private readonly logger = new Logger(StationsService.name);
  private positions: Position[];

  constructor() {
    this.loadStations();
  }

  /**
   * 駅情報を読み込む
   */
  private loadStations(): void {
    try {
      const filePath = path.join(process.cwd(), "src/assets", "position.json");
      const fileContent = fs.readFileSync(filePath, "utf8");
      const positionData = JSON.parse(fileContent);
      this.positions = positionData.pos;
      this.logger.log("Station data loaded successfully");
    } catch (error) {
      this.logger.error(`Failed to load station data: ${error.message}`);
      this.positions = [];
    }
  }

  /**
   * すべての駅情報を取得
   */
  getAllStations(): Position[] {
    return this.positions.filter((p) => p.kind === "駅");
  }

  /**
   * すべての駅間情報を取得
   */
  getAllSections(): Position[] {
    return this.positions.filter((p) => p.kind === "駅間");
  }

  /**
   * 駅IDで駅情報を取得
   */
  getStationById(id: string): Position {
    const station = this.positions.find((p) => p.ID === id);
    if (!station) {
      throw new NotFoundException(`Station with ID ${id} not found`);
    }
    return station;
  }

  /**
   * 駅名で駅情報を取得
   */
  getStationByName(name: string): Position {
    const station = this.positions.find((p) => p.name === name);
    if (!station) {
      throw new NotFoundException(`Station with name ${name} not found`);
    }
    return station;
  }

  /**
   * 路線で駅情報をフィルタリング
   * この機能は将来の拡張用に実装の枠組みのみ用意
   */
  getStationsByLine(lineCode: string): Position[] {
    // 路線情報と駅情報の関連付けが必要
    // station_info.jsonから駅と路線の関係を取得する必要がある
    // いったん空の配列を返す
    this.logger.warn("getStationsByLine method is not fully implemented yet");
    return [];
  }
}
