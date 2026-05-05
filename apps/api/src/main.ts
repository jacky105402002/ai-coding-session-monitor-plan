import "reflect-metadata";

import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import express from "express";
import type { Request, Response } from "express";
import { join } from "node:path";

import { AppModule } from "./app.module.js";

const app = await NestFactory.create(AppModule);

app.setGlobalPrefix("api");
app.enableCors();
app.useGlobalPipes(
  new ValidationPipe({
    transform: true,
    whitelist: false
  })
);

const swaggerConfig = new DocumentBuilder()
  .setTitle("AI Coding Session Monitor API")
  .setDescription("API-first service for monitoring local AI coding sessions.")
  .setVersion("0.1.0")
  .addBearerAuth()
  .build();
const document = SwaggerModule.createDocument(app, swaggerConfig);
SwaggerModule.setup("api/docs", app, document);

const webDistPath = join(process.cwd(), "apps", "web", "dist");
const webIndexPath = join(webDistPath, "index.html");
const expressApp = app.getHttpAdapter().getInstance();
expressApp.use(express.static(webDistPath));
expressApp.get(["/", "/login", "/admin"], (_request: Request, response: Response) => {
  response.sendFile(webIndexPath);
});

const port = Number(process.env.PORT || process.env.WEB_PORT || 3000);
await app.listen(port, "0.0.0.0");
console.log(`AI Coding Session Monitor API listening on ${port}`);
