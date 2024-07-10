import { Request, Response, Router } from "express";
import { connection } from "../..";
import { IProductEntity, ICommentEntity } from "../../types";
import { mapProductsEntity } from "../services/mapping";
import { enhanceProductsComments } from "../services/mapping"; 

export const productsRouter = Router();

const throwServerError = (res: Response, e: Error) => {
  console.debug(e.message);
  res.status(500);
  res.send("Something went wrong");
}

productsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const [productRows] = await connection.query < IProductEntity[] > (
      "SELECT * FROM products"
  );

  const [commentRows] = await connection.query < ICommentEntity[] > (
      "SELECT * FROM comments"
  );

  const products = mapProductsEntity(productRows);
  const result = enhanceProductsComments(products, commentRows);

  res.send(result);
  } catch (e) {
      throwServerError(res, e);
  }
});