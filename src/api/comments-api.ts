import { Request, Response, Router } from "express";
import { IComment, ICommentEntity, CommentCreatePayload } from "../../types";
import { readFile, writeFile } from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { checkCommentUniq, validateComment } from "../helpers";
import { connection } from "../..";
import { mapCommentsEntity } from "../services/mapping";
import { OkPacket } from "mysql2";
import {
  COMMENT_DUPLICATE_QUERY,
  INSERT_COMMENT_QUERY,
} from "../services/queries";

const loadComments = async (): Promise<IComment[]> => {
  const rawData = await readFile("mock-comments.json", "binary");
  return JSON.parse(rawData.toString());
};

const saveComments = async (data: IComment[]): Promise<boolean> => {
  try {
    await writeFile("mock-comments.json", JSON.stringify(data));
    return true; //TODO: имитация возникновения ошибки
  } catch (e) {
    return false;
  }
};

export const commentsRouter = Router();

commentsRouter.get("/", async (req: Request, res: Response) => {
  try {
    if (connection) {
      const [comments] = await connection.query<ICommentEntity[]>(
        "SELECT * FROM comments"
      );
      res.setHeader("Content-Type", "application/json");
      res.send(mapCommentsEntity(comments));
    }
  } catch (e) {
    console.log(e.message);
    res.status(500);
    res.send("Something went wrong");
  }
});

/**
 * решение задания 34.8.1 – метод GET by id
 */
commentsRouter.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const [rows] = await connection.query<ICommentEntity[]>(
      "SELECT * FROM comments WHERE comment_id = ?",
      [req.params.id]
    );

    if (!rows?.[0]) {
      res.status(404);
      res.send(`Comment with id ${req.params.id} is not found`);
      return;
    }

    res.setHeader('Content-Type', 'application/json');
    res.send(mapCommentsEntity(rows)[0]);
  } catch (e) {
    console.debug(e.message);
    res.status(500);
    res.send("Something went wrong");
  }
});

commentsRouter.post(
  "/",
  async (req: Request<{}, {}, CommentCreatePayload>, res: Response) => {
    const validationResult = validateComment(req.body);

    if (validationResult) {
      res.status(400);
      res.send(validationResult);
      return;
    }

    try {
      const { name, email, body, productId } = req.body;

      if (connection) {
        const [sameResult] = await connection.query<ICommentEntity[]>(
          COMMENT_DUPLICATE_QUERY,
          [
            email.toLowerCase(),
            name.toLowerCase(),
            body.toLowerCase(),
            productId,
          ]
        );

        if (sameResult.length) {
          res.status(422);
          res.send("Comment with the same fields already exists");
          return;
        }
      }

      const id = uuidv4();
      if (connection) {
        await connection.query<OkPacket>(INSERT_COMMENT_QUERY, [
          id,
          email,
          name,
          body,
          productId,
        ]);
      }

      res.status(201);
      res.send(`Comment id:${id} has been added!`);
    } catch (e) {
      console.debug(e.message);
      res.status(500);
      res.send("Server error. Comment has not been created");
    }
  }
);

commentsRouter.patch('/', async (
  req: Request<{}, {}, Partial<IComment>>,
  res: Response
) => {
  try {
      let updateQuery = "UPDATE comments SET ";

      const valuesToUpdate = [];
      ["name", "body", "email"].forEach(fieldName => {
          if (req.body.hasOwnProperty(fieldName)) {
              if (valuesToUpdate.length) {
                  updateQuery += ", ";
              }

              updateQuery += `${fieldName} = ?`;
              valuesToUpdate.push(req.body[fieldName]);
          }
      });

      updateQuery += " WHERE comment_id = ?";
      valuesToUpdate.push(req.body.id);

      const [info] = await connection.query < OkPacket > (updateQuery, valuesToUpdate);

      if (info.affectedRows === 1) {
          res.status(200);
          res.end();
          return;
      }

      const newComment = req.body as CommentCreatePayload;
      const validationResult = validateComment(newComment);

      if (validationResult) {
          res.status(400);
          res.send(validationResult);
          return;
      }

      const id = uuidv4();
      await connection.query < OkPacket > (
          INSERT_COMMENT_QUERY,
          [id, newComment.email, newComment.name, newComment.body, newComment.productId]
      );

      res.status(201);
      res.send({ ...newComment, id })
  } catch (e) {
      console.log(e.message);
      res.status(500);
      res.send("Server error");
  }
});

/**
 * решение задания 34.8.1 – метод DELETE by id
 */
commentsRouter.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const [info] = await connection.query<OkPacket>(
      "DELETE FROM comments WHERE comment_id = ?",
      [req.params.id]
    );

    if (info.affectedRows === 0) {
      res.status(404);
      res.send(`Comment with id ${req.params.id} is not found`);
      return;
    }

    res.status(200);
    res.end();
  } catch (e) {
    console.log(e.message);
    res.status(500);
    res.send("Server error. Comment has not been deleted");
  }
});
// const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
//     if (req.url === '/api/comments' && req.method === 'GET') {
//         const comments = await loadComments();

//         res.setHeader('Content-Type', 'application/json');
//         res.write(JSON.stringify(comments));
//         res.end();
//     } else if (req.url === '/api/comments' && req.method === 'POST') {
//         let rawBody = '';
//         req.on('data', (chunk) => {
//             rawBody += chunk.toString();
//         });

//         req.on('end', () => {
//             const result = JSON.parse(rawBody || null);

//             const item = result[0];

//             item.status = "sold";
//             res.setHeader('Content-Type', 'application/json');
//             res.end(JSON.stringify(item))
//         });
//     } else {
//         res.statusCode = 404;
//         res.end('Not found');
//     }
// });

// const PORT = 3000;

// commentsRouter.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

// https://apps.skillfactory.ru/learning/course/course-v1:Skillfactory+FR+2020/block-v1:Skillfactory+FR+2020+type@sequential+block@49321b1d8ce14f7ba967e1149a2153ed/block-v1:Skillfactory+FR+2020+type@vertical+block@e743086bdffb455c9419d41bfba09ded
