import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { StationsController } from './stations.controller';
import { StationsService } from './stations.service';
import { AssetsService } from "../assets/assets.service";

describe('StationsController', () => {
  let controller: StationsController;
  let service: StationsService;

  // サンプル駅データ
  const mockPositions = [
    { ID: 'E001', name: '新宿', kind: '駅' },
    { ID: 'E002', name: '笹塚', kind: '駅' },
    { ID: 'U001', name: '新宿～笹塚', kind: '駅間' },
  ];

  const mockStationsService = {
    getAllStations: jest.fn(() => mockPositions.filter(p => p.kind === '駅')),
    getAllSections: jest.fn(() => mockPositions.filter(p => p.kind === '駅間')),
    getStationById: jest.fn((id: string) => {
      const found = mockPositions.find(p => p.ID === id);
      if (!found) throw new NotFoundException();
      return found;
    }),
    getStationByName: jest.fn((name: string) => {
      const found = mockPositions.find(p => p.name === name);
      if (!found) throw new NotFoundException();
      return found;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StationsController],
      providers: [
        { provide: StationsService, useValue: mockStationsService },
      ],
    }).compile();
    controller = module.get<StationsController>(StationsController);
    service = module.get<StationsService>(StationsService);
  });

  it('GET /api/stations ですべての駅情報を返す', () => {
    expect(controller.getAllStations()).toEqual([
      { ID: 'E001', name: '新宿', kind: '駅' },
      { ID: 'E002', name: '笹塚', kind: '駅' },
    ]);
  });

  it('GET /api/stations/sections ですべての駅間情報を返す', () => {
    expect(controller.getAllSections()).toEqual([
      { ID: 'U001', name: '新宿～笹塚', kind: '駅間' },
    ]);
  });

  it('GET /api/stations/id/:id で駅IDから駅情報を返す', () => {
    expect(controller.getStationById('E001')).toEqual({ ID: 'E001', name: '新宿', kind: '駅' });
  });

  it('GET /api/stations/id/:id で存在しないIDはNotFoundException', () => {
    expect(() => controller.getStationById('E999')).toThrow(NotFoundException);
  });

  it('GET /api/stations/name/:name で駅名から駅情報を返す', () => {
    expect(controller.getStationByName('新宿')).toEqual({ ID: 'E001', name: '新宿', kind: '駅' });
  });

  it('GET /api/stations/name/:name で存在しない駅名はNotFoundException', () => {
    expect(() => controller.getStationByName('不存在')).toThrow(NotFoundException);
  });
});
