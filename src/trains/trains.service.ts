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

  constructor(private readonly assetsService: AssetsService) { }

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
   * 駅IDから路線コードを推測する
   */
  private getLineCodeByStationId(stationId: string): string | null {
    // 例: E001〜E032, E036~E054: 京王線(1), E033 ~ E035, E101~E103: 新線新宿線(2), E081〜E097: 井の頭線(3)
    const num = parseInt(stationId.replace(/^E/, ""), 10);
    if ((num >= 1 && num <= 32) || (num >= 36 && num <= 54)) {
      return "1"; // 京王線系
    } else if ((num >= 33 && num <= 35) || (num >= 101 && num <= 103)) {
      return "2"; // 新線新宿線系
    } else if (num >= 81 && num <= 97) {
      return "3"; // 井の頭線系
    }
    return null;
  }

  /**
   * trafficInfo のエントリ配列から該当行の列車情報を抽出して返す
   *
   * @param {Array<{id: string, ps: any[]}>} entries  TS または TB の配列
   * @param {string} lineCode  フィルタ対象の路線コード
   * @returns {any[]}  抽出した列車情報の配列
   */
  private collectTrains(
    entries: Array<{ id: string; ps: any[] }>,
    lineCode: string
  ): any[] {
    const result = [];
    for (const { id, ps } of entries) {
      if (!Array.isArray(ps)) {
        continue;
      }
      const formattedCode = id.replace(/^[a-zA-Z]/, "").replace(/^0/, "");
      if (this.getLineCodeByStationId(formattedCode) === lineCode) {
        result.push(...ps);
      }
    }
    return result;
  }

  /**
   * 列車到着予測情報を取得（trafficInfoを毎回取得）
   * 駅が所属する路線のみを対象に絞り込む
   */
  async getTrainArrivals(stationIdOrName: string): Promise<any> {
    // TODO: 新線新宿間のみの列車(ex. 笹塚から新線新宿のみ)も含まれていて、あやまった通過判定がでるのを治す
    // TODO: なぜか、とっくに通り過ぎてるのに表示されることがある

    const position = this.findPosition(stationIdOrName);
    if (!position || position.kind !== "駅") {
      throw new NotFoundException(`Invalid station: ${stationIdOrName}`);
    }
    const stationId = position.ID;
    // 駅IDから路線コードを推測
    const lineCode = this.getLineCodeByStationId(stationId);
    const trafficInfo = await this.getTrafficInfo();
    const allTrains: TrainPoint[] = [];
    // 駅停車中
    if (trafficInfo.TS) {
      allTrains.push(...this.collectTrains(trafficInfo.TS, lineCode));
    }
    // 駅間走行中
    if (trafficInfo.TB) {
      allTrains.push(...this.collectTrains(trafficInfo.TB, lineCode));
    }
    // console.log("allTrains", allTrains);
    // なぜか、実際には走ってない列車の情報も入る？？謎
    // 実際に走っているのは089なのに、jsonには0089が入る、のような場合がある
    // 予想: 多分生で配信されるjsonでは全部idが4ケタにフォーマットされていて、idだけでは区別できなさそう。
    // なので、いちいち駅の情報も見に行って、路線判定する

    const arrivingTrains = [];
    for (const train of allTrains) {
      const delay = train.dl === "00" ? 0 : parseInt(train.dl, 10);
      const trainId = train.tr.trim();
      const schedule = await this.getTrainDetail(trainId, delay);
      // 駅IDは先頭英字を除いた数字部分で比較
      const newStationId = stationId.replace(/^[a-zA-Z]/, "").replace(/^0/, "");
      const stop = schedule.stops.find((s) => s.stationId === newStationId);
      let estimatedDeparture = "--:--";
      let passType = "通過";

      if (stop) {
        estimatedDeparture = stop.estimatedDeparture;
        if (estimatedDeparture !== "--:--") {
          passType = "停車";
        } else {
          continue; // 通過列車はもう載せない

          // // 通過列車の場合、前後の停車駅から通過時刻を推定
          // const stopIndex = schedule.stops.findIndex((s) => s.stationId === newStationId);

          // // 前の停車駅を探す
          // let prevStop = null;
          // for (let i = stopIndex - 1; i >= 0; i--) {
          //   if (schedule.stops[i].estimatedDeparture !== "--:--") {
          //     prevStop = schedule.stops[i];
          //     break;
          //   }
          // }

          // // 次の停車駅を探す
          // let nextStop = null;
          // for (let i = stopIndex + 1; i < schedule.stops.length; i++) {
          //   if (schedule.stops[i].estimatedDeparture !== "--:--") {
          //     nextStop = schedule.stops[i];
          //     break;
          //   }
          // }

          // // 前後の停車駅がある場合、通過時刻を推定
          // if (prevStop && nextStop) {
          //   // 前後の駅の位置を取得して距離の比率を計算
          //   // const prevStopPos = this.findPosition(prevStop.stationId);
          //   // const currentStopPos = this.findPosition(newStationId);
          //   // const nextStopPos = this.findPosition(nextStop.stationId);

          //   // if (prevStopPos && currentStopPos && nextStopPos) {
          //   // 時刻を分単位に変換
          //   const [prevHH, prevMM] = prevStop.estimatedDeparture.split(':').map(Number);
          //   const [nextHH, nextMM] = nextStop.estimatedDeparture.split(':').map(Number);

          //   let prevTimeInMinutes = prevHH * 60 + prevMM;
          //   let nextTimeInMinutes = nextHH * 60 + nextMM;

          //   // 日付をまたぐ場合の処理
          //   if (nextTimeInMinutes < prevTimeInMinutes) {
          //     nextTimeInMinutes += 24 * 60; // 翌日の場合は24時間加算
          //   }

          //   // // 単純な駅の位置から線形補間（より精度が必要なら駅間距離を使用）
          //   // const totalStations = Math.abs(Number(nextStop.stationId) - Number(prevStop.stationId));
          //   // const currentPosition = Math.abs(Number(newStationId) - Number(prevStop.stationId));
          //   // const ratio = currentPosition / totalStations;

          //   // 推定通過時刻を計算
          //   const estimatedPassTimeInMinutes = Math.round(prevTimeInMinutes + (nextTimeInMinutes - prevTimeInMinutes));

          //   const estimatedPassHH = Math.floor(estimatedPassTimeInMinutes / 60) % 24;
          //   const estimatedPassMM = estimatedPassTimeInMinutes % 60;

          //   estimatedDeparture = `${estimatedPassHH.toString().padStart(2, '0')}:${estimatedPassMM.toString().padStart(2, '0')}`;
          // }
          // // }
        }
      } else {
        continue; // 停車駅にない場合はスキップ
      }

      // estimatedArrivalが過去なら、追加しない
      const now = new Date();
      let [hh, mm] = estimatedDeparture.split(":").map(Number);

      // 返却要素の制限時には遅延も加味して考える
      // 遅延を加算して、時間の繰り上がりを処理
      mm += delay;
      hh += Math.floor(mm / 60);
      mm %= 60;
      hh %= 24; // 24時間を超える場合も考慮

      // 日付をまたぐ時間帯の処理（00:00～03:59は翌日とみなす）
      let targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // 現在時刻が深夜（0時～3時台）の場合
      if (now.getHours() >= 0 && now.getHours() < 4) {
        // 列車の到着時刻が夕方以降（18時以降）なら前日とみなす
        if (hh >= 18) {
          targetDate.setDate(targetDate.getDate() - 1);
        }
      }
      // 現在時刻が夕方以降（18時以降）の場合
      else if (now.getHours() >= 18) {
        // 列車の到着時刻が早朝（4時未満）なら翌日とみなす
        if (hh >= 0 && hh < 4) {
          targetDate.setDate(targetDate.getDate() + 1);
        }
      }

      const d = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate(),
        hh,
        mm,
        0,
        0
      );

      if (d < now) {
        // this.logger.debug(`スキップ: 列車${train.tr.trim()}の${stop.stationName}到着予定(${estimatedDeparture})は過去の時刻です`);
        continue;
      }
      // if (passType === "通過") {
      //   estimatedDeparture = "--:--";
      // }

      arrivingTrains.push({
        trainNumber: train.tr.trim(),
        type: this.getTrainTypeInfo(train.sy_tr),
        direction: train.ki === "0" ? "上り" : "下り",
        destination: this.getDestinationInfo(train.ik_tr),
        delay,
        isInStation: train.bs === "0",
        estimatedDeparture,
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
    const schedule = await this.assetsService.getJson(`dia/${trainId}.json`);
    if (!schedule || !Array.isArray(schedule.dy)) {
      throw new NotFoundException(`Train schedule not found: ${trainId}`);
    }
    // dy配列を整形して返す
    const stops = schedule.dy.map((stop: any) => {
      // 実際に表示するのは到着ではなく発車時刻
      const scheduledArrival = stop.ht;
      let estimatedDeparture = scheduledArrival;
      if (scheduledArrival && delayMin !== undefined) {
        const [hh, mm] = scheduledArrival.split(":").map(Number);
        const d = new Date();
        d.setHours(hh, mm, 0, 0);
        d.setMinutes(d.getMinutes() + delayMin);
        const H = d.getHours().toString().padStart(2, "0");
        const M = d.getMinutes().toString().padStart(2, "0");
        estimatedDeparture = `${H}:${M}`;
      } else if (!scheduledArrival) {
        estimatedDeparture = "--:--";
      }
      return {
        stationId: stop.st,
        stationName: stop.sn,
        scheduledArrival,
        scheduledDeparture: stop.ht,
        stopFlag: stop.pa, // '1'=停車, '0'=通過
        estimatedDeparture,
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
