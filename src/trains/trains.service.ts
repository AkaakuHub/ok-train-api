import {
  Injectable,
  NotFoundException,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { TrafficInfo, TrainPoint } from "../models/traffic.model";
import { Position } from "../models/station.model";
import { TrainType, Destination } from "../models/config.model";
import { AssetsService } from "../assets/assets.service";

@Injectable()
export class TrainsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TrainsService.name);
  private positions: Position[];
  private trainTypes: TrainType[];
  private destinations: Destination[];
  private lastUpdate: Date = new Date();
  private intervalId: NodeJS.Timeout;

  constructor(private readonly assetsService: AssetsService) {}

  async onModuleInit() {
    await this.loadAllData();
  }

  async onModuleDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  /**
   * すべてのデータをロードする
   */
  private async loadAllData(): Promise<void> {
    try {
      // 他のjsonはassets/json/から取得
      const positionData = await this.assetsService.getJson("position.json");
      this.positions = positionData.pos;
      const syasyuData = await this.assetsService.getJson("syasyu.json");
      this.trainTypes = syasyuData.syasyu;
      const ikisakiData = await this.assetsService.getJson("ikisaki.json");
      this.destinations = ikisakiData.ikisaki;
      this.lastUpdate = new Date();
      this.logger.log("All data loaded successfully");
    } catch (error) {
      this.logger.error(`Failed to load data: ${error.message}`);
      throw error;
    }
  }

  /**
   * 全運行情報を取得（毎回最新を取得し、lastUpdateも更新）
   */
  async getTrafficInfo(): Promise<TrafficInfo> {
    const info = (await this.assetsService.getJson(
      "traffic_info.json"
    )) as TrafficInfo;
    this.lastUpdate = new Date();
    return info;
  }

  /**
   * 最終更新時刻を取得
   */
  getLastUpdateTime(): Date {
    return this.lastUpdate;
  }

  /**
   * 指定した駅の列車情報を取得（trafficInfoを毎回取得）
   */
  async getTrainsForStation(stationIdOrName: string): Promise<any> {
    const position = this.findPosition(stationIdOrName);
    if (!position) {
      throw new NotFoundException(`Station not found: ${stationIdOrName}`);
    }
    const trafficInfo = await this.getTrafficInfo();
    const result = {
      stationId: position.ID,
      stationName: position.name,
      stationType: position.kind,
      updatedAt: this.formatDateTime(trafficInfo.up[0]?.dt[0]),
      trains: [],
    };
    if (!trafficInfo.TS || !trafficInfo.TB) {
      // 電車が走っていない
      this.logger.warn("No train information available");
      return result;
    }
    if (position.kind === "駅") {
      const stationInfo = trafficInfo.TS.find((s) => s.id === position.ID);
      if (stationInfo) {
        result.trains = this.formatTrains(stationInfo.ps);
      }
    } else if (position.kind === "駅間") {
      const sectionInfo = trafficInfo.TB.find((s) => s.id === position.ID);
      if (sectionInfo) {
        result.trains = this.formatTrains(sectionInfo.ps);
      }
    }
    return result;
  }

  /**
   * 列車到着予測情報を取得（trafficInfoを毎回取得）
   * すべての走行中の電車に対して、指定駅に到着する時刻・停車/通過・駅停車中か駅間かを返す
   */
  async getTrainArrivals(stationIdOrName: string): Promise<any> {
    // TODO: 今、路線を完全に無視しているため、京王本線の時間みたいのに、井の頭線も見に行ってしまっているのを治す
    // TODO: 新線新宿間のみの列車(ex. 笹塚から新線新宿のみ)も含まれていて、あやまった通過判定がでるのを治す
    const position = this.findPosition(stationIdOrName);
    if (!position || position.kind !== "駅") {
      throw new NotFoundException(`Invalid station: ${stationIdOrName}`);
    }
    const stationId = position.ID;
    const trafficInfo = await this.getTrafficInfo();
    const allTrains: TrainPoint[] = [];
    // 駅停車中
    if (trafficInfo.TS) {
      for (const s of trafficInfo.TS) {
        if (Array.isArray(s.ps)) allTrains.push(...s.ps);
      }
    }
    // 駅間走行中
    if (trafficInfo.TB) {
      for (const s of trafficInfo.TB) {
        if (Array.isArray(s.ps)) allTrains.push(...s.ps);
      }
    }
    const arrivingTrains = [];
    for (const train of allTrains) {
      const delay = train.dl === "00" ? 0 : parseInt(train.dl, 10);
      const trainId = train.tr.trim();
      const schedule = await this.getTrainDetail(trainId, delay);
      // 駅IDは先頭英字を除いた数字部分で比較
      const newStationId = stationId.replace(/^[a-zA-Z]/, "").replace(/^0/, "");
      const stop = schedule.stops.find((s) => s.stationId === newStationId);
      let estimatedArrival = "--:--";
      let passType = "通過";
      if (stop) {
        estimatedArrival = stop.estimatedArrival;
        if (estimatedArrival !== "--:--") {
          passType = "停車";
        }
      }
      // estimatedArrivalが過去なら、追加しない
      const now = new Date();
      const [hh, mm] = estimatedArrival.split(":").map(Number);
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
      if (d < now) {
        continue;
      }
      arrivingTrains.push({
        trainNumber: train.tr.trim(),
        type: this.getTrainTypeInfo(train.sy_tr),
        direction: train.ki === "0" ? "上り" : "下り",
        destination: this.getDestinationInfo(train.ik_tr),
        delay,
        isInStation: train.bs === "0",
        estimatedArrival,
        passType, // "停車" or "通過"
        information: train.inf || null,
      });
    }
    return {
      stationId: position.ID,
      stationName: position.name,
      updatedAt: this.formatDateTime(trafficInfo.up[0]?.dt[0]),
      arrivingTrains,
    };
  }

  /**
   * 列車情報をフォーマット
   */
  private formatTrains(trains: TrainPoint[]): any[] {
    return trains.map((train) => ({
      trainNumber: train.tr.trim(),
      type: this.getTrainTypeInfo(train.sy_tr),
      direction: train.ki === "0" ? "上り" : "下り",
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
      (p) => p.ID === stationIdOrName || p.name === stationIdOrName
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
   * 列車IDでダイヤAPIを直接参照し、停車駅一覧・時刻表・到着時刻を返す(遅延の反映はここではしない)
   */
  async getTrainDetail(trainId: string, delayMin?: number): Promise<any> {
    // https://i.opentidkeio.jp/dia/{trainId}.json を直接取得
    // trainIDが"0123"だったら123に変換
    const schedule = await this.assetsService.getJson(`dia/${trainId}.json`);
    if (!schedule || !Array.isArray(schedule.dy)) {
      throw new NotFoundException(`Train schedule not found: ${trainId}`);
    }
    // dy配列を整形して返す
    const stops = schedule.dy.map((stop: any) => {
      const scheduledArrival = stop.tt;
      let estimatedArrival = scheduledArrival;
      if (scheduledArrival && delayMin !== undefined) {
        const [hh, mm] = scheduledArrival.split(":").map(Number);
        const d = new Date();
        d.setHours(hh, mm, 0, 0);
        d.setMinutes(d.getMinutes() + delayMin);
        const H = d.getHours().toString().padStart(2, "0");
        const M = d.getMinutes().toString().padStart(2, "0");
        estimatedArrival = `${H}:${M}`;
      } else if (!scheduledArrival) {
        estimatedArrival = "--:--";
      }
      return {
        stationId: stop.st,
        stationName: stop.sn,
        scheduledArrival,
        scheduledDeparture: stop.ht,
        stopFlag: stop.pa, // '1'=停車, '0'=通過
        estimatedArrival,
      };
    });
    return {
      trainId,
      stops,
    };
  }

  /**
   * dtオブジェクト({yy,mt,dy,hh,mm,ss})から日付文字列を生成
   */
  private formatDateTime(dt: any): string {
    if (!dt) return "Unknown";
    const pad = (n: any) => n.toString().padStart(2, "0");
    return `${dt.yy}-${pad(dt.mt)}-${pad(dt.dy)} ${pad(dt.hh)}:${pad(dt.mm)}:${pad(dt.ss)}`;
  }
}
