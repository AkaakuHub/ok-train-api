import { Controller, Get, Param, Res, HttpException, HttpStatus } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { Response } from 'express';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get(':filename')
  async getAssetJson(@Param('filename') filename: string, @Res() res: Response) {
    try {
      const data = await this.assetsService.getJson(filename);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.send(data);
    } catch (e) {
      throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
    }
  }
}
