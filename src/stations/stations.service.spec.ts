import { Test, TestingModule } from '@nestjs/testing';
import { StationsService } from './stations.service';
import { AssetsService } from '../assets/assets.service';
import { NotFoundException, Logger } from '@nestjs/common';

// AssetsServiceのモック
const mockAssetsService = {
  getJson: jest.fn(),
};

describe('StationsService', () => {
  let service: StationsService;
  let assetsService: typeof mockAssetsService;

  // サンプル駅データ
  const mockPositions = [
    { ID: 'E001', name: '新宿', kind: '駅' },
    { ID: 'E002', name: '笹塚', kind: '駅' },
    { ID: 'U001', name: '新宿～笹塚', kind: '駅間' },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StationsService,
        { provide: AssetsService, useValue: mockAssetsService },
      ],
    }).compile();

    service = module.get<StationsService>(StationsService);
    assetsService = module.get(AssetsService);
    // 駅データを直接セット
    (service as any).positions = mockPositions;
    (service as any).logger = new Logger();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('すべての駅情報を取得できる', () => {
    const result = service.getAllStations();
    expect(result).toEqual([
      { ID: 'E001', name: '新宿', kind: '駅' },
      { ID: 'E002', name: '笹塚', kind: '駅' },
    ]);
  });

  it('すべての駅間情報を取得できる', () => {
    const result = service.getAllSections();
    expect(result).toEqual([
      { ID: 'U001', name: '新宿～笹塚', kind: '駅間' },
    ]);
  });

  it('駅IDで駅情報を取得できる', () => {
    const result = service.getStationById('E001');
    expect(result).toEqual({ ID: 'E001', name: '新宿', kind: '駅' });
  });

  it('存在しない駅IDでNotFoundException', () => {
    expect(() => service.getStationById('E999')).toThrow(NotFoundException);
  });

  it('駅名で駅情報を取得できる', () => {
    const result = service.getStationByName('新宿');
    expect(result).toEqual({ ID: 'E001', name: '新宿', kind: '駅' });
  });

  it('存在しない駅名でNotFoundException', () => {
    expect(() => service.getStationByName('不存在')).toThrow(NotFoundException);
  });

  it('getStationsByLineは空配列を返す（未実装）', () => {
    const result = service.getStationsByLine('1');
    expect(result).toEqual([]);
  });
});
