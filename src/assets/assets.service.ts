// assets.service.ts
import { Injectable, Logger } from "@nestjs/common";
import { promises as fs } from "fs";
import * as path from "path";
import axios from "axios";

const ASSETS_DIR = path.resolve(__dirname, '../../assets/json');
const VERSION_FILE = path.join(ASSETS_DIR, 'assets_version.json');
const JSON_BASE_URL = "https://i.opentidkeio.jp/config/";
const SYSTEM_JSON_URL = "https://i.opentidkeio.jp/config/system.json";
const TRAFFIC_INFO_URL = "https://i.opentidkeio.jp/data/traffic_info.json";

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  async getJson(filename: string): Promise<any> {
    if (filename === "traffic_info.json") {
      return this.fetchTrafficInfo();
    }
    // diaはダイアなので、保存しないで、ネットから取ってくるだけ。
    if (filename.startsWith("dia/")) {
      const trainNo = filename.replace(/^dia\//, "");
      const url = `https://i.opentidkeio.jp/dia/${trainNo}`;
      try {
        const res = await axios.get(url);
        return res.data;
      } catch (e) {
        this.logger.warn(`Failed to fetch dia: ${filename}: ${e}`);
        return null;
      }
    }
    const assetPath = path.join(ASSETS_DIR, filename);
    if (!(await this.exists(assetPath))) {
      await this.updateAssetsIfNeeded();
    }
    if (!(await this.exists(assetPath))) {
      this.logger.warn(`${filename} not found. Returning null.`);
      return null; // ファイルが無い場合はnull返却
    }
    try {
      const data = await fs.readFile(assetPath, "utf-8");
      return JSON.parse(data);
    } catch (e) {
      this.logger.warn(`Failed to read or parse ${filename}: ${e}`);
      return null;
    }
  }

  private async fetchTrafficInfo(): Promise<any> {
    const url = `${TRAFFIC_INFO_URL}?ts=${Date.now()}`;
    const res = await axios.get(url);
    return res.data;
  }

  private async updateAssetsIfNeeded() {
    // assets_version.jsonの存在確認・読み込み
    let versionInfo: { version: string; checkedAt: number } = {
      version: "",
      checkedAt: 0,
    };
    // ディレクトリがなければ作成
    await this.ensureAssetsDir();
    if (await this.exists(VERSION_FILE)) {
      try {
        const raw = await fs.readFile(VERSION_FILE, "utf-8");
        versionInfo = JSON.parse(raw);
      } catch (e) {
        this.logger.warn(`Failed to read or parse assets_version.json: ${e}`);
      }
    } else {
      // ファイルが存在しない場合は新規作成
      try {
        await fs.writeFile(VERSION_FILE, JSON.stringify(versionInfo), "utf-8");
      } catch (e) {
        this.logger.warn(`Failed to create assets_version.json: ${e}`);
      }
    }
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    if (now - versionInfo.checkedAt < oneWeek && versionInfo.version) {
      return; // 1週間以内なら何もしない
    }
    console.log("Checking for updates...");
    // system.json取得
    const sysUrl = `${SYSTEM_JSON_URL}?ver=${now}`;
    const sysRes = await axios.get(sysUrl);
    const sysData = sysRes.data;
    const newVersion = sysData.system.find((x: any) => x.version)?.version;
    if (!newVersion) return;
    if (newVersion !== versionInfo.version) {
      // バージョンが違う場合、assets内jsonを更新
      await this.updateAllAssets(newVersion);
    }
    // バージョン・確認時刻を保存
    await fs.writeFile(
      VERSION_FILE,
      JSON.stringify({ version: newVersion, checkedAt: now }),
      "utf-8"
    );
  }

  private async updateAllAssets(version: string) {
    // assetsディレクトリ内のjson一覧
    const jsonFiles = [
      "ikisaki.json",
      "line.json",
      "other_chg_app.json",
      "other_chg.json",
      "position.json",
      "railload_chg.json",
      "station_info.json",
      "syasyu.json",
      // traffic_info.jsonは除外
    ];
    await this.ensureAssetsDir();
    for (const file of jsonFiles) {
      const url = `${JSON_BASE_URL}${file}?ver=${version}`;
      try {
        const res = await axios.get(url);
        await fs.writeFile(
          path.join(ASSETS_DIR, file),
          JSON.stringify(res.data),
          "utf-8"
        );
      } catch (e) {
        this.logger.warn(`Failed to fetch or write ${file}: ${e}`);
      }
    }
  }

  private async ensureAssetsDir() {
    try {
      await fs.mkdir(ASSETS_DIR, { recursive: true });
    } catch (e) {
      this.logger.warn(`Failed to create assets dir: ${e}`);
    }
  }

  private async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
