import { Module } from "@nestjs/common";
import { TrainsController } from "./trains.controller";
import { TrainsService } from "./trains.service";
import { AssetsModule } from "src/assets/assets.module";

@Module({
  imports: [AssetsModule],
  controllers: [TrainsController],
  providers: [TrainsService],
  exports: [TrainsService],
})
export class TrainsModule {}
