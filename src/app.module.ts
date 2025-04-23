import { Module } from "@nestjs/common";
import { TrainsModule } from "./trains/trains.module";
import { StationsModule } from "./stations/stations.module";
import { AssetsService } from "./assets/assets.service";
import { AssetsController } from "./assets/assets.controller";

@Module({
  imports: [TrainsModule, StationsModule],
  providers: [AssetsService],
  exports: [AssetsService],
  controllers: [AssetsController],
})
export class AppModule {}
