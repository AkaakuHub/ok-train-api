import { Module } from "@nestjs/common";
import { StationsController } from "./stations.controller";
import { StationsService } from "./stations.service";
import { AssetsModule } from "src/assets/assets.module";

@Module({
  imports: [AssetsModule],
  controllers: [StationsController],
  providers: [StationsService],
  exports: [StationsService],
})
export class StationsModule {}
