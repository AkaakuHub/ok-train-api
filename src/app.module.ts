import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TrainsModule } from "./trains/trains.module";
import { StationsModule } from "./stations/stations.module";
import { AssetsService } from "./assets/assets.service";
import { AssetsController } from "./assets/assets.controller";

const ENV = process.env.NODE_ENV;

@Module({
  imports: [
    TrainsModule,
    StationsModule,
    ConfigModule.forRoot({
      envFilePath: !ENV ? ".env" : `.env.${ENV}`,
    }),
  ],
  providers: [AssetsService],
  exports: [AssetsService],
  controllers: [AssetsController],
})
export class AppModule {}
