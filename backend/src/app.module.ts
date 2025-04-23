import { Module } from "@nestjs/common";
import { TrainsModule } from "./trains/trains.module";
import { StationsModule } from "./stations/stations.module";

@Module({
  imports: [TrainsModule, StationsModule],
})
export class AppModule {}
