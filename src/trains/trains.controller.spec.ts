import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TrainsController } from './trains.controller';
import { TrainsService } from './trains.service';

describe('TrainsController', () => {
  let controller: TrainsController;
  let service: TrainsService;

  // サンプルデータ
  const mockTrafficInfo = { up: [], TS: [], TB: [] };
  const mockStationResult = { stationId: 'E001', trains: [{ trainNumber: '0715' }] };
  const mockArrivalsResult = { stationId: 'E001', arrivingTrains: [{ trainNumber: '0715' }] };
  const mockTrainDetail = { trainId: '0715', stops: [] };

  const mockTrainsService = {
    getTrafficInfo: jest.fn(() => mockTrafficInfo),
    getTrainsForStation: jest.fn((idOrName: string) => {
      if (idOrName === 'E999') throw new NotFoundException();
      return mockStationResult;
    }),
    getTrainArrivals: jest.fn((stationIdOrName: string) => {
      if (stationIdOrName === 'E999') throw new NotFoundException();
      return mockArrivalsResult;
    }),
    getTrainDetail: jest.fn((trainId: string) => {
      if (trainId === '9999') throw new NotFoundException();
      return mockTrainDetail;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrainsController],
      providers: [
        { provide: TrainsService, useValue: mockTrainsService },
      ],
    }).compile();
    controller = module.get<TrainsController>(TrainsController);
    service = module.get<TrainsService>(TrainsService);
  });

  it('GET /api/trains で運行情報を返す', async () => {
    expect(await controller.getTrafficInfo()).toEqual(mockTrafficInfo);
  });

  it('GET /api/trains/station/:idOrName で駅の列車情報を返す', async () => {
    expect(await controller.getTrainsForStation('E001')).toEqual(mockStationResult);
  });

  it('GET /api/trains/station/:idOrName で存在しない駅はNotFoundException', async () => {
    await expect(controller.getTrainsForStation('E999')).rejects.toThrow(NotFoundException);
  });

  it('GET /api/trains/arrivals/:stationIdOrName で到着予定列車を返す', async () => {
    expect(await controller.getTrainArrivals('E001')).toEqual(mockArrivalsResult);
  });

  it('GET /api/trains/arrivals/:stationIdOrName で存在しない駅はNotFoundException', async () => {
    await expect(controller.getTrainArrivals('E999')).rejects.toThrow(NotFoundException);
  });

  it('GET /api/trains/detail/:trainId で列車詳細を返す', async () => {
    expect(await controller.getTrainDetail('0715')).toEqual(mockTrainDetail);
  });

  it('GET /api/trains/detail/:trainId で存在しない列車はNotFoundException', async () => {
    await expect(controller.getTrainDetail('9999')).rejects.toThrow(NotFoundException);
  });
});
