import { Request, Response, Router } from "express";
import { connection } from "../..";
import { IProductEntity, ICommentEntity, IProductSearchFilter } from "../../types";
import { mapProductsEntity, mapCommentsEntity } from "../services/mapping";
import { enhanceProductsComments } from "../services/mapping"; 
import { getProductsFilterQuery } from "../helpers";

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

productsRouter.get('/search', async (
  req: Request<{}, {}, {}, IProductSearchFilter>,
  res: Response
) => {
  try {
      const [query, values] = getProductsFilterQuery(req.query);
      const [rows] = await connection.query < IProductEntity[] > (query, values);

      if (!rows?.length) {
          res.status(404);
          res.send(`Products are not found`);
          return;
      }

      const [commentRows] = await connection.query < ICommentEntity[] > (
          "SELECT * FROM comments"
      );

      const products = mapProductsEntity(rows);
      const result = enhanceProductsComments(products, commentRows);

      res.send(result);
  } catch (e) {
      throwServerError(res, e);
  }
});   

productsRouter.get('/:id', async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
      const [rows] = await connection.query < IProductEntity[] > (
          "SELECT * FROM products WHERE product_id = ?",
          [req.params.id]
      );

      if (!rows?.[0]) {
          res.status(404);
          res.send(`Product with id ${req.params.id} is not found`);
          return;
      }

      const [comments] = await connection.query < ICommentEntity[] > (
          "SELECT * FROM comments WHERE product_id = ?",
          [req.params.id]
      );

      const product = mapProductsEntity(rows)[0];

      if (comments.length) {
          product.comments = mapCommentsEntity(comments);
      }

      res.send(product);
  } catch (e) {
      throwServerError(res, e);
  }
});