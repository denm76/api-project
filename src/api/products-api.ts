import { Request, Response, Router } from "express";
import { connection } from "../..";
import {
  IProductEntity,
  ICommentEntity,
  IProductSearchFilter,
  ProductCreatePayload,
  IProductImageEntity,
} from "../../types";
import { mapProductsEntity, mapCommentsEntity, mapImagesEntity } from "../services/mapping";
import {
  getProductsFilterQuery,
  enhanceProductsComments,
  enhanceProductsImages,
} from "../helpers";
import { OkPacket } from "mysql2";
import { v4 as uuidv4 } from "uuid";
import { INSERT_PRODUCT_QUERY, INSERT_PRODUCT_IMAGES_QUERY, DELETE_IMAGES_QUERY } from "../services/queries";

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

    const [imageRows] = await connection.query<IProductImageEntity[]>(
      "SELECT * FROM images"
    );

    const products = mapProductsEntity(productRows);
    const withComments = enhanceProductsComments(products, commentRows);
    const withImages = enhanceProductsImages(withComments, imageRows);

    res.send(withImages);
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
        res.send([]);
        return;
      }

      const [commentRows] = await connection.query<ICommentEntity[]>(
        "SELECT * FROM comments"
      );
      const [imageRows] = await connection.query<IProductImageEntity[]>(
        "SELECT * FROM images"
      );

      const products = mapProductsEntity(rows);
      const withComments = enhanceProductsComments(products, commentRows);
      const withImages = enhanceProductsImages(withComments, imageRows);

      res.send(withImages);
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

      const [images] = await connection.query<IProductImageEntity[]>(
        "SELECT * FROM images WHERE product_id = ?",
        [req.params.id]
      );

      const product = mapProductsEntity(rows)[0];

      if (comments.length) {
        product.comments = mapCommentsEntity(comments);
      }

      if (images.length) {
        product.images = mapImagesEntity(images);
        product.thumbnail = product.images.find(image => image.main) || product.images[0];
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
      const { title, description, price, images } = req.body;
      const productId = uuidv4();
      await connection.query<OkPacket>(INSERT_PRODUCT_QUERY, [
        productId,
        title || null,
        description || null,
        price || null,
      ]);

      if (images) {
        const values = images.map((image) => [uuidv4(), image.url, productId, image.main]);
        await connection.query<OkPacket>(INSERT_PRODUCT_IMAGES_QUERY, [values]);
      }

      res.status(201);
      res.send(`Product id:${productId} has been added!`);
    } catch (e) {
      throwServerError(res, e);
    }
  }
);

//удаление товара с удалением всех изображений и комментариев
productsRouter.delete(
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
  
      await connection.query<OkPacket>(
        "DELETE FROM images WHERE product_id = ?",
        [req.params.id]
      );
  
      await connection.query<OkPacket>(
        "DELETE FROM comments WHERE product_id = ?",
        [req.params.id]
      );
  
      await connection.query<OkPacket>(
        "DELETE FROM products WHERE product_id = ?",
        [req.params.id]
      );
  
      res.status(200);
      res.end();
    } catch (e) {
      throwServerError(res, e);
    }
  }
);
