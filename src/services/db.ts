import mysql, { Connection } from "mysql2/promise";

export async function initDataBase(): Promise<Connection | null> {
    let connection: Connection | null = null;
  
    try {
        connection = await mysql.createConnection({
            host: "localhost",
            port: 3306,
            password: "SyncMaster943nw",
            user: "manager",
            database: "ProductsApplication",
        });
    } catch (e) {
        console.error(e.message || e);
        return null;
    }
  
    console.log(`Connection to DB ProductsApplication established`);
    return connection;
}