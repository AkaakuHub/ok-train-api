import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TrainsService } from './trains.service';
import { AssetsService } from "../assets/assets.service";

// AssetsServiceのモック
const mockAssetsService = {
  getJson: jest.fn(),
};

describe('TrainsService', () => {
  let service: TrainsService;
  let assetsService: typeof mockAssetsService;

  // サンプルデータ
  const mockPositions = [
    { ID: 'E001', name: '新宿', kind: '駅' },
    { ID: 'E002', name: '笹塚', kind: '駅' },
    { ID: 'U001', name: '新宿～笹塚', kind: '駅間' },
  ];
  const mockTrainTypes = [
    { code: '1', name: '特急', iconname: '特' },
  ];
  const mockDestinations = [
    { code: '054', name: '京王多摩センター' },
  ];
  const mockTrafficInfo = {
    up: [{ dt: [{ yy: '2025', mt: '04', dy: '24', hh: '12', mm: '00', ss: '00' }], st: '0' }],
    TS: [
      { id: 'E001', sn: 'K', ps: [
        { tr: '0715', sy_tr: '1', ki: '1', dl: '00', ik_tr: '054', sr: '10', inf: '', bs: '0' },
      ] },
    ],
    TB: [
      { id: 'U001', sn: 'U', ps: [] },
    ],
  };

  beforeEach(async () => {
    mockAssetsService.getJson.mockImplementation((filename: string) => {
      if (filename === 'traffic_info.json') return mockTrafficInfo;
      if (filename === 'position.json') return { pos: mockPositions };
      if (filename === 'syasyu.json') return { syasyu: mockTrainTypes };
      if (filename === 'ikisaki.json') return { ikisaki: mockDestinations };
      if (filename.startsWith('dia/')) return { dy: [] };
      return {};
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrainsService,
        { provide: AssetsService, useValue: mockAssetsService },
      ],
    }).compile();
    service = module.get<TrainsService>(TrainsService);
    assetsService = module.get(AssetsService);
    // データを直接セット
    (service as any).positions = mockPositions;
    (service as any).trainTypes = mockTrainTypes;
    (service as any).destinations = mockDestinations;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('getTrafficInfo: 運行情報が取得できる', async () => {
    const info = await service.getTrafficInfo();
    expect(info).toEqual(mockTrafficInfo);
  });

  it('getTrainsForStation: 駅IDで列車情報が取得できる', async () => {
    const result = await service.getTrainsForStation('E001');
    expect(result.stationId).toBe('E001');
    expect(result.trains.length).toBe(1);
    expect(result.trains[0].trainNumber).toBe('0715');
  });

  it('getTrainsForStation: 存在しない駅IDでNotFoundException', async () => {
    await expect(service.getTrainsForStation('E999')).rejects.toThrow(NotFoundException);
  });

  it('getTrainArrivals: 駅IDで到着予定列車が取得できる', async () => {
    const result = await service.getTrainArrivals('E001');
    expect(result.stationId).toBe('E001');
    expect(Array.isArray(result.arrivingTrains)).toBe(true);
  });

  it('getTrainArrivals: 存在しない駅IDでNotFoundException', async () => {
    await expect(service.getTrainArrivals('E999')).rejects.toThrow(NotFoundException);
  });

  it('getTrainDetail: 存在しないダイヤでNotFoundException', async () => {
    mockAssetsService.getJson.mockImplementation(() => ({ dy: undefined }));
    await expect(service.getTrainDetail('9999')).rejects.toThrow(NotFoundException);
  });

  // 境界値や異常系も追加
  it('getTrainTypeInfo: 未知の車種コードは不明を返す', () => {
    const info = (service as any).getTrainTypeInfo('999');
    expect(info.name).toBe('不明');
  });

  it('getDestinationInfo: 未知の行先コードは不明を返す', () => {
    const info = (service as any).getDestinationInfo('999');
    expect(info.name).toBe('不明');
  });
});
