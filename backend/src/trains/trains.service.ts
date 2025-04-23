import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { TrafficInfo, TrainPoint } from "../models/traffic.model";
import { Position } from "../models/station.model";
import { TrainType, Destination } from "../models/config.model";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class TrainsService {
  private readonly logger = new Logger(TrainsService.name);
  private trafficInfo: TrafficInfo;
  private positions: Position[];
  private trainTypes: TrainType[];
  private destinations: Destination[];
  private lastUpdate: Date = new Date();
  private readonly updateInterval = 30000; // 30秒ごとにデータを更新

  constructor() {
    this.loadAllData();
    this.setupPeriodicUpdate();
  }

  /**
   * すべてのデータをロードする
   */
  private loadAllData(): void {
    try {
      // 各種JSONファイルをロード
      this.trafficInfo = this.loadJsonFile<TrafficInfo>("traffic_info.json");

      const positionData = this.loadJsonFile<{ pos: Position[] }>(
        "position.json",
      );
      this.positions = positionData.pos;

      const syasyuData = this.loadJsonFile<{ syasyu: TrainType[] }>(
        "syasyu.json",
      );
      this.trainTypes = syasyuData.syasyu;

      const ikisakiData = this.loadJsonFile<{ ikisaki: Destination[] }>(
        "ikisaki.json",
      );
      this.destinations = ikisakiData.ikisaki;

      this.lastUpdate = new Date();
      this.logger.log("All data loaded successfully");
    } catch (error) {
      this.logger.error(`Failed to load data: ${error.message}`);
      throw error;
    }
  }

  /**
   * JSONファイルを読み込む
   */
  private loadJsonFile<T>(filename: string): T {
    try {
      const filePath = path.join(process.cwd(), "src/assets", filename);
      const fileContent = fs.readFileSync(filePath, "utf8");
      return JSON.parse(fileContent);
    } catch (error) {
      this.logger.error(`Failed to load ${filename}: ${error.message}`);
      throw error;
    }
  }

  /**
   * 定期的なデータ更新処理をセットアップ
   */
  private setupPeriodicUpdate(): void {
    setInterval(() => {
      try {
        this.loadAllData();
        this.logger.log("Data updated");
      } catch (error) {
        this.logger.error(`Failed to update data: ${error.message}`);
      }
    }, this.updateInterval);
  }

  /**
   * 全運行情報を取得
   */
  getTrafficInfo(): TrafficInfo {
    return this.trafficInfo;
  }

  /**
   * 最終更新時刻を取得
   */
  getLastUpdateTime(): Date {
    return this.lastUpdate;
  }

  /**
   * 指定した駅の列車情報を取得
   */
  getTrainsForStation(stationIdOrName: string): any {
    // 駅IDまたは名前から駅情報を検索
    const position = this.findPosition(stationIdOrName);
    if (!position) {
      throw new NotFoundException(`Station not found: ${stationIdOrName}`);
    }

    const result = {
      stationId: position.ID,
      stationName: position.name,
      stationType: position.kind,
      updatedAt: this.formatDateTime(this.trafficInfo.up[0]?.dt[0]),
      trains: [],
    };

    // 駅か駅間かで取得方法を分ける
    if (position.kind === "駅") {
      // 駅の場合
      const stationInfo = this.trafficInfo.TS.find((s) => s.id === position.ID);
      if (stationInfo) {
        result.trains = this.formatTrains(stationInfo.ps);
      }
    } else if (position.kind === "駅間") {
      // 駅間の場合
      const sectionInfo = this.trafficInfo.TB.find((s) => s.id === position.ID);
      if (sectionInfo) {
        result.trains = this.formatTrains(sectionInfo.ps);
      }
    }

    return result;
  }

  /**
   * 列車到着予測情報を取得
   */
  getTrainArrivals(stationIdOrName: string): any {
    const position = this.findPosition(stationIdOrName);
    if (!position || position.kind !== "駅") {
      throw new NotFoundException(`Invalid station: ${stationIdOrName}`);
    }

    const stationId = position.ID;
    const arrivingTrains = [];

    // 接続する駅間を探す
    const connectedSections = this.positions.filter(
      (p) =>
        p.kind === "駅間" &&
        // 接続している駅間は、IDの末尾が駅IDの末尾と一致する
        (p.ID.endsWith(stationId.slice(-3)) || p.name.includes(position.name)),
    );

    // 駅間から到着予定の列車を検索
    connectedSections.forEach((section) => {
      const sectionInfo = this.trafficInfo.TB.find((s) => s.id === section.ID);
      if (sectionInfo && sectionInfo.ps.length > 0) {
        sectionInfo.ps.forEach((train) => {
          // 列車の方向が駅に向かっているか確認
          const isApproaching = this.isTrainApproachingStation(
            section.ID,
            train.ki,
            stationId,
          );
          if (isApproaching) {
            arrivingTrains.push({
              trainNumber: train.tr.trim(),
              type: this.getTrainTypeInfo(train.sy_tr),
              direction: train.ki === "0" ? "下り" : "上り",
              destination: this.getDestinationInfo(train.ik_tr),
              delay: train.dl === "00" ? 0 : parseInt(train.dl, 10),
              fromSection: section.name,
              estimatedArrival: this.estimateArrivalTime(train.dl),
              information: train.inf || null,
            });
          }
        });
      }
    });

    return {
      stationId: position.ID,
      stationName: position.name,
      updatedAt: this.formatDateTime(this.trafficInfo.up[0]?.dt[0]),
      arrivingTrains,
    };
  }

  /**
   * 列車が駅に向かっているかチェック
   */
  private isTrainApproachingStation(
    sectionId: string,
    direction: string,
    stationId: string,
  ): boolean {
    // 駅間IDの先頭文字で判断（U: 上り方向、D: 下り方向）
    const sectionType = sectionId.charAt(0);

    // 上り列車(ki=1)は、下り方向の駅間(D)から来る場合に到着する
    // 下り列車(ki=0)は、上り方向の駅間(U)から来る場合に到着する
    return (
      (direction === "1" && sectionType === "D") ||
      (direction === "0" && sectionType === "U")
    );
  }

  /**
   * 到着予想時刻を計算
   */
  private estimateArrivalTime(delayMinutes: string): string {
    const now = new Date();
    // 駅間から駅への到着は平均約2分と仮定
    const estimatedMinutes = 2;

    // 遅延分を追加
    const totalMinutes =
      estimatedMinutes +
      (delayMinutes === "00" ? 0 : parseInt(delayMinutes, 10));

    // 到着予想時刻を計算
    now.setMinutes(now.getMinutes() + totalMinutes);

    return now.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /**
   * 列車情報をフォーマット
   */
  private formatTrains(trains: TrainPoint[]): any[] {
    return trains.map((train) => ({
      trainNumber: train.tr.trim(),
      type: this.getTrainTypeInfo(train.sy_tr),
      direction: train.ki === "0" ? "下り" : "上り",
      destination: this.getDestinationInfo(train.ik_tr),
      delay: train.dl === "00" ? 0 : parseInt(train.dl, 10),
      carCount: train.sr !== "0" ? train.sr : null,
      information: train.inf || null,
      isInStation: train.bs === "0", // bs=0は駅停車中、それ以外は駅間
      positionCode: train.bs,
    }));
  }

  /**
   * 駅情報を検索
   */
  private findPosition(stationIdOrName: string): Position | undefined {
    return this.positions.find(
      (p) => p.ID === stationIdOrName || p.name === stationIdOrName,
    );
  }

  /**
   * 車種情報を取得
   */
  private getTrainTypeInfo(typeCode: string): any {
    const trainType = this.trainTypes.find((t) => t.code === typeCode);
    if (!trainType) return { code: typeCode, name: "不明", iconName: "" };

    return {
      code: trainType.code,
      name: trainType.name,
      iconName: trainType.iconname,
    };
  }

  /**
   * 行先情報を取得
   */
  private getDestinationInfo(destCode: string): any {
    const destination = this.destinations.find((d) => d.code === destCode);
    if (!destination) return { code: destCode, name: "不明" };

    return {
      code: destination.code,
      name: destination.name,
    };
  }

  /**
   * 日時情報をフォーマット
   */
  private formatDateTime(dt: any): string {
    if (!dt) return "Unknown";
    return `${dt.yy}-${dt.mt}-${dt.dy} ${dt.hh}:${dt.mm}:${dt.ss}`;
  }
}
