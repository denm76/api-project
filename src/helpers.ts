import { IComment, CommentCreatePayload } from "../types";

const compareValues = (target: string, compare: string): boolean => {
  return target.toLowerCase() === compare.toLowerCase();
}

export const checkCommentUniq = (payload: CommentCreatePayload, comments: IComment[]): boolean => {
  const byEmail = comments.find(({ email }) => compareValues(payload.email, email));

  if (!byEmail) {
      return true;
  }

  const { body, name, productId } = byEmail;
  return !(
      compareValues(payload.body, body) &&
      compareValues(payload.name, name) &&
      compareValues(payload.productId.toString(), productId.toString())
  );
}


type CommentValidator = (comment: CommentCreatePayload) => string | null;

/**
 * решение задания 34.5.2 – реализовать функцию validateComment
 */
export const validateComment: CommentValidator = (comment) => {
  if (!comment || !Object.keys(comment).length) {
    return "Comment is absent or empty";
  }

  const requiredFields = new Set<keyof CommentCreatePayload>([
    "name",
    "email",
    "body",
    "productId"
  ]);

  let wrongFieldName;

  requiredFields.forEach((fieldName) => {
    if (!comment[fieldName]) {
      wrongFieldName = fieldName;
      return;
    }
  });

  if (wrongFieldName) {
    return `Field '${wrongFieldName}' is absent`;
  }

  return null;
}