import { Request, Response, Router } from "express";
import { connection } from "../..";
import {
  IProductEntity,
  ICommentEntity,
  IProductSearchFilter,
  ProductCreatePayload,
} from "../../types";
import { mapProductsEntity, mapCommentsEntity } from "../services/mapping";
import { enhanceProductsComments } from "../services/mapping";
import { getProductsFilterQuery } from "../helpers";
import { OkPacket } from "mysql2";
import { v4 as uuidv4 } from "uuid";
import { INSERT_PRODUCT_QUERY } from "../services/queries";

export const productsRouter = Router();

const throwServerError = (res: Response, e: Error) => {
  console.debug(e.message);
  res.status(500);
  res.send("Something went wrong");
};

productsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const [productRows] = await connection.query<IProductEntity[]>(
      "SELECT * FROM products"
    );

    const [commentRows] = await connection.query<ICommentEntity[]>(
      "SELECT * FROM comments"
    );

    const products = mapProductsEntity(productRows);
    const result = enhanceProductsComments(products, commentRows);

    res.send(result);
  } catch (e) {
    throwServerError(res, e);
  }
});

productsRouter.get(
  "/search",
  async (req: Request<{}, {}, {}, IProductSearchFilter>, res: Response) => {
    try {
      const [query, values] = getProductsFilterQuery(req.query);
      const [rows] = await connection.query<IProductEntity[]>(query, values);

      if (!rows?.length) {
        res.status(404);
        res.send(`Products are not found`);
        return;
      }

      const [commentRows] = await connection.query<ICommentEntity[]>(
        "SELECT * FROM comments"
      );

      const products = mapProductsEntity(rows);
      const result = enhanceProductsComments(products, commentRows);

      res.send(result);
    } catch (e) {
      throwServerError(res, e);
    }
  }
);

productsRouter.get(
  "/:id",
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      const [rows] = await connection.query<IProductEntity[]>(
        "SELECT * FROM products WHERE product_id = ?",
        [req.params.id]
      );

      if (!rows?.[0]) {
        res.status(404);
        res.send(`Product with id ${req.params.id} is not found`);
        return;
      }

      const [comments] = await connection.query<ICommentEntity[]>(
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
  }
);

//Создадим метод для добавления товара в БД.
productsRouter.post(
  "/",
  async (req: Request<{}, {}, ProductCreatePayload>, res: Response) => {
    try {
      const { title, description, price } = req.body;
      const id = uuidv4();
      await connection.query<OkPacket>(INSERT_PRODUCT_QUERY, [
        id,
        title || null,
        description || null,
        price || null,
      ]);

      res.status(201);
      res.send(`Product id:${id} has been added!`);
    } catch (e) {
      throwServerError(res, e);
    }
  }
);

productsRouter.delete('/:id', async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
      const [info] = await connection.query < OkPacket > (
          "DELETE FROM products WHERE product_id = ?",
          [req.params.id]
      );

      if (info.affectedRows === 0) {
          res.status(404);
          res.send(`Product with id ${req.params.id} is not found`);
          return;
      }

      res.status(200);
      res.end();
  } catch (e) {
      throwServerError(res, e);
  }
});
