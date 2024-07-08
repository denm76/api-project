import { initDataBase } from "./src/services/db";
import { Express } from "express";
import { Connection } from "mysql2/promise";
import { initServer } from "./src/services/server";

export let server: Express;
export let connection: Connection | null;

async function launchApplication() {
  server = initServer();
  connection = await initDataBase();
}

launchApplication();
