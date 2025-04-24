import { Test, TestingModule } from '@nestjs/testing';
import { AssetsService } from './assets.service';

jest.mock('fs/promises');

describe('AssetsService', () => {
  let service: AssetsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AssetsService],
    }).compile();
    service = module.get<AssetsService>(AssetsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // it('traffic_info.json（debugモード）をローカルから取得できる', async () => {
  //   process.env.DATA_MODE = 'debug';
  //   // fs.readFileのモックでJSON文字列を返す
  //   const mockJson = { up: [], TS: [], TB: [] } as TrafficInfo;
  //   (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockJson));
  //   const data = await service.getJson('traffic_info.json');
  //   expect(data).toEqual(mockJson);
  // });

  it('traffic_info.json（apiモード）はfetchTrafficInfoを呼ぶ', async () => {
    process.env.DATA_MODE = 'api';
    const spy = jest.spyOn(service as any, 'fetchTrafficInfo').mockResolvedValue({ hoge: 1 });
    const data = await service.getJson('traffic_info.json');
    expect(spy).toBeCalled();
    expect(data).toEqual({ hoge: 1 });
  });

  // it('dia/xxx.jsonはキャッシュがあればローカルから取得', async () => {
  //   (service as any).exists = jest.fn().mockResolvedValue(true);
  //   (fs.readFile as jest.Mock).mockResolvedValue('{"dy": []}');
  //   const data = await service.getJson('dia/1234.json');
  //   expect(data).toEqual({ dy: [] });
  // });

  it('dia/xxx.jsonでキャッシュがなければAPIから取得', async () => {
    (service as any).exists = jest.fn().mockResolvedValue(false);
    (service as any).ensureDiaDir = jest.fn();
    // axios.getのモック
    jest.spyOn(require('axios'), 'get').mockResolvedValue({ data: { dy: [1, 2] } });
    const data = await service.getJson('dia/1234.json');
    expect(data).toEqual({ dy: [1, 2] });
  });
});
