import { RowDataPacket } from "mysql2/index";

export interface IComment {
  id: string;
  name: string;
  email: string;
  body: string;
  productId: string;
}

export interface ICommentEntity extends RowDataPacket {
  comment_id: string;
  name: string;
  email: string;
  body: string;
  product_id: string;
}

export type CommentCreatePayload = Omit<IComment, "id">;

export interface IProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  comments?: IComment[];
}

export interface IProductEntity extends IProduct, RowDataPacket {
  product_id: string;
}
