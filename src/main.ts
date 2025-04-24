import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import * as path from "path";
import { writeFileSync } from "fs";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ValidationPipeを設定
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    })
  );

  // CORSを有効化
  app.enableCors();

  // Swagger設定
  const config = new DocumentBuilder()
    .setTitle("京王電鉄リアルタイム運行情報API(非公式)")
    .setDescription("京王電鉄の列車位置情報をリアルタイムで提供するAPI(非公式)")
    .setVersion("1.0")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api-docs", app, document);

  const outputPath = path.resolve(process.cwd(), "swagger.json");
  writeFileSync(outputPath, JSON.stringify(document, null, 2), "utf-8");

  await app.listen(3000);
  console.log(`アプリケーションが起動しました: http://localhost:3000/api-docs`);
}
bootstrap();
