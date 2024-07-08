import { Request, Response, Router } from "express";
import { IComment, CommentCreatePayload } from "../../types";
import { readFile, writeFile } from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { checkCommentUniq, validateComment } from "../helpers";

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

commentsRouter.get('/', async (req: Request, res: Response) => {
  const comments = await loadComments();
  res.setHeader("Content-Type", "application/json");
  res.send(comments);
});

commentsRouter.get(`/:id`, async (req: Request<{ id: string }>, res: Response) => {
  const comments = await loadComments();
  const id = req.params.id;

  const targetComment = comments.find(
    (comment) => id === comment.id.toString()
  );

  if (!targetComment) {
    res.status(404);
    res.send(`Comment with id ${id} is not found`);
    return;
  }

  res.setHeader("Content-Type", "application/json");
  res.send(targetComment);
});

commentsRouter.post(
  '/',
  async (req: Request<{}, {}, CommentCreatePayload>, res: Response) => {
    const validationResult = validateComment(req.body);

    if (validationResult) {
      res.status(400);
      res.send(validationResult);
      return;
    }

    const comments = await loadComments();
    const isUniq = checkCommentUniq(req.body, comments);

    if (!isUniq) {
      res.status(422);
      res.send("Comment with the same fields already exists");
      return;
    }

    const saved = await saveComments(comments);

    if (!saved) {
      res.status(500);
      res.send("Server error. Comment has not been created");
      return;
    }

    const id = uuidv4();
    comments.push({ ...req.body, id });
    await saveComments(comments);

    res.status(201);
    res.send(`Comment id:${id} has been added!`);
  }
);

commentsRouter.patch(
  '/',
  async (req: Request<{}, {}, Partial<IComment>>, res: Response) => {
    const comments = await loadComments();

    const targetCommentIndex = comments.findIndex(
      ({ id }) => req.body.id === id
    );

    if (targetCommentIndex > -1) {
      comments[targetCommentIndex] = {
        ...comments[targetCommentIndex],
        ...req.body,
      };
      await saveComments(comments);

      res.status(200);
      res.send(comments[targetCommentIndex]);
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
    const commentToCreate = { ...newComment, id };
    comments.push(commentToCreate);
    await saveComments(comments);

    res.status(201);
    res.send(commentToCreate);
  }
);

commentsRouter.delete(
  `/:id`,
  async (req: Request<{ id: string }>, res: Response) => {
    const comments = await loadComments();
    const id = req.params.id;

    let removedComment: IComment | null = null;

    const filteredComments = comments.filter((comment) => {
      if (id === comment.id.toString()) {
        removedComment = comment;
        return false;
      }

      return true;
    });

    if (removedComment) {
      await saveComments(filteredComments);
      res.status(200);
      res.send(removedComment);
      return;
    }

    res.status(404);
    res.send(`Comment with id ${id} is not found`);
  }
);
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
